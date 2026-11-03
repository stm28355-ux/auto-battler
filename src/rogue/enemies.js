import { BOARDS } from '../data/boards.js';
import { TRIBES } from '../data/tribes.js';
import { randomTeam } from '../core/randomTeam.js';
import { ENEMY, floorKind } from './config.js';

// 層ごとの敵（spec §15）。同じシード・同じ層からは、いつも同じ敵ができる。
//   普通：ランダムなチーム。遺物はランダム1種 × 十の位（1〜9層はなし）
//   強敵：普通より多いコスト。遺物はランダム3種 × (十の位 + 1)
//   ボス：1つの種族でそろえたチーム（シナジーが効く）。遺物はすべて × (層 ÷ 10)

export const enemyBudget = (floor, kind = floorKind(floor)) =>
  Math.round((ENEMY.base + ENEMY.perFloor * floor) * (kind === 'boss' ? ENEMY.bossMult : kind === 'strong' ? ENEMY.strongMult : 1));

export const enemyRelicStacks = (floor, kind = floorKind(floor)) => {
  const tens = Math.floor(floor / 10);
  return kind === 'boss' ? tens : kind === 'strong' ? tens + 1 : tens;
};

const stack = (ids, n) => ids.flatMap((id) => Array(n).fill(id));

export function createEnemy(floor, rng, { pieces, relics }) {
  const kind = floorKind(floor);
  const boards = Object.keys(BOARDS);
  const board = boards[Math.floor(rng() * boards.length)];
  const costCap = Math.min(enemyBudget(floor, kind), BOARDS[board].cells.length * ENEMY.cellMax);
  const n = enemyRelicStacks(floor, kind);
  if (kind === 'boss') {
    const tribe = ENEMY.bossTribes[Math.floor(rng() * ENEMY.bossTribes.length)];
    const pool = pieces.filter((p) => p.kind === 'item' || p.tribe === tribe);
    const team = randomTeam(board, pool, rng, { costCap, relicPool: [] });
    return { ...team, name: `第${floor}層の主（${TRIBES[tribe].name}）`, relics: stack(relics.map((r) => r.id), n) };
  }
  const team = randomTeam(board, pieces, rng, { costCap, relicPool: [] });
  const left = relics.map((r) => r.id);
  const picked = [];
  while (picked.length < (kind === 'strong' ? 3 : 1) && left.length) picked.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  return { ...team, name: `第${floor}層の${kind === 'strong' ? '強敵' : 'バトラー'}`, relics: stack(picked, n) };
}
