import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEnvironment, LATEST } from '../src/data/environment.js';
import { createCatalog } from '../src/core/catalog.js';
import { validateTeam } from '../src/core/team.js';
import { createRng } from '../src/engine/rng.js';
import { runBattle } from '../src/engine/battle.js';
import { canonicalize, dominates, isDowngrade, isPrunable, itemLive, removeDeadItems, safeAddition, safeToAdd } from '../tools/search/prune.js';
import { solveNash } from '../tools/search/nash.js';
import { createSpace, descriptor, teamKey } from '../tools/search/space.js';

// Ver.1 の駒で確かめる（魔剣 ⊇ 鉄の剣 などがある）
function v1() {
  applyEnvironment('v1');
  return createCatalog();
}
const done = () => applyEnvironment(LATEST.id);

// ゴーレム城塞（動力炉1体をゴーレムに替えた形）
const golem = () => ({
  name: 'ゴーレム城塞', board: 'square',
  slots: [
    { pos: [1, 1], pieceId: 'c_golem' }, { pos: [1, 2], pieceId: 'c_viper' }, { pos: [1, 3], pieceId: 'c_golem' },
    { pos: [2, 1], pieceId: 'c_golem' }, { pos: [2, 2], pieceId: 'i_blade' }, { pos: [2, 3], pieceId: 'c_viper' },
    { pos: [3, 1], pieceId: 'c_golem' }, { pos: [3, 2], pieceId: 'c_viper' }, { pos: [3, 3], pieceId: 'c_reactor' },
  ],
  relics: ['r_amulet', 'r_heart', 'r_totem'],
});

test('① 上位互換：同じ種類・同じ種族で、能力値も効果も以上', () => {
  const c = v1();
  assert.ok(dominates(c.piece('i_blade'), c.piece('i_sword')));
  assert.ok(!dominates(c.piece('i_sword'), c.piece('i_blade')));
  assert.ok(dominates(c.piece('c_behemoth'), c.piece('c_bear')));
  // 種族が違えば比べない（種族ボーナスの数が変わる）
  assert.ok(!dominates(c.piece('c_golem'), c.piece('c_viper')));
  // 前線でなければ防御を比べない：竜騎士 ⊇ 騎士 は後ろのマスだけ
  assert.ok(!dominates(c.piece('c_dragoon'), c.piece('c_knight')));
  assert.ok(dominates(c.piece('c_dragoon'), c.piece('c_knight'), { ignoreDef: true }));
  done();
});

test('① 1マスを下位互換に替えるだけの変更を見分ける', () => {
  const c = v1();
  const t = golem();
  assert.ok(isDowngrade(t, [2, 2], 'i_blade', 'i_sword', c));
  assert.ok(!isDowngrade(t, [2, 2], 'i_sword', 'i_blade', c));
  done();
});

test('② 隣にキャラがいない道具は効かない。外しても戦闘は変わらない', () => {
  const c = v1();
  const t = { name: 't', board: 'honeycomb', slots: [{ pos: [1, 2], pieceId: 'c_wolf' }, { pos: [3, 4], pieceId: 'i_sword' }], relics: [] };
  assert.ok(!itemLive(t, [3, 4], c.piece('i_sword'), c));
  const cleaned = removeDeadItems(t, c);
  assert.equal(cleaned.slots.length, 1);
  const foe = golem();
  for (const seed of [1, 2, 3]) {
    const a = runBattle(t, foe, c, { seed });
    const b = runBattle(cleaned, foe, c, { seed });
    assert.equal(a.time, b.time);
    assert.equal(a.hp.a, b.hp.a);
  }
  done();
});

test('③ 防御だけの道具は、隣が前線以外のキャラだけなら効かない', () => {
  const c = v1();
  // 2行目の前線を (2,1) の毒蛇にし、(3,3) を空ける。(3,3) の隣は (2,3)・(3,2) の毒蛇で、どちらも前線でない
  const t = golem();
  t.slots = t.slots.filter((s) => !['2,1', '3,3'].includes(s.pos.join()));
  t.slots.push({ pos: [2, 1], pieceId: 'c_viper' });
  assert.ok(!itemLive(t, [3, 3], c.piece('i_armor'), c));
  // 攻撃もある槍は効く
  assert.ok(itemLive(t, [3, 3], c.piece('i_spear'), c));
  // 前線 (2,1) の隣 (2,2) なら効く
  const u = { ...t, slots: t.slots.filter((s) => s.pos.join() !== '2,2') };
  assert.ok(itemLive(u, [2, 2], c.piece('i_armor'), c));
  done();
});

test('④ 浮いたコストで足せる安全な道具があれば、切り落とす。足した形は同じか強い', () => {
  const c = v1();
  assert.ok(!safeToAdd(c.piece('i_blade'))); // 攻撃を上げる道具は足さない（麻痺の狙いが変わりうる）
  assert.ok(safeToAdd(c.piece('i_shield')));
  const t = { name: 't', board: 'honeycomb', slots: [{ pos: [1, 2], pieceId: 'c_behemoth' }], relics: ['r_totem'] };
  assert.ok(isPrunable(t, c));
  const add = safeAddition(t, c);
  assert.ok(add);
  const full = canonicalize(t, c);
  assert.deepEqual(validateTeam(full, c), []);
  assert.ok(!isPrunable(full, c));
  done();
});

test('探索で作るチームは、ルールに合い、切り落としに当たらない', () => {
  const c = v1();
  const space = createSpace(c);
  const rng = createRng(7);
  const made = [];
  for (let i = 0; i < 200; i++) {
    const t = space.random(rng);
    if (t) made.push(t);
  }
  for (let i = 0; i < 200; i++) {
    const t = space.mutate(made[i % made.length], rng, made);
    if (t) made.push(t);
  }
  assert.ok(made.length > 300);
  for (const t of made) {
    assert.deepEqual(validateTeam(t, c), []);
    assert.ok(!isPrunable(t, c), teamKey(t));
    assert.match(descriptor(t, c), /^(square|honeycomb|pentagram)\|c\d+\|i\d+\|/);
  }
  // すぐ近くの候補もルールに合う
  for (const t of space.neighborhood(golem())) assert.deepEqual(validateTeam(t, c), []);
  done();
});

test('すぐ近くには「持っている駒を3マスに増やす」変更も入る（1マスずつでは弱くなって届かない形）', () => {
  const c = v1();
  const goal = canonicalize(golem(), c);
  const from = { ...goal, slots: goal.slots.map((s) => (['1,3', '2,1', '3,1'].includes(s.pos.join()) ? { ...s, pieceId: 'c_viper' } : s)) };
  const keys = new Set();
  for (const t of createSpace(c).neighborhood(canonicalize(from, c), { pairs: true })) keys.add(teamKey(t));
  assert.ok(keys.has(teamKey(goal)));
  done();
});

test('ナッシュ均衡：じゃんけんは3つを等しく、上位互換があれば下位を使わない', () => {
  const rps = [[0.5, 1, 0], [0, 0.5, 1], [1, 0, 0.5]];
  const r = solveNash(rps);
  for (const w of r.weights) assert.ok(Math.abs(w - 1 / 3) < 0.03, String(w));
  assert.ok(r.exploit < 0.02);
  const dom = [[0.5, 0.8, 0.9], [0.2, 0.5, 0.6], [0.1, 0.4, 0.5]];
  const d = solveNash(dom);
  assert.ok(d.weights[0] > 0.97);
});
