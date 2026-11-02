import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, useBalance } from '../src/data/balance.js';
import { BOARDS } from '../src/data/boards.js';
import { LATEST, applyEnvironment } from '../src/data/environment.js';
import { CHARACTERS, ITEMS } from '../src/data/pieces.js';
import { createCatalog } from '../src/core/catalog.js';
import { pieceCost } from '../src/core/cost.js';
import { validatePiece } from '../src/core/piece.js';
import { randomTeam } from '../src/core/randomTeam.js';
import { createBattle } from '../src/engine/battle.js';
import { resolveTeam } from '../src/engine/resolve.js';
import { createRng } from '../src/engine/rng.js';
import { parsePieceJson } from '../src/storage/pieceJson.js';

// Ver.2 で入った仕組み（1発ごとに防御を引くダメージ式・防御貫通・呪い・隣接効果・全体効果・定期付与・
// 麻痺の範囲・再生・ボードの特性など）を、調整後の数値（最新の環境）で確かめる。

const ch = (id, o = {}) => ({ id, kind: 'character', name: id, icon: '?', tribe: 'warrior', hp: 1000, atk: 10, def: 0, spd: 1, effects: [], ...o });
const item = (id, o = {}) => ({ id, kind: 'item', name: id, icon: '?', atk: 0, def: 0, effects: [], ...o });
const team = (slots, relics = [], board = 'square') => ({ name: 't', board, slots: slots.map(([pos, pieceId]) => ({ pos, pieceId })), relics });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const latest = (fn) => () => {
  applyEnvironment(LATEST.id);
  useBalance();
  fn();
};
const firstHit = (a, b, catalog, side = 'a') => {
  const battle = createBattle(a, b, catalog, { log: true });
  for (let i = 0; i < 20; i++) battle.advance();
  return battle.events.find((e) => e.type === 'attack' && e.side === side).dmg;
};

test('ダメージ式（Ver.2）：1発ごとに 防御×armor を引き、攻撃×minDamage は必ず通る', latest(() => {
  const catalog = createCatalog([ch('Big', { atk: 100 }), ch('Small', { atk: 20 }), ch('Wall', { def: 100, tribe: 'mage' })]);
  const s = BALANCE.damageScale;
  close(firstHit(team([[[1, 1], 'Big']]), team([[[1, 1], 'Wall']]), catalog), 100 * s - 100 * BALANCE.armor);
  close(firstHit(team([[[1, 1], 'Small']]), team([[[1, 1], 'Wall']]), catalog), 20 * s * BALANCE.minDamage);
}));

test('防御貫通：貫通した割合ぶん、相手の防御を無いものとして計算する（道具なら隣のキャラに付く）', latest(() => {
  const catalog = createCatalog([
    ch('P', { atk: 100, effects: [{ type: 'pierce', value: 0.5 }] }), ch('A', { atk: 100 }),
    item('Sp', { effects: [{ type: 'pierce', value: 0.5 }] }), ch('Wall', { def: 100, tribe: 'mage' }),
  ]);
  const s = BALANCE.damageScale;
  const expected = 100 * s - 50 * BALANCE.armor;
  close(firstHit(team([[[1, 1], 'P']]), team([[[1, 1], 'Wall']]), catalog), expected);
  close(firstHit(team([[[1, 1], 'A'], [[1, 2], 'Sp']]), team([[[1, 1], 'Wall']]), catalog), expected);
}));

test('呪い：かかったチームは、次のステップから受けるダメージが curseAmp だけ増える', latest(() => {
  const curse = { type: 'curse', duration: 3, chance: 1 };
  const catalog = createCatalog([ch('C', { atk: 50, effects: [curse] }), ch('N', { atk: 50 }), ch('T', { tribe: 'mage' })]);
  const hpAfter = (attacker, steps) => {
    const battle = createBattle(team([[[1, 1], attacker]]), team([[[1, 1], 'T']]), catalog);
    for (let i = 0; i < steps; i++) battle.advance();
    return battle.sides.b.hp;
  };
  const hit = 50 * BALANCE.damageScale;
  close(1000 - hpAfter('C', 20), hit); // 1発目は呪いをかけたステップなので増えない
  close(1000 - hpAfter('C', 40), hit + hit * (1 + BALANCE.curseAmp));
  close(1000 - hpAfter('N', 40), 2 * hit);
}));

test('隣接効果・全体効果：隣のキャラだけ／味方全員に効く', latest(() => {
  const catalog = createCatalog([
    item('Adj', { effects: [{ type: 'adjBuff', stat: 'atk', mode: 'add', value: 10 }] }),
    item('All', { effects: [{ type: 'teamBuff', stat: 'def', mode: 'add', value: 7 }] }),
    ch('X', { tribe: 'mage' }),
  ]);
  const t = team([[[1, 1], 'X'], [[1, 2], 'Adj'], [[3, 3], 'X'], [[3, 1], 'All']]);
  const [near, far] = resolveTeam(t, catalog).units;
  assert.equal(near.atk, 20);
  assert.equal(far.atk, 10);
  assert.deepEqual([near.def, far.def], [7, 7]);
}));

test('定期付与：置き場所に関係なく、一定時間ごとに相手へ毒・呪いを付ける', latest(() => {
  const catalog = createCatalog([
    item('Censer', { effects: [{ type: 'pulse', status: 'poison', amount: 2, interval: 1 }] }),
    item('Doll', { effects: [{ type: 'pulse', status: 'curse', amount: 2, interval: 1 }] }),
    ch('X', { atk: 10, spd: 0.1, tribe: 'mage' }),
  ]);
  const battle = createBattle(team([[[1, 1], 'X'], [[3, 3], 'Censer'], [[2, 3], 'Doll']]), team([[[1, 1], 'X']]), catalog);
  for (let i = 0; i < 41; i++) battle.advance(); // 2.05秒
  assert.equal(battle.sides.b.poison, 4); // 1秒・2秒で2ずつ
  assert.ok(battle.sides.b.curseSteps > 0);
  assert.equal(battle.sides.a.poison, 0);
}));

test('麻痺の範囲：row は前線と同じ行の全員、all は全員', latest(() => {
  const para = (target) => ({ type: 'paralyze', target, duration: 2, chance: 1 });
  const catalog = createCatalog([ch('R', { effects: [para('row')] }), ch('Al', { effects: [para('all')] }), ch('F', { tribe: 'mage' })]);
  const foe = team([[[1, 1], 'F'], [[1, 2], 'F'], [[2, 1], 'F']]);
  const slowed = (attacker) => {
    const battle = createBattle(team([[[1, 1], attacker]]), foe, catalog);
    for (let i = 0; i < 21; i++) battle.advance();
    return battle.sides.b.units.map((u) => u.paraSteps > 0);
  };
  assert.deepEqual(slowed('R'), [true, true, false]);
  assert.deepEqual(slowed('Al'), [true, true, true]);
}));

test('麻痺のコストは、確率・秒数・対象の範囲で上がる（Ver.1 の環境では確率だけ）', latest(() => {
  const cost = (e) => pieceCost(ch('x', { effects: [e] }));
  const base = { type: 'paralyze', target: 'front', duration: 2, chance: 0.5 };
  assert.ok(cost({ ...base, duration: 10 }) > cost(base));
  assert.ok(cost({ ...base, target: 'all' }) > cost(base));
  applyEnvironment('v1');
  try {
    assert.equal(cost({ ...base, duration: 10 }), cost(base));
  } finally {
    applyEnvironment(LATEST.id);
  }
}));

test('機械のシナジーは再生（最大HPの割合を毎秒）、中立は少ないほど強い', latest(() => {
  const catalog = createCatalog();
  const machines = resolveTeam(team([[[1, 1], 'c_golem'], [[2, 1], 'c_golem'], [[3, 1], 'c_golem']]), catalog);
  const regen = machines.healers.at(-1);
  close(regen.amount, machines.maxHp * 0.008);
  assert.equal(regen.interval, 1);
  const hpOf = (slots) => resolveTeam(team(slots), catalog).units[0].hp;
  const elf = CHARACTERS.find((c) => c.id === 'c_elf');
  close(hpOf([[[1, 1], 'c_elf']]), elf.hp * 1.2);
  close(hpOf([[[1, 1], 'c_elf'], [[2, 1], 'c_elf']]), elf.hp * 1.1);
}));

test('スクエアでは行効果が rowBuffMult 倍、方陣の旗は3体並んだ行だけ', latest(() => {
  const catalog = createCatalog([ch('B', { effects: [{ type: 'rowBuff', stat: 'atk', mode: 'add', value: 10 }] }), ch('X', { tribe: 'mage' })]);
  const atkOn = (board, pos) => resolveTeam(team([[pos, 'B']], [], board), catalog).units[0].atk;
  assert.equal(atkOn('square', [1, 1]), 10 + 10 * BALANCE.boardTraits.square.rowBuffMult);
  assert.equal(atkOn('honeycomb', [1, 2]), 20);
  const full = resolveTeam(team([[[1, 1], 'X'], [[1, 2], 'X'], [[1, 3], 'X'], [[2, 1], 'X']], ['r_phalanx']), catalog).units;
  assert.deepEqual(full.map((u) => u.def), [10, 10, 10, 0]);
}));

test('解毒の聖水：受ける毒ダメージが減る', latest(() => {
  const catalog = createCatalog([ch('A', { atk: 10, spd: 0.1, effects: [] }), item('Censer', { effects: [{ type: 'pulse', status: 'poison', amount: 5, interval: 1 }] })]);
  const poisonTaken = (relics) => {
    const battle = createBattle(team([[[1, 1], 'A'], [[3, 3], 'Censer']]), team([[[1, 1], 'A']], relics), catalog);
    for (let i = 0; i < 60; i++) battle.advance();
    return battle.sides.a.poisonDealt;
  };
  close(poisonTaken(['r_antidote']), poisonTaken([]) * 0.8);
}));

test('新しい効果の検査とJSON（範囲外・知らない項目を拒否する）', latest(() => {
  const ok = [
    { type: 'curse', duration: 3, chance: 0.5 }, { type: 'pierce', value: 0.5 },
    { type: 'adjBuff', stat: 'hp', mode: 'pct', value: 0.1 }, { type: 'teamBuff', stat: 'def', mode: 'add', value: 5 },
    { type: 'pulse', status: 'poison', amount: 1, interval: 1 }, { type: 'pulse', status: 'curse', amount: 2.5, interval: 3 },
  ];
  for (const e of ok) assert.deepEqual(validatePiece(item('u_ok', { effects: [e] })), [], JSON.stringify(e));
  const bad = [
    { type: 'curse', duration: 0, chance: 0.5 }, { type: 'pierce', value: 2 }, { type: 'adjBuff', stat: 'spd', mode: 'add', value: 1 },
    { type: 'pulse', status: 'paralyze', amount: 1, interval: 1 }, { type: 'pulse', status: 'poison', amount: 1.5, interval: 1 },
    { type: 'pulse', status: 'poison', amount: 1, interval: 0.1 }, { type: 'paralyze', target: 'everyone', duration: 1, chance: 1 },
  ];
  for (const e of bad) assert.notDeepEqual(validatePiece(item('u_bad', { effects: [e] })), [], JSON.stringify(e));
  const text = JSON.stringify({ format: 'auto-battler/piece', version: 1, piece: item('u_j', { effects: [{ ...ok[4], evil: 1 }] }) });
  assert.deepEqual(parsePieceJson(text).pieces[0].effects, [ok[4]]);
}));

test('ランダムなチームは遺物を3つ持ち、予算が残っていれば空きマスを埋める', latest(() => {
  const pieces = createCatalog().pieces();
  const rng = createRng(3);
  const cheapest = Math.min(...pieces.map(pieceCost));
  for (let i = 0; i < 60; i++) {
    const board = Object.keys(BOARDS)[i % 3];
    const t = randomTeam(board, pieces, rng);
    assert.equal(t.relics.length, 3);
    const used = t.slots.reduce((s, x) => s + pieceCost(pieces.find((p) => p.id === x.pieceId)), 0);
    if (t.slots.length < BOARDS[board].cells.length) assert.ok(BOARDS[board].costCap - used < cheapest, `${board} ${used}`);
  }
}));

test('Ver.1 の駒のコストは、Ver.2 の式を入れても変わらない', () => {
  const V1 = {
    c_squire: 3, c_knight: 6, c_berserker: 6, c_apprentice: 2, c_hexer: 5, c_sorcerer: 4, c_wolf: 3, c_bear: 5, c_viper: 2,
    c_drone: 2, c_golem: 7, c_medibot: 7, c_dragoon: 12, c_general: 17, c_archmage: 9, c_behemoth: 12, c_fighter: 10,
    c_paladin: 9, c_witch: 4, c_oracle: 4, c_boar: 4, c_hawk: 3, c_turret: 5, c_reactor: 5, c_elf: 2, c_dwarf: 8, c_fiend: 12,
    i_sword: 3, i_shield: 5, i_spear: 3, i_gear: 3, i_banner: 5, i_vial: 1, i_stungun: 1, i_potion: 3, i_blade: 11, i_armor: 11, i_crown: 10,
  };
  applyEnvironment('v1');
  try {
    const actual = Object.fromEntries([...CHARACTERS, ...ITEMS].map((p) => [p.id, pieceCost(p)]));
    assert.deepEqual(actual, V1);
  } finally {
    applyEnvironment(LATEST.id);
  }
});
