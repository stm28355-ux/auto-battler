import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, NEUTRAL_BALANCE, setBalance, useBalance } from '../src/data/balance.js';
import { BOARDS } from '../src/data/boards.js';
import { createCatalog } from '../src/core/catalog.js';
import { randomTeam } from '../src/core/randomTeam.js';
import { validateTeam } from '../src/core/team.js';
import { createRng } from '../src/engine/rng.js';
import { brief, problems, report, simulate, summarize } from '../tools/balance.js';

const catalog = createCatalog();

test('ランダムチームは、どのボードでもルールを満たす（キャラ1体以上・コスト上限内）', () => {
  const rng = createRng(1);
  for (const board of Object.keys(BOARDS)) {
    for (let i = 0; i < 300; i++) {
      const team = randomTeam(board, catalog.pieces(), rng);
      assert.deepEqual(validateTeam(team, catalog), [], `${board} #${i}`);
    }
  }
});

test('ランダムチームは同じ乱数なら同じチームになる', () => {
  const make = () => randomTeam('honeycomb', catalog.pieces(), createRng(5));
  assert.deepEqual(make(), make());
});

test('シミュレーションは同じ種なら同じ結果で、集計の数字が揃っている', () => {
  const a = summarize(simulate({ matches: 200, seed: 3 }).rows);
  const b = summarize(simulate({ matches: 200, seed: 3 }).rows);
  assert.equal(a.time.mean, b.time.mean);
  assert.equal(a.matches, 200);
  assert.equal(a.reasons.ko + a.reasons.simultaneous + a.reasons.timeout, 200);
  assert.ok(a.time.p10 <= a.time.median && a.time.median <= a.time.p90);
  assert.ok(a.poisonShare >= 0 && a.poisonShare <= 1);
  const games = [...a.boards.values()].reduce((s, r) => s + r.games, 0);
  assert.equal(games, 400); // 1戦に2チーム
  assert.equal(typeof brief(a), 'string');
  assert.match(report(a, catalog), /決着時間/);
  assert.ok(Array.isArray(problems(a)));
});

test('プリセット同士の総当たりもシミュレーションできる', () => {
  const { rows } = simulate({ matches: 1, seed: 1, mode: 'presets' });
  assert.equal(rows.length, 9 * 8);
});

test('調整用の数値は setBalance / useBalance で差し替えられ、存在しない設定は拒否する', () => {
  const saved = structuredClone(BALANCE);
  try {
    setBalance('cost.def', 99);
    assert.equal(BALANCE.cost.def, 99);
    setBalance('poisonDuration', 5);
    assert.equal(BALANCE.poisonDuration, 5);
    assert.throws(() => setBalance('cost.nothing', 1), /知らない設定/);
    assert.throws(() => setBalance('nothing.def', 1), /知らない設定/);
    assert.throws(() => setBalance('__proto__.x', 1), /知らない設定/);
    useBalance(NEUTRAL_BALANCE);
    assert.deepEqual(BALANCE, NEUTRAL_BALANCE);
  } finally {
    useBalance(saved);
  }
});

test('調整後の数値は、目標（決着時間 8〜12秒、ボードの勝率 40〜60%）に収まっている', () => {
  const summary = summarize(simulate({ matches: 4000, seed: 7 }).rows);
  assert.ok(summary.time.mean >= 8 && summary.time.mean <= 12, `平均 ${summary.time.mean.toFixed(1)}秒`);
  for (const [id, r] of summary.boards) {
    const rate = (r.win + r.draw / 2) / r.games;
    assert.ok(rate > 0.4 && rate < 0.6, `${id} ${(rate * 100).toFixed(1)}%`);
  }
  assert.ok(summary.reasons.timeout / summary.matches < 0.03);
});
