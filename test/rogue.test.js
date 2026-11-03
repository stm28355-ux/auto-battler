import test from 'node:test';
import assert from 'node:assert/strict';
import { LATEST, applyEnvironment } from '../src/data/environment.js';
import { useBalance } from '../src/data/balance.js';
import { createCatalog } from '../src/core/catalog.js';
import { pieceCost } from '../src/core/cost.js';
import { validateTeam } from '../src/core/team.js';
import { createRng } from '../src/engine/rng.js';
import { autoTeam } from '../src/rogue/auto.js';
import { DEFAULT_PIECES, floorKind, INITIAL_POINTS, OFFER } from '../src/rogue/config.js';
import { createEnemy, enemyRelicStacks } from '../src/rogue/enemies.js';
import { allocCost, changeAlloc, defaultMeta, normalizeMeta } from '../src/rogue/meta.js';
import { isRare, pieceOffer, relicOffer } from '../src/rogue/offers.js';
import {
  addBonus, battleTeam, continueRun, createRogueStore, enemyRules, finishRun, giveUp, loseFloor, normalizeRun,
  reroll, runRules, shortcutFloors, startRun, takeReward, winFloor,
} from '../src/rogue/run.js';
import { memoryStorage } from '../src/storage/local.js';

// ローグライトは最新の環境で遊ぶ（spec §15）
applyEnvironment(LATEST.id);
useBalance();
const catalog = createCatalog();
const T = (board, cells, relics = []) => ({ name: 't', board, slots: Object.entries(cells).map(([k, pieceId]) => ({ pos: k.split(',').map(Number), pieceId })), relics });
const count = (list) => list.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());

test('ルール：コスト上限なし・駒は持っている数まで・遺物は重ねていくつでも', () => {
  const rules = { costCap: () => Infinity, pieceCounts: new Map([['c_general', 2], ['c_squire', 1]]), maxRelics: Infinity, duplicateRelics: true };
  const heavy = T('square', { '1,1': 'c_general', '2,1': 'c_general', '3,1': 'c_squire' }, ['r_amulet', 'r_amulet', 'r_amulet', 'r_heart']);
  assert.deepEqual(validateTeam(heavy, catalog, rules), []);
  assert.match(validateTeam(T('square', { '1,1': 'c_squire', '2,1': 'c_squire' }), catalog, rules).join(), /持っている数より多く置いています（見習い剣士 2 \/ 1）/);
  assert.match(validateTeam(T('square', { '1,1': 'c_lion' }), catalog, rules).join(), /持っていない駒です（獅子）/);
  // ふつうのルールでは、重ねた遺物・4つ以上は使えない
  assert.match(validateTeam(heavy, catalog).join(), /遺物は3つまで/);
  assert.match(validateTeam(T('square', { '1,1': 'c_squire' }, ['r_amulet', 'r_amulet']), catalog).join(), /重複/);
});

test('層の種類：一の位が0ならボス、5なら強敵', () => {
  assert.deepEqual([1, 4, 5, 9, 10, 15, 30, 95, 100].map(floorKind), ['normal', 'normal', 'strong', 'normal', 'boss', 'strong', 'boss', 'strong', 'boss']);
});

test('報酬：駒2個のセットが3つ。レアはキャラがコスト4以上・道具が3以上。普通は安い駒ほど出やすい', () => {
  const rng = createRng(1);
  const pieces = catalog.pieces();
  for (let i = 0; i < 50; i++) {
    const rare = pieceOffer(pieces, rng, { rare: true });
    assert.equal(rare.length, 3);
    for (const set of rare) {
      assert.equal(set.length, 2);
      for (const id of set) assert.ok(isRare(catalog.piece(id)), id);
    }
  }
  assert.ok(pieces.some((p) => p.kind === 'item' && pieceCost(p) === 3 && isRare(p)), '3コストの道具はレア');
  const drawn = Array.from({ length: 300 }, () => pieceOffer(pieces, rng)).flat(2).map((id) => catalog.piece(id));
  const items = drawn.filter((p) => p.kind === 'item').length / drawn.length;
  assert.ok(items > 0.22 && items < 0.38, `道具の割合 ${items}`);
  const cheap = drawn.filter((p) => pieceCost(p) <= 3).length;
  const dear = drawn.filter((p) => pieceCost(p) >= 9).length;
  assert.ok(cheap > dear * 5, `${cheap} / ${dear}`);
});

test('報酬：遺物は均等。解毒の聖水を5個持っていたら出ない', () => {
  const rng = createRng(2);
  const relics = catalog.relics();
  const sets = relicOffer(relics, {}, rng, 2);
  assert.equal(sets.length, 3);
  for (const s of sets) assert.equal(new Set(s).size, 2);
  const drawn = Array.from({ length: 200 }, () => relicOffer(relics, { [OFFER.antidoteId]: 5 }, rng)).flat(2);
  assert.ok(!drawn.includes(OFFER.antidoteId));
  assert.ok(Array.from({ length: 200 }, () => relicOffer(relics, { [OFFER.antidoteId]: 4 }, rng)).flat(2).includes(OFFER.antidoteId));
});

test('敵：遺物の重ね数（普通 = 十の位、強敵 = 十の位+1、ボス = 層÷10）。同じシード・層なら同じ敵', () => {
  assert.deepEqual([7, 17, 5, 95, 10, 100].map((f) => enemyRelicStacks(f)), [0, 1, 1, 10, 1, 10]);
  const ctx = { pieces: catalog.pieces(), relics: catalog.relics() };
  const n7 = createEnemy(7, createRng(3), ctx);
  assert.deepEqual(n7.relics, []);
  const n17 = createEnemy(17, createRng(3), ctx);
  assert.equal(n17.relics.length, 1);
  const s25 = count(createEnemy(25, createRng(3), ctx).relics);
  assert.equal(s25.size, 3);
  assert.ok([...s25.values()].every((n) => n === 3));
  const boss = createEnemy(100, createRng(3), ctx);
  assert.equal(boss.relics.length, catalog.relics().length * 10);
  for (const f of [1, 5, 10, 33, 60, 99, 100]) {
    const e = createEnemy(f, createRng(f), ctx);
    assert.deepEqual(validateTeam(e, catalog, enemyRules), [], `${f}層`);
    assert.deepEqual(createEnemy(f, createRng(f), ctx), e);
  }
});

test('引継ぎ：初めは10ポイントで、最初の駒に割り振ってある。値段と上限', () => {
  const meta = defaultMeta();
  assert.equal(meta.points, INITIAL_POINTS);
  assert.equal(allocCost(meta.alloc, catalog), INITIAL_POINTS);
  const rich = { ...meta, points: 100 };
  const step = (m, what, d = 1) => changeAlloc(m, what, d, catalog);
  assert.equal(allocCost(step(rich, 'life').alloc, catalog), 12);
  assert.equal(allocCost(step(rich, 'reroll').alloc, catalog), 12);
  assert.equal(allocCost(step(rich, ['relics', 'r_amulet']).alloc, catalog), 12);
  assert.equal(allocCost(step(rich, ['pieces', 'c_elf']).alloc, catalog), 11); // コスト3以下は1
  assert.equal(allocCost(step(rich, ['pieces', 'c_lion']).alloc, catalog), 12); // 4〜8は2
  assert.equal(allocCost(step(rich, ['pieces', 'c_general']).alloc, catalog), 13); // 9以上は3
  assert.equal(allocCost(step(rich, ['perks', 'shortcut']).alloc, catalog), 15);
  assert.equal(allocCost(step(rich, ['perks', 'bossHeal']).alloc, catalog), 13);
  assert.equal(allocCost(step(rich, ['perks', 'strongRare']).alloc, catalog), 13);
  assert.equal(step(meta, 'life'), null, 'ポイント不足');
  assert.equal(step(rich, 'life', -1), null, '下限');
  let m = rich;
  for (let i = 0; i < 7; i++) m = step(m, 'life');
  assert.equal(step(m, 'life'), null, 'ライフは10まで');
  let p = rich;
  for (let i = 0; i < 3; i++) p = step(p, ['pieces', 'c_lion']);
  assert.equal(step(p, ['pieces', 'c_lion']), null, '駒は3まで');
  // 割り振りを外せば、そのポイントは別に使える
  const freed = step(meta, ['pieces', 'c_knight'], -1);
  assert.ok(step(freed, 'life'));
});

test('引継ぎの保存：壊れた値・知らないIDを捨て、ポイントを超える割り振りは初期に戻す', () => {
  assert.deepEqual(normalizeMeta(null, catalog), defaultMeta());
  const m = normalizeMeta({ points: 30, alloc: { reroll: 99, life: -1, relics: { r_amulet: 2, nope: 3 }, pieces: { c_squire: 1.5, c_lion: 2 }, perks: { bossHeal: true, x: true } } }, catalog);
  assert.deepEqual(m.alloc, { reroll: 5, life: 0, relics: { r_amulet: 2 }, pieces: { c_lion: 2 }, perks: { bossHeal: true } });
  const over = normalizeMeta({ points: 10, alloc: { reroll: 5, life: 7 } }, catalog);
  assert.deepEqual(over.alloc, defaultMeta().alloc);
});

const fresh = (alloc = {}, seed = 7) => startRun({ ...defaultMeta(), alloc: { ...defaultMeta().alloc, ...alloc } }, { board: 'square', seed }, catalog);

test('挑戦：持ち込みの駒でおまかせのチームを組んで1層から。勝つと報酬、受け取ると次の層', () => {
  const run = fresh({ reroll: 2, life: 1, relics: { r_amulet: 2 } });
  assert.equal(run.floor, 1);
  assert.equal(run.life, 4);
  assert.equal(run.rerolls, 2);
  assert.deepEqual(run.pieces, DEFAULT_PIECES);
  assert.deepEqual(validateTeam(run.team, catalog, runRules(run)), []);
  assert.deepEqual(battleTeam(run).relics, ['r_amulet', 'r_amulet']);
  winFloor(run, catalog);
  assert.equal(run.phase, 'reward');
  assert.equal(run.offer.relics, null, '普通の層は駒だけ');
  const set = run.offer.pieces[1];
  assert.ok(takeReward(run, { pieces: 1 }, catalog));
  assert.equal(run.floor, 2);
  assert.equal(run.phase, 'floor');
  for (const id of set) assert.ok(run.pieces[id] >= 1);
});

test('挑戦：リロールは回数を使い、一の位が1の層で戻る。強敵・ボスは遺物も選ぶ', () => {
  const run = fresh({ reroll: 1 });
  for (let f = 1; f < 5; f++) {
    winFloor(run, catalog);
    takeReward(run, { pieces: 0 }, catalog);
  }
  winFloor(run, catalog);
  assert.equal(run.offer.relics.length, 3);
  assert.equal(run.offer.relics[0].length, 1, '強敵は遺物1個');
  assert.equal(takeReward(run, { pieces: 0 }, catalog), false, '遺物も選ぶ');
  assert.ok(reroll(run, 'relics', catalog));
  assert.equal(run.rerolls, 0);
  assert.equal(reroll(run, 'pieces', catalog), false);
  takeReward(run, { pieces: 0, relics: 2 }, catalog);
  for (let f = 6; f < 10; f++) {
    winFloor(run, catalog);
    takeReward(run, { pieces: 0 }, catalog);
  }
  winFloor(run, catalog);
  assert.equal(run.offer.relics[0].length, 2, 'ボスは遺物2個');
  for (const id of run.offer.pieces.flat()) assert.ok(isRare(catalog.piece(id)), 'ボスはレア駒');
  takeReward(run, { pieces: 0, relics: 0 }, catalog);
  assert.equal(run.floor, 11);
  assert.equal(run.rerolls, 1, '11層でリロールが戻る');
});

test('挑戦：負けるとライフが減り、0でゲームオーバー。ポイントは層÷5', () => {
  const run = fresh();
  run.floor = 23;
  loseFloor(run);
  loseFloor(run);
  assert.equal(run.phase, 'floor');
  loseFloor(run);
  assert.equal(run.phase, 'over');
  const { meta, points } = finishRun(defaultMeta(), run);
  assert.equal(points, 4);
  assert.equal(meta.points, INITIAL_POINTS + 4);
  assert.equal(meta.best, 23);
  const quit = fresh();
  quit.floor = 9;
  giveUp(quit);
  assert.equal(finishRun(defaultMeta(), quit).points, 1);
});

test('挑戦：30層クリアでボーナス5と一時リザルト、100層クリアで20+10ポイント', () => {
  const run = fresh({ perks: { bossHeal: true } });
  run.floor = 30;
  run.life = 1;
  const { bonus } = winFloor(run, catalog);
  assert.equal(bonus, 5);
  assert.equal(run.life, 2, 'ボス勝利でライフ回復');
  const meta = addBonus(defaultMeta(), run, bonus);
  assert.equal(meta.points, INITIAL_POINTS + 5);
  assert.equal(meta.clears.front, 1);
  takeReward(run, { pieces: 0, relics: 0 }, catalog);
  assert.equal(run.phase, 'front');
  continueRun(run);
  assert.equal(run.phase, 'floor');
  assert.equal(run.floor, 31);
  run.floor = 100;
  assert.equal(winFloor(run, catalog).bonus, 10);
  assert.equal(run.phase, 'final');
  const end = finishRun(defaultMeta(), run);
  assert.equal(end.points, 20);
  assert.equal(end.meta.clears.top, 1);
});

test('ショートカット：到達したことのある11・21…層から。飛ばした層の報酬は自動で受け取る', () => {
  const meta = { ...defaultMeta(), best: 25, alloc: { ...defaultMeta().alloc, perks: { shortcut: true } } };
  assert.deepEqual(shortcutFloors(meta), [11, 21]);
  assert.deepEqual(shortcutFloors({ ...meta, alloc: defaultMeta().alloc }), []);
  const run = startRun(meta, { board: 'honeycomb', startFloor: 21, seed: 4 }, catalog);
  assert.equal(run.floor, 21);
  const pieces = Object.values(run.pieces).reduce((s, n) => s + n, 0);
  const own = Object.values(DEFAULT_PIECES).reduce((s, n) => s + n, 0);
  assert.equal(pieces, own + 20 * 2);
  assert.equal(Object.values(run.relics).reduce((s, n) => s + n, 0), 2 * 1 + 2 * 2, '強敵2回・ボス2回');
});

test('保存：読み直せる。壊れたデータは捨てる。結果が出る前に閉じた対戦は pending に残る', () => {
  const storage = memoryStorage();
  const store = createRogueStore(storage, catalog);
  assert.equal(store.loadRun(), null);
  const run = fresh();
  winFloor(run, catalog);
  run.pending = { seed: 5, team: battleTeam(run) };
  store.saveRun(run);
  assert.deepEqual(store.loadRun(), run);
  store.saveRun({ ...run, floor: 0 });
  assert.equal(store.loadRun(), null);
  store.saveRun({ ...run, pieces: { nope: 1 } });
  assert.equal(store.loadRun(), null);
  store.saveRun(null);
  assert.equal(storage.getItem('auto-battler.rogue.run.v1'), null);
  store.saveMeta({ ...defaultMeta(), points: 30, best: 12 });
  assert.equal(store.loadMeta().best, 12);
});

test('おまかせ：持っている数までで、マスの数まで置く', () => {
  const team = autoTeam('honeycomb', { c_squire: 5, c_lion: 3, i_sword: 4 }, catalog);
  assert.equal(team.slots.length, 7);
  const used = count(team.slots.map((s) => s.pieceId));
  assert.equal(used.get('c_lion'), 3);
  assert.ok((used.get('i_sword') ?? 0) <= 2);
  assert.deepEqual(validateTeam(team, catalog, { costCap: () => Infinity, pieceCounts: new Map(Object.entries({ c_squire: 5, c_lion: 3, i_sword: 4 })) }), []);
});
