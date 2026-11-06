import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { LATEST, applyEnvironment } from '../src/data/environment.js';
import { createCatalog } from '../src/core/catalog.js';
import { pieceCost } from '../src/core/cost.js';
import { randomTeam } from '../src/core/randomTeam.js';
import { runBattle } from '../src/engine/battle.js';
import { createRng } from '../src/engine/rng.js';

// 固定した過去の環境（Ver.1・Ver.2）は、新しい環境の仕組みを足しても結果が変わらないこと。
// ランダムなチームどうしの対戦の結果と、駒のコストをまとめた指紋で確かめる。
// 指紋が変わったら、新しい仕組みがバランス値の項目で切り替わっているか（過去の環境では使われないか）を見直す。
const FROZEN = {
  v1: '076658e2950aeec5',
  v2: 'bfe720038c254716',
};

function fingerprint(envId) {
  applyEnvironment(envId);
  const catalog = createCatalog();
  const pieces = catalog.pieces();
  const rng = createRng(12345);
  const boards = ['pentagram', 'square', 'honeycomb'];
  const h = createHash('sha256');
  h.update(pieces.map((p) => `${p.id}:${pieceCost(p)}`).join(','));
  for (let i = 0; i < 150; i++) {
    const a = randomTeam(boards[i % 3], pieces, rng);
    const b = randomTeam(boards[(i + 1 + (i % 2)) % 3], pieces, rng);
    const r = runBattle(a, b, catalog, { seed: i + 1 });
    h.update(`${r.winner}|${r.time}|${r.hp.a.toFixed(6)}|${r.hp.b.toFixed(6)};`);
  }
  return h.digest('hex').slice(0, 16);
}

test('固定した環境の結果が変わらない', () => {
  try {
    for (const [id, want] of Object.entries(FROZEN)) {
      const got = fingerprint(id);
      if (process.env.PRINT_FROZEN) console.log(id, got);
      assert.equal(got, want, `${id} の結果が変わりました`);
    }
  } finally {
    applyEnvironment(LATEST.id);
  }
});
