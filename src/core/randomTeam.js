import { BOARDS, neighbors, posKey } from '../data/boards.js';
import { RELICS } from '../data/relics.js';
import { MAX_RELICS } from './team.js';
import { pieceCost } from './cost.js';

const shuffle = (list, rng) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ルールを満たすランダムなチームを作る（バランス調整のシミュレーション用）。
//   1. 道具の数を決め、残りのマスにキャラクターを置く。
//   2. 道具は、隣にキャラクターが多いマスから置く（道具は隣のキャラクターに効くので、人が組むときと同じ考え方）。
//   1マスに使うコストは、「残りの予算 ÷ 残りのマス数」のまわり（spread 倍まで、floor 倍以上）にする。
//   高い駒で予算を使い切って空きマスだらけになったり、安い駒ばかりで予算が余ったりして、
//   ボードごとの予算の使い方に差が出ないようにするため。遺物は0〜3個。
export function randomTeam(boardId, pieces, rng, { itemRate = 0.3, spread = 1.4, floor = 0.7 } = {}) {
  const board = BOARDS[boardId];
  const costs = new Map(pieces.map((p) => [p.id, pieceCost(p)]));
  const byKind = (kind) => pieces.filter((p) => p.kind === kind);
  const cells = shuffle(board.cells, rng);

  const itemCount = cells.slice(1).filter(() => rng() < itemRate).length;
  const charCells = cells.slice(0, cells.length - itemCount);
  const itemCells = cells.slice(cells.length - itemCount);

  const slots = [];
  let budget = board.costCap;
  const pick = (kind, min, max) => {
    const fits = byKind(kind).filter((p) => costs.get(p.id) <= Math.min(budget, max) && costs.get(p.id) >= min);
    return fits.length ? fits[Math.floor(rng() * fits.length)] : null;
  };
  const place = (pos, piece) => {
    budget -= costs.get(piece.id);
    slots.push({ pos, pieceId: piece.id });
  };

  // キャラクター：道具の分のコストを少し残して、1マスごとの予算に合わせて選ぶ
  const reserve = itemCount * 3;
  charCells.forEach((pos, i) => {
    const share = Math.max(0, budget - reserve) / (charCells.length - i);
    const piece = pick('character', Math.max(1, Math.floor(share * floor)), Math.max(2, Math.round(share * spread)));
    if (piece) place(pos, piece);
  });
  // 条件に合う駒がなくてキャラクターが0体になったときは、いちばん安いキャラクターを置く
  if (!slots.length) {
    const cheapest = byKind('character').reduce((a, b) => (costs.get(b.id) < costs.get(a.id) ? b : a));
    place(charCells[0], cheapest);
  }

  // 道具：効く相手が多いマスに置く。防御の道具は、攻撃を受ける前線のキャラの隣が価値が高い。
  const chars = new Set(slots.map((s) => posKey(s.pos)));
  const frontOfRow = new Map();
  for (const { pos } of slots) {
    if (!frontOfRow.has(pos[0]) || pos[1] < frontOfRow.get(pos[0])) frontOfRow.set(pos[0], pos[1]);
  }
  const isFront = (pos) => frontOfRow.get(pos[0]) === pos[1];
  const value = (piece, pos) => neighbors(boardId, pos)
    .filter((n) => chars.has(posKey(n)))
    .reduce((sum, n) => sum + 1 + (piece.def > 0 && isFront(n) ? 2 : 0), 0);

  let open = shuffle(itemCells, rng);
  for (let i = 0; i < itemCells.length; i++) {
    const share = budget / (itemCells.length - i);
    const piece = pick('item', 1, Math.max(2, Math.round(share * spread)));
    if (!piece) continue;
    const best = open.reduce((a, b) => (value(piece, b) > value(piece, a) ? b : a));
    open = open.filter((pos) => pos !== best);
    place(best, piece);
  }

  const relics = shuffle(RELICS, rng).slice(0, Math.floor(rng() * (MAX_RELICS + 1))).map((r) => r.id);
  return { name: 'ランダム', board: boardId, slots, relics };
}
