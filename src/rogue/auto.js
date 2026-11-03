import { BOARDS, neighbors, posKey } from '../data/boards.js';
import { pieceCost } from '../core/cost.js';

// 持っている駒から、おまかせでチームを組む（挑戦を始めたときの最初の編成と、難易度を測るツールで使う）。
//   コストの高い駒を優先し、マスの3割までを道具にする。
//   キャラは前（列の小さいマス）から、硬い駒の順に置く。道具は、隣にキャラが多いマスに置く。
//   counts: { 駒のID: 持っている数 }
export function autoTeam(boardId, counts, catalog, name = 'おまかせ') {
  const board = BOARDS[boardId];
  const owned = Object.entries(counts).flatMap(([id, n]) => (catalog.piece(id) ? Array(n).fill(catalog.piece(id)) : []));
  const byValue = (a, b) => pieceCost(b) - pieceCost(a) || (b.hp ?? 0) - (a.hp ?? 0);
  const chars = owned.filter((p) => p.kind === 'character').sort(byValue);
  const items = owned.filter((p) => p.kind === 'item').sort(byValue);
  const cells = board.cells.length;
  const nChars = Math.min(chars.length, cells - Math.min(items.length, Math.floor(cells * 0.3)));
  const nItems = Math.min(items.length, cells - nChars);

  const order = [...board.cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const tough = (p) => (p.hp ?? 0) + (p.def ?? 0) * 8;
  const slots = chars.slice(0, nChars).sort((a, b) => tough(b) - tough(a))
    .map((p, i) => ({ pos: order[i], pieceId: p.id }));
  const used = new Set(slots.map((s) => posKey(s.pos)));
  for (const p of items.slice(0, nItems)) {
    const open = order.filter((pos) => !used.has(posKey(pos)));
    const near = (pos) => neighbors(boardId, pos).filter((n) => slots.some((s) => posKey(s.pos) === posKey(n) && catalog.piece(s.pieceId).kind === 'character')).length;
    const best = open.reduce((a, b) => (near(b) > near(a) ? b : a));
    used.add(posKey(best));
    slots.push({ pos: best, pieceId: p.id });
  }
  return { name, board: boardId, slots, relics: [] };
}
