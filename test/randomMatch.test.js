import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_TEAMS, TIERS } from '../src/data/presetTeams.js';
import { BOARDS } from '../src/data/boards.js';
import { createCatalog } from '../src/core/catalog.js';
import { createRecord, pickOpponent } from '../src/core/randomMatch.js';
import { teamCost, validateTeam } from '../src/core/team.js';
import { runBattle } from '../src/engine/battle.js';
import { createRng } from '../src/engine/rng.js';
import { createTeamStore, listBattleTeams, memoryStorage } from '../src/storage/teamStore.js';

const catalog = createCatalog();
const pool = PRESET_TEAMS.map((team) => ({ id: `preset:${team.id}`, team }));

test('プリセット：IDが重ならず、ボードごとに ふつう・つよい がある（やさしいはない）', () => {
  assert.equal(new Set(PRESET_TEAMS.map((t) => t.id)).size, PRESET_TEAMS.length);
  for (const t of PRESET_TEAMS) assert.ok(Object.hasOwn(TIERS, t.tier) && t.tier !== 'easy', t.id);
  for (const board of Object.keys(BOARDS)) {
    for (const tier of ['normal', 'hard']) {
      assert.ok(PRESET_TEAMS.some((t) => t.board === board && t.tier === tier), `${board} ${tier}`);
    }
  }
});

test('プリセットはすべて対戦に使え、コストをほぼ使い切る（上限の85%以上）', () => {
  for (const t of PRESET_TEAMS) {
    assert.deepEqual(validateTeam(t, catalog), [], t.id);
    assert.ok(teamCost(t, catalog) >= BOARDS[t.board].costCap * 0.85, `${t.id} ${teamCost(t, catalog)}`);
  }
});

test('強さを指定すると、その強さの中から引く', () => {
  const rng = createRng(1);
  for (let i = 0; i < 50; i++) assert.equal(pickOpponent(pool, 'hard', rng).team.tier, 'hard');
  const seen = new Set(Array.from({ length: 200 }, () => pickOpponent(pool, 'normal', rng).team.board));
  assert.deepEqual([...seen].sort(), ['honeycomb', 'pentagram', 'square']); // 3つのボードが偏りなく出る
});

test('おまかせなら全体から引き、すべてのチームが出る', () => {
  const rng = createRng(2);
  const seen = new Set(Array.from({ length: 500 }, () => pickOpponent(pool, 'any', rng).id));
  assert.equal(seen.size, PRESET_TEAMS.length);
});

test('直前の相手は避けるが、候補が1つだけなら同じ相手でもよい。候補がなければ null', () => {
  const rng = createRng(3);
  for (let i = 0; i < 100; i++) assert.notEqual(pickOpponent(pool, 'any', rng, 'preset:p_square_knights').id, 'preset:p_square_knights');
  const one = [pool[0]];
  assert.equal(pickOpponent(one, 'any', rng, pool[0].id).id, pool[0].id);
  assert.equal(pickOpponent([], 'any', rng), null);
  assert.equal(pickOpponent(one, 'hard', rng), null);
});

test('同じ乱数なら同じ相手が選ばれる', () => {
  const draw = (seed) => Array.from({ length: 10 }, ((rng) => () => pickOpponent(pool, 'any', rng).id)(createRng(seed)));
  assert.deepEqual(draw(9), draw(9));
});

test('戦績の集計（自分＝A側）', () => {
  const record = createRecord();
  assert.equal(record.total, 0);
  for (const winner of ['a', 'a', 'b', 'draw', 'a']) record.add(winner);
  assert.deepEqual([record.win, record.loss, record.draw, record.total], [3, 1, 1, 5]);
});

test('対戦で選べるチームには強さが表示され、保存チームは強さを持たない', () => {
  const store = createTeamStore(memoryStorage());
  store.save(0, PRESET_TEAMS[0]);
  const list = listBattleTeams(store);
  assert.match(list[0].label, /プリセット・ふつう/);
  assert.equal(list.at(-1).id, 'slot:0');
  assert.equal(list.at(-1).team.tier, undefined); // ランダムマッチの相手にはならない
});

test('どのプリセット同士でも30秒以内に決着する（バランスはPhase 7で調整）', () => {
  for (const a of PRESET_TEAMS) {
    for (const b of PRESET_TEAMS) {
      const r = runBattle(a, b, catalog, { seed: 1 });
      assert.ok(r.time > 0 && r.time <= 30, `${a.id} vs ${b.id}`);
    }
  }
});
