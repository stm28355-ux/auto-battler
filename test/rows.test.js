import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../src/core/catalog.js';
import { calcRowCount, fillRows, foldOf, rowStats } from '../src/core/rows.js';
import { validatePiece } from '../src/core/piece.js';
import { activeSynergies } from '../src/core/team.js';
import { TRIBES } from '../src/data/tribes.js';
import { createBattle, runBattle } from '../src/engine/battle.js';
import { resolveTeam } from '../src/engine/resolve.js';
import { BALANCE, NEUTRAL_BALANCE, useBalance } from '../src/data/balance.js';
import { parsePieceJson } from '../src/storage/pieceJson.js';

useBalance(NEUTRAL_BALANCE);

const ch = (id, o = {}) => ({ id, kind: 'character', name: id, icon: '?', tribe: 'warrior', hp: 1000, atk: 10, def: 0, spd: 1, effects: [], ...o });
const team = (board, slots, relics = []) => ({ name: 't', board, slots: slots.map(([pos, pieceId]) => ({ pos, pieceId })), relics });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('ペンタグラムの行は、他のボードと向かい合うときだけ4行→3行に換算される', () => {
  assert.deepEqual(foldOf('pentagram', 'square', 2), [[1, 0.5], [2, 0.5]]);
  assert.deepEqual(foldOf('pentagram', 'honeycomb', 4), [[3, 1]]);
  assert.deepEqual(foldOf('pentagram', 'pentagram', 2), [[2, 1]]);
  assert.deepEqual(foldOf('square', 'pentagram', 3), [[3, 1]]);
  assert.equal(calcRowCount('pentagram', 'pentagram'), 4);
  assert.equal(calcRowCount('pentagram', 'square'), 3);
  assert.equal(calcRowCount('square', 'pentagram'), 3);
});

test('計算行ごとの攻撃（割合で分配）と防御（割合で加重平均）', () => {
  const catalog = createCatalog([ch('A', { atk: 20, def: 10, tribe: 'warrior' }), ch('B', { atk: 40, def: 30, tribe: 'mage' }), ch('C', { atk: 60, def: 50, tribe: 'beast' }), ch('D', { atk: 80, def: 70, tribe: 'machine' })]);
  const t = team('pentagram', [[[1, 3], 'A'], [[2, 1], 'B'], [[3, 1], 'C'], [[4, 3], 'D']]);
  const units = resolveTeam(t, catalog).units;
  const rows = rowStats(units, 'pentagram', 'square');
  assert.equal(rows.length, 3);
  close(rows[0].atk, 20 + 40 * 0.5); // 1行 ×1 + 2行 ×0.5
  close(rows[1].atk, 40 * 0.5 + 60 * 0.5);
  close(rows[2].atk, 60 * 0.5 + 80);
  close(rows[0].def, (10 * 1 + 30 * 0.5) / 1.5);
  close(rows[1].def, (30 + 50) / 2);
  close(rows[2].def, (50 * 0.5 + 70 * 1) / 1.5);
  // 同じペンタグラムどうしなら4行のまま
  const same = rowStats(units, 'pentagram', 'pentagram');
  assert.deepEqual(same.map((r) => r.atk), [20, 40, 60, 80]);
  assert.deepEqual(same.map((r) => r.def), [10, 30, 50, 70]);
});

test('前線のない計算行は、いちばん近い計算行で代用する（同じ距離なら小さい行）', () => {
  const catalog = createCatalog([ch('A', { def: 10 }), ch('B', { def: 90, tribe: 'mage' })]);
  const t = team('square', [[[1, 1], 'A'], [[3, 1], 'B']]);
  const rows = fillRows(rowStats(resolveTeam(t, catalog).units, 'square', 'square'));
  assert.equal(rows[1].def, 10);
});

test('戦闘：ペンタグラムの2行目の攻撃は、スクエアの1行目と2行目へ半分ずつ当たる', () => {
  const catalog = createCatalog([ch('P', { atk: 100 }), ch('S', { def: 0, tribe: 'mage' }), ch('S2', { def: 0, tribe: 'beast' })]);
  const a = team('pentagram', [[[2, 1], 'P']]);
  const b = team('square', [[[1, 1], 'S'], [[2, 1], 'S2']]);
  const battle = createBattle(a, b, catalog, { log: true });
  for (let i = 0; i < 20; i++) battle.advance(); // 1秒＝1回攻撃
  const hits = battle.events.filter((e) => e.type === 'attack' && e.side === 'a');
  assert.equal(hits.length, 2);
  assert.deepEqual(hits.map((h) => h.to), [[1, 1], [2, 1]]);
  close(hits[0].dmg, 50);
  close(hits[1].dmg, 50);
});

test('戦闘：スクエアの攻撃は、ペンタグラムの2つの行の前線の防御を平均した値で受ける', () => {
  const catalog = createCatalog([ch('S', { atk: 100 }), ch('P1', { def: 0, tribe: 'mage' }), ch('P2', { def: 100, tribe: 'beast' })]);
  const a = team('square', [[[1, 1], 'S']]);
  const b = team('pentagram', [[[1, 3], 'P1'], [[2, 1], 'P2']]);
  const battle = createBattle(a, b, catalog, { log: true });
  for (let i = 0; i < 20; i++) battle.advance();
  const hit = battle.events.find((e) => e.type === 'attack' && e.side === 'a');
  close(hit.dmg, (100 * 100) / (100 + (0 * 1 + 100 * 0.5) / 1.5));
  assert.deepEqual(hit.to, [1, 3]); // 割合のいちばん大きい前線（1行目）
});

test('行効果：同じ行のキャラクターに固定値・割合で加算される', () => {
  const buffer = ch('B', { hp: 100, effects: [{ type: 'rowBuff', stat: 'atk', mode: 'add', value: 10 }, { type: 'rowBuff', stat: 'hp', mode: 'pct', value: 0.5 }] });
  const catalog = createCatalog([buffer, ch('X', { atk: 20, hp: 200 })]);
  const t = team('square', [[[1, 1], 'B'], [[1, 2], 'X'], [[2, 1], 'X']]);
  const [b, x1, x2] = resolveTeam(t, catalog).units;
  assert.equal(b.atk, 20); // 自分にも効く（10 + 10）
  assert.equal(x1.atk, 30);
  assert.equal(x2.atk, 20); // 別の行には効かない
  assert.equal(x1.hp, 300);
  assert.equal(x2.hp, 200);
});

test('行効果の検査とJSON', () => {
  const ok = ch('u_a', { effects: [{ type: 'rowBuff', stat: 'def', mode: 'add', value: 10 }] });
  assert.deepEqual(validatePiece(ok), []);
  for (const bad of [
    { stat: 'spd', mode: 'add', value: 1 }, { stat: 'luck', mode: 'add', value: 1 }, { stat: 'atk', mode: 'x', value: 1 },
    { stat: 'atk', mode: 'pct', value: 5 }, { stat: 'atk', mode: 'add', value: 0 }, { stat: 'hp', mode: 'add', value: 501 },
    { stat: 'atk', mode: 'add', value: Infinity },
  ]) assert.notDeepEqual(validatePiece(ch('u_b', { effects: [{ type: 'rowBuff', ...bad }] })), [], JSON.stringify(bad));
  const text = JSON.stringify({ format: 'auto-battler/piece', version: 1, piece: { ...ok, effects: [{ type: 'rowBuff', stat: 'def', mode: 'add', value: 10, evil: 1 }] } });
  assert.deepEqual(parsePieceJson(text).pieces[0].effects, [{ type: 'rowBuff', stat: 'def', mode: 'add', value: 10 }]);
});

test('シナジーに5体・7体の段階があり、中立は1体から効く', () => {
  useBalance();
  try {
    for (const [id, tribe] of Object.entries(TRIBES)) {
      const tiers = Object.keys(tribe.bonuses).map(Number);
      if (id === 'neutral') assert.deepEqual(tiers, [1], id);
      else assert.deepEqual(tiers, [2, 3, 5, 7], id);
    }
    const catalog = createCatalog();
    const t = team('pentagram', [[[1, 3], 'c_wolf'], [[2, 1], 'c_bear'], [[2, 2], 'c_viper'], [[2, 3], 'c_boar'], [[2, 4], 'c_hawk'], [[3, 1], 'c_elf']]);
    const syn = Object.fromEntries(activeSynergies(t, catalog).map((s) => [s.tribe, s.tier]));
    assert.deepEqual(syn, { beast: 5, neutral: 1 });
    const [unit] = resolveTeam(team('square', [[[1, 1], 'c_elf']]), catalog).units;
    close(unit.atk, 25 * 1.1);
  } finally {
    useBalance(NEUTRAL_BALANCE);
  }
});

test('各種族のキャラは6体、中立は3体', () => {
  const catalog = createCatalog();
  const count = {};
  for (const p of catalog.pieces()) if (p.kind === 'character') count[p.tribe] = (count[p.tribe] ?? 0) + 1;
  assert.deepEqual(count, { warrior: 6, mage: 6, beast: 6, machine: 6, neutral: 3 });
});
