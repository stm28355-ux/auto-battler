import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, setBalance, useBalance } from '../src/data/balance.js';
import { applyEnvironment } from '../src/data/environment.js';
import { createCatalog } from '../src/core/catalog.js';
import { pieceCost } from '../src/core/cost.js';
import { validatePiece } from '../src/core/piece.js';
import { createBattle } from '../src/engine/battle.js';
import { resolveTeam } from '../src/engine/resolve.js';

// Ver.3 で入った効果（号令・手当て・吸血を配る・毒で攻撃+・道具を磨く・種族を決めた全体効果）を、最新の環境で確かめる。

const ch = (id, o = {}) => ({ id, kind: 'character', name: id, icon: '?', tribe: 'warrior', hp: 1000, atk: 10, def: 0, spd: 1, effects: [], ...o });
const item = (id, o = {}) => ({ id, kind: 'item', name: id, icon: '?', atk: 0, def: 0, effects: [], ...o });
const team = (slots, relics = [], board = 'square') => ({ name: 't', board, slots: slots.map(([pos, pieceId]) => ({ pos, pieceId })), relics });
const v3 = (fn) => () => {
  applyEnvironment('v3');
  useBalance();
  fn();
};

test('道具を磨く：その道具の隣のキャラ全員に、道具の攻撃・防御が強くなって付く', v3(() => {
  const cat = createCatalog([ch('x_smith', { effects: [{ type: 'itemAmp', stat: 'atk', value: 0.5 }] }), ch('x_a', { tribe: 'beast' }), item('x_sword', { atk: 20, def: 10 })]);
  // 1,1 鍛冶 / 1,2 剣 / 1,3 ふつうのキャラ（剣の隣。鍛冶の隣ではない）
  const units = resolveTeam(team([[[1, 1], 'x_smith'], [[1, 2], 'x_sword'], [[1, 3], 'x_a']]), cat).units;
  for (const u of units) {
    assert.equal(u.atk, 10 + 30); // 攻撃は 20 × 1.5
    assert.equal(u.def, 10); // 防御は磨いていない
  }
}));

test('吸血を配る：隣のキャラに吸血が付き、自分には付かない', v3(() => {
  const cat = createCatalog([ch('x_v', { effects: [{ type: 'lifestealAura', value: 0.25 }] }), ch('x_a')]);
  const [v, a] = resolveTeam(team([[[1, 1], 'x_v'], [[1, 2], 'x_a']]), cat).units;
  assert.equal(v.lifesteal, 0);
  assert.equal(a.lifesteal, 0.25);
}));

test('種族を決めた全体効果は、その種族だけに効き、値段は全員に効くものの tribeShare 倍', v3(() => {
  const e = { type: 'teamBuff', stat: 'atk', mode: 'add', value: 10 };
  const cat = createCatalog([ch('x_g', { effects: [{ ...e, tribe: 'warrior' }] }), ch('x_m', { tribe: 'mage' })]);
  const [g, m] = resolveTeam(team([[[1, 1], 'x_g'], [[1, 2], 'x_m']]), cat).units;
  assert.equal(g.atk, 20);
  assert.equal(m.atk, 10);
  const base = ch('x_p', { hp: 100, atk: 10 });
  const raw = (p) => pieceCost(p);
  assert.ok(raw({ ...base, effects: [{ ...e, tribe: 'warrior' }] }) < raw({ ...base, effects: [e] }));
}));

test('号令：開始から決まった秒数だけ攻撃速度が上がる', v3(() => {
  const rally = ch('x_r', { atk: 10, spd: 1, effects: [{ type: 'rally', stat: 'spd', value: 1, duration: 2 }] });
  const cat = createCatalog([rally, ch('x_t', { hp: 100000 })]);
  const battle = createBattle(team([[[1, 1], 'x_r']]), team([[[1, 1], 'x_t']]), cat, { log: true });
  const attacksBy = (sec) => battle.events.filter((e) => e.type === 'attack' && e.side === 'a' && e.t <= sec + 1e-9).length;
  for (let i = 0; i < 80; i++) battle.advance(); // 4秒
  assert.equal(attacksBy(2), 4); // 最初の2秒は2倍の速さ
  assert.equal(attacksBy(4) - attacksBy(2), 2); // そのあとはもとの速さ
}));

test('毒で攻撃+：相手の毒の蓄積ぶん、1発が重くなる', v3(() => {
  const venom = ch('x_v', { atk: 10, effects: [{ type: 'venomAtk', value: 2 }] });
  const cat = createCatalog([venom, ch('x_t', { hp: 100000 })]);
  const battle = createBattle(team([[[1, 1], 'x_v']]), team([[[1, 1], 'x_t']]), cat, { log: true });
  battle.sides.b.poison = 5; // 毒が5溜まっている
  for (let i = 0; i < 20; i++) battle.advance();
  const hit = battle.events.find((e) => e.type === 'attack' && e.side === 'a');
  assert.ok(Math.abs(hit.dmg - (10 + 2 * 5) * BALANCE.damageScale) < 1e-9);
}));

test('手当て：一定時間ごとに、味方の毒を減らし、麻痺のいちばん長い1体を解く', v3(() => {
  const cat = createCatalog([ch('x_c', { effects: [{ type: 'cure', interval: 1, poison: 3 }] }), ch('x_a'), ch('x_t', { hp: 100000 })]);
  const battle = createBattle(team([[[1, 1], 'x_c'], [[2, 1], 'x_a']]), team([[[1, 1], 'x_t']]), cat, { log: true });
  const a = battle.sides.a;
  a.poisons.push({ stacks: 5, until: Infinity, src: null });
  a.poison = 5;
  a.units[1].paraSteps = 100;
  a.units[0].paraSteps = 10;
  for (let i = 0; i < 20; i++) battle.advance(); // 1秒
  assert.equal(a.poison, 2);
  assert.equal(a.units[1].paraSteps, 0);
}));

test('Ver.3 の新しい効果は、その査定がない環境の自作駒には付けられない', () => {
  const p = ch('x_r', { effects: [{ type: 'rally', stat: 'spd', value: 0.2, duration: 5 }] });
  applyEnvironment('v3');
  useBalance();
  assert.deepEqual(validatePiece(p), []);
  applyEnvironment('v2');
  useBalance();
  assert.ok(validatePiece(p).some((m) => m.includes('この環境では使えません')));
  applyEnvironment('v3');
  useBalance();
});

test('麻痺の倍率を攻撃速度で変える試し（paralyzeSlowFactor）：遅い駒ほど麻痺が効きにくい', v3(() => {
  const cat = createCatalog([ch('x_slow', { spd: 0.5, hp: 100000 }), ch('x_fast', { spd: 2, hp: 100000 })]);
  const run = (id) => {
    const battle = createBattle(team([[[1, 1], id]]), team([[[1, 1], id]]), cat, { log: true });
    battle.sides.a.units[0].paraSteps = 1000;
    for (let i = 0; i < 200; i++) battle.advance(); // 10秒
    return battle.events.filter((e) => e.type === 'attack' && e.side === 'a').length;
  };
  setBalance('paralyzeSlowFactor', 0.7);
  try {
    assert.equal(run('x_slow'), Math.floor(10 * 0.5 * 0.7 + 1e-9)); // 遅い駒は 0.7 倍
    assert.equal(run('x_fast'), Math.floor(10 * 2 * BALANCE.paralyzeFactor + 1e-9)); // 速い駒は paralyzeFactor 倍
  } finally {
    useBalance();
  }
}));
