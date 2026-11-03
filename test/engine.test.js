import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_TEAMS } from '../src/data/presetTeams.js';
import { createCatalog } from '../src/core/catalog.js';
import { createBattle, runBattle } from '../src/engine/battle.js';
import { resolveTeam } from '../src/engine/resolve.js';
import { createRng } from '../src/engine/rng.js';
import { BALANCE, NEUTRAL_BALANCE, useBalance } from '../src/data/balance.js';
import { LATEST, applyEnvironment } from '../src/data/environment.js';

// 戦闘の仕組みそのものを確かめるテスト。調整後の数値ではなく、調整前の数値（ダメージ式どおり・毒は1蓄積1ダメージ）で行う。
useBalance(NEUTRAL_BALANCE);

const ch = (id, o = {}) => ({ id, kind: 'character', name: id, icon: '?', tribe: 'warrior', hp: 1000, atk: 10, def: 0, spd: 1, effects: [], ...o });
const item = (id, o = {}) => ({ id, kind: 'item', name: id, icon: '?', atk: 0, def: 0, effects: [], ...o });
const team = (slots, relics = [], board = 'square') => ({
  name: 't',
  board,
  slots: slots.map(([pos, pieceId]) => ({ pos, pieceId })),
  relics,
});
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const attacks = (result, side) => result.log.filter((e) => e.type === 'attack' && e.side === side);

test('乱数は同じシードで同じ列、違うシードで違う列', () => {
  const [a, b, c] = [createRng(5), createRng(5), createRng(6)];
  const seqA = [a(), a(), a()];
  assert.deepEqual(seqA, [b(), b(), b()]);
  assert.notDeepEqual(seqA, [c(), c(), c()]);
  assert.ok(seqA.every((x) => x >= 0 && x < 1));
});

test('ダメージ式：攻撃×100÷(100+防御)。HP0で即決着', () => {
  const catalog = createCatalog([ch('A', { atk: 100 }), ch('B', { def: 100 })]);
  const r = runBattle(team([[[1, 1], 'A']]), team([[[1, 1], 'B']]), catalog);
  // Aの与ダメージ 50/回 → 20回目(20秒)でBが0。Bの与ダメージ 10/回
  assert.equal(r.winner, 'a');
  assert.equal(r.reason, 'ko');
  assert.equal(r.time, 20);
  assert.equal(r.hp.b, 0);
  assert.equal(r.hp.a, 800);
});

test('30秒時点のHP割合が高い方の勝ち', () => {
  const catalog = createCatalog([ch('A', { atk: 20, def: 100 }), ch('B', { atk: 10, def: 100 })]);
  const r = runBattle(team([[[1, 1], 'A']]), team([[[1, 1], 'B']]), catalog);
  assert.equal(r.reason, 'timeout');
  assert.equal(r.time, 30);
  assert.equal(r.winner, 'a'); // Aは150ダメージ、Bは300ダメージを受ける
  assert.equal(r.hp.a, 850);
  assert.equal(r.hp.b, 700);
});

test('完全に同じ内容なら引き分け（KOでもタイムアウトでも）', () => {
  const ko = createCatalog([ch('K', { atk: 100 })]);
  const rKo = runBattle(team([[[1, 1], 'K']]), team([[[1, 1], 'K']]), ko);
  assert.deepEqual([rKo.winner, rKo.reason], ['draw', 'simultaneous']);
  const slow = createCatalog([ch('S', { def: 100 })]);
  const rSlow = runBattle(team([[[1, 1], 'S']]), team([[[1, 1], 'S']]), slow);
  assert.deepEqual([rSlow.winner, rSlow.reason], ['draw', 'timeout']);
});

test('同時にHPが0以下：はみ出しが少ない（HP割合が高い）方の勝ち', () => {
  const catalog = createCatalog([ch('A', { hp: 100, atk: 100 }), ch('B', { hp: 100, atk: 100 }), item('Sw', { atk: 50 })]);
  // 1秒時点でAが150、Bが100のダメージを出す → Aは0、Bは-50
  const r = runBattle(team([[[1, 1], 'A'], [[1, 2], 'Sw']]), team([[[1, 1], 'B']]), catalog);
  assert.deepEqual([r.winner, r.reason], ['a', 'simultaneous']);
  close(r.ratio.a, 0);
  close(r.ratio.b, -0.5);
});

test('毒は防御を無視して0.1秒ごとに蓄積量ぶん入り、重ねがけで加算される', () => {
  const catalog = createCatalog([
    ch('A', { effects: [{ type: 'poison', stacks: 2, chance: 1 }] }),
    ch('B', { def: 100, spd: 0.5 }),
  ]);
  const battle = createBattle(team([[[1, 1], 'A']]), team([[[1, 1], 'B']]), catalog);
  for (let i = 0; i < 40; i++) battle.advance(); // 2秒
  // 通常ダメージ 5+5。毒は20〜38ステップで2×10、40ステップ目は蓄積4で4
  close(battle.sides.b.hp, 1000 - 10 - 24);
  assert.equal(battle.sides.b.poison, 4);
});

// 調整用の数値（src/data/balance.js）を変えると、戦闘にその通り反映される
function withBalance(changes, fn) {
  const saved = structuredClone(BALANCE);
  useBalance(changes);
  try {
    return fn();
  } finally {
    useBalance(saved);
  }
}

test('調整用の数値：damageScale は通常攻撃のダメージにかかる', () => {
  const catalog = createCatalog([ch('A', { atk: 100 }), ch('B')]);
  const hpAfterOneSecond = () => {
    const battle = createBattle(team([[[1, 1], 'A']]), team([[[1, 1], 'B']]), catalog);
    for (let i = 0; i < 20; i++) battle.advance();
    return battle.sides.b.hp;
  };
  assert.equal(hpAfterOneSecond(), 900);
  assert.equal(withBalance({ damageScale: 0.5 }, hpAfterOneSecond), 950);
});

test('調整用の数値：poisonDamage は毒1蓄積あたりのダメージ', () => {
  const catalog = createCatalog([
    ch('A', { effects: [{ type: 'poison', stacks: 2, chance: 1 }] }),
    ch('B', { def: 100, spd: 0.5 }),
  ]);
  const hpAfterTwoSeconds = () => {
    const battle = createBattle(team([[[1, 1], 'A']]), team([[[1, 1], 'B']]), catalog);
    for (let i = 0; i < 40; i++) battle.advance();
    return battle.sides.b.hp;
  };
  close(hpAfterTwoSeconds(), 1000 - 10 - 24);
  close(withBalance({ poisonDamage: 0.5 }, hpAfterTwoSeconds), 1000 - 10 - 12);
});

test('調整用の数値：poisonDuration があると、毒は付与から指定の秒数で消える', () => {
  const catalog = createCatalog([
    ch('A', { effects: [{ type: 'poison', stacks: 2, chance: 1 }] }),
    ch('B', { def: 100, spd: 0.5 }),
  ]);
  withBalance({ poisonDuration: 1 }, () => {
    const battle = createBattle(team([[[1, 1], 'A']]), team([[[1, 1], 'B']]), catalog);
    for (let i = 0; i < 40; i++) battle.advance();
    // 1回目の毒は20〜38ステップの10回ぶん(2×10)で消え、2回目(40ステップ)の毒が2だけ残る
    assert.equal(battle.sides.b.poison, 2);
    close(battle.sides.b.hp, 1000 - 10 - 22);
  });
});

test('調整用の数値：paralyzeFactor が1なら麻痺しても攻撃速度は変わらない', () => {
  const stats = { atk: 10, def: 100 };
  const paralyze = { type: 'paralyze', target: 'front', duration: 3, chance: 1 };
  const catalog = createCatalog([ch('A', { ...stats, spd: 0.5, effects: [paralyze] }), ch('B', { ...stats })]);
  const run = () => runBattle(team([[[1, 1], 'A']]), team([[[1, 1], 'B']]), catalog, { log: true });
  assert.ok(attacks(run(), 'b').length < 30);
  assert.equal(withBalance({ paralyzeFactor: 1 }, () => attacks(run(), 'b').length), 30);
});

test('麻痺は攻撃速度を半減する', () => {
  const stats = { atk: 10, def: 100 };
  const paralyze = { type: 'paralyze', target: 'front', duration: 3, chance: 1 };
  const catalog = createCatalog([
    ch('A', { ...stats, spd: 0.5, effects: [paralyze] }),
    ch('A0', { ...stats, spd: 0.5 }),
    ch('B', { ...stats }),
  ]);
  const slowed = runBattle(team([[[1, 1], 'A']]), team([[[1, 1], 'B']]), catalog, { log: true });
  const normal = runBattle(team([[[1, 1], 'A0']]), team([[[1, 1], 'B']]), catalog, { log: true });
  assert.equal(attacks(normal, 'b').length, 30);
  assert.ok(attacks(slowed, 'b').length < 30);
  assert.ok(slowed.log.some((e) => e.type === 'paralyze'));
});

test('麻痺は重ねがけで持続時間が延びる', () => {
  const paralyze = { type: 'paralyze', target: 'front', duration: 3, chance: 1 };
  const catalog = createCatalog([ch('A', { spd: 3, effects: [paralyze] }), ch('B', { hp: 1000, def: 100 })]);
  const battle = createBattle(team([[[1, 1], 'A']]), team([[[1, 1], 'B']]), catalog);
  for (let i = 0; i < 30; i++) battle.advance(); // Aは約0.33秒ごとに攻撃する
  assert.ok(battle.sides.b.units[0].paraSteps > 60, `${battle.sides.b.units[0].paraSteps}`); // 3秒(=60ステップ)を超える
});

test('麻痺の対象指定：fastest / strongest', () => {
  const para = (target) => ({ type: 'paralyze', target, duration: 3, chance: 1 });
  const catalog = createCatalog([
    ch('Fa', { effects: [para('fastest')] }),
    ch('St', { effects: [para('strongest')] }),
    ch('Quick', { spd: 3, atk: 10 }),
    ch('Strong', { spd: 0.5, atk: 100 }),
  ]);
  const foe = team([[[1, 1], 'Quick'], [[2, 1], 'Strong']]);
  const fastest = runBattle(team([[[1, 1], 'Fa']]), foe, catalog, { log: true });
  assert.deepEqual(fastest.log.find((e) => e.type === 'paralyze').target, [1, 1]);
  const strongest = runBattle(team([[[1, 1], 'St']]), foe, catalog, { log: true });
  assert.deepEqual(strongest.log.find((e) => e.type === 'paralyze').target, [2, 1]);
});

test('狙う前線：同じ行 → なければ近い行 → 同距離なら行番号が小さい方。道具は前線にならない', () => {
  const catalog = createCatalog([ch('A'), ch('B'), item('I')]);
  const firstTarget = (a, b) => attacks(runBattle(team(a), team(b), catalog, { log: true }), 'a')[0].to;
  assert.deepEqual(firstTarget([[[2, 1], 'A']], [[[1, 1], 'B'], [[2, 2], 'B'], [[3, 1], 'B']]), [2, 2]);
  assert.deepEqual(firstTarget([[[1, 1], 'A']], [[[2, 1], 'B'], [[3, 1], 'B']]), [2, 1]);
  assert.deepEqual(firstTarget([[[2, 1], 'A']], [[[1, 1], 'B'], [[3, 1], 'B']]), [1, 1]);
  assert.deepEqual(firstTarget([[[2, 1], 'A']], [[[2, 1], 'I'], [[2, 2], 'B']]), [2, 2]);
});

test('回復は最大HPを超えない', () => {
  const catalog = createCatalog([
    ch('H', { def: 100, effects: [{ type: 'heal', amount: 15, interval: 1 }] }),
    ch('B', { def: 100 }),
  ]);
  const r = runBattle(team([[[1, 1], 'H']]), team([[[1, 1], 'B']]), catalog);
  assert.equal(r.hp.a, 1000);
});

test('実効ステータス：隣接する道具・遺物・種族シナジー・隣接攻撃倍率（Ver.1 の駒で確かめる）', () => {
  applyEnvironment('v1');
  useBalance(NEUTRAL_BALANCE);
  try {
  const catalog = createCatalog();
  const t = resolveTeam(team([[[1, 1], 'c_squire'], [[1, 2], 'i_sword'], [[2, 1], 'i_banner']], ['r_whetstone']), catalog);
  const squire = t.units[0];
  assert.equal(squire.atk, 25 + 25 + 4); // 基本 + 剣 + 砥石
  assert.equal(squire.def, 20);
  close(squire.atkMult, 1.5); // 軍旗

  const warriors = resolveTeam(team([[[1, 1], 'c_squire'], [[2, 1], 'c_squire'], [[3, 1], 'c_squire']]), catalog);
  assert.deepEqual(warriors.units.map((u) => u.def), [50, 50, 50]); // 戦士3体 → 防御+30

  const machines = resolveTeam(team([[[1, 1], 'c_drone'], [[2, 1], 'c_drone']], ['r_heart']), catalog);
  close(machines.units[0].hp, 150 * 1.2); // 機械2体(+10%) + 遺物(+10%)
  } finally {
    applyEnvironment(LATEST.id);
    useBalance(NEUTRAL_BALANCE);
  }
});

test('道具の毒は隣接するキャラの攻撃に乗る。魔導シナジーで付与量が増える', () => {
  const catalog = createCatalog();
  const t = resolveTeam(team([[[1, 1], 'c_squire'], [[1, 2], 'i_vial']]), catalog);
  assert.deepEqual(t.units[0].onHit.map((e) => e.type), ['poison']);
  const mages = resolveTeam(team([[[1, 1], 'c_apprentice'], [[2, 1], 'c_apprentice']]), catalog);
  assert.equal(mages.poisonBonus, 1);
});

test('同じ入力・同じシードなら結果もログも完全に一致する', () => {
  const catalog = createCatalog();
  const [a, b] = [PRESET_TEAMS[1], PRESET_TEAMS[2]];
  const run = (seed) => JSON.stringify(runBattle(a, b, catalog, { seed, log: true }));
  assert.equal(run(7), run(7));
});

test('画面用に、ステップごとに events / history を読める（log: true のときだけ）', () => {
  const catalog = createCatalog();
  const [a, b] = [PRESET_TEAMS[0], PRESET_TEAMS[1]];
  const quiet = createBattle(a, b, catalog);
  const loud = createBattle(a, b, catalog, { log: true });
  for (let i = 0; i < 40; i++) {
    quiet.advance();
    loud.advance();
  }
  assert.equal(quiet.events.length, 0);
  assert.equal(loud.history.length, 40);
  assert.ok(loud.events.some((e) => e.type === 'attack'));
  assert.deepEqual(quiet.sides.a.hp, loud.sides.a.hp); // ログの有無で結果が変わらない
});

test('プリセットチーム同士の総当たりが30秒以内に必ず決着する', () => {
  const catalog = createCatalog();
  for (const a of PRESET_TEAMS) {
    for (const b of PRESET_TEAMS) {
      const r = runBattle(a, b, catalog, { seed: 1 });
      assert.ok(['a', 'b', 'draw'].includes(r.winner));
      assert.ok(r.time > 0 && r.time <= 30);
    }
  }
});

test('戦闘の内訳：駒ごとの与ダメージの合計がチームの与ダメージと一致し、受けた・回復した量も駒・遺物ごとに分かれる', () => {
  const catalog = createCatalog([
    ch('c_hit', { atk: 30 }),
    ch('c_venom', { atk: 5, effects: [{ type: 'poison', stacks: 2, chance: 1 }] }),
    ch('c_hex', { atk: 5, effects: [{ type: 'curse', duration: 3, chance: 1 }] }),
    ch('c_medic', { atk: 1, effects: [{ type: 'heal', amount: 20, interval: 1 }] }),
    item('i_censer', { effects: [{ type: 'pulse', status: 'poison', amount: 1, interval: 1 }] }),
  ]);
  useBalance({ ...NEUTRAL_BALANCE, curseAmp: 0.25 });
  try {
    const a = team([[[1, 1], 'c_hit'], [[2, 1], 'c_venom'], [[3, 1], 'c_hex'], [[1, 3], 'i_censer']]);
    const b = team([[[1, 1], 'c_hit'], [[2, 1], 'c_medic'], [[3, 1], 'c_hit']], ['r_spring']);
    const r = runBattle(a, b, catalog, { seed: 3, log: true });
    const sum = (list, f) => list.reduce((s, x) => s + f(x), 0);
    for (const key of ['a', 'b']) {
      const st = r.stats[key];
      close(sum(st.sources, (x) => x.attack + x.poison + x.curse) / r.dealt[key], 1);
      close(sum(st.sources, (x) => x.poison), r.poisonDealt[key]);
    }
    const byKey = (key, k) => r.stats[key].sources.find((x) => (x.pos ? x.pos.join(',') : `${x.kind}:${x.id}`) === k);
    assert.ok(byKey('a', '2,1').poison > 0, '毒の駒');
    assert.ok(byKey('a', '1,3').poison > 0, '毒の香炉（道具）');
    assert.ok(byKey('a', '3,1').curse >= 0);
    assert.ok(sum(r.stats.a.sources, (x) => x.curse) > 0, '呪いで増えた分');
    close(r.stats.b.curseTaken, sum(r.stats.a.sources, (x) => x.curse));
    assert.ok(byKey('b', '2,1').heal > 0 && byKey('b', 'relic:r_spring').heal > 0, '駒と遺物の回復');
    // 攻撃を受けた量の合計 = 相手の攻撃の合計
    close(sum(r.stats.b.sources, (x) => x.taken), sum(r.stats.a.sources, (x) => x.attack));
    // ログなしなら集めない
    assert.equal(runBattle(a, b, catalog, { seed: 3 }).stats, undefined);
  } finally {
    useBalance(NEUTRAL_BALANCE);
  }
});
