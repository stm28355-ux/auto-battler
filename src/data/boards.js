// 座標は [行, 列]。列が小さいほど前（敵側）。

export const posKey = ([r, c]) => `${r},${c}`;

// ペンタグラムの三角形の向き。(1,3) が △ で、隣のマスと交互に入れ替わる。
export const triangleUp = (r, c) => (r + c) % 2 === 0;

export const BOARDS = {
  pentagram: {
    id: 'pentagram',
    name: 'ペンタグラム',
    shape: 'triangle',
    costCap: 49,
    cells: [
      [1, 3],
      [2, 1], [2, 2], [2, 3], [2, 4], [2, 5],
      [3, 1], [3, 2], [3, 3], [3, 4], [3, 5],
      [4, 3],
    ],
  },
  square: {
    id: 'square',
    name: 'スクエア',
    shape: 'square',
    costCap: 53,
    cells: [
      [1, 1], [1, 2], [1, 3],
      [2, 1], [2, 2], [2, 3],
      [3, 1], [3, 2], [3, 3],
    ],
  },
  honeycomb: {
    id: 'honeycomb',
    name: 'ハニカム',
    shape: 'hex',
    costCap: 55,
    cells: [
      [1, 2], [1, 4],
      [2, 1], [2, 3], [2, 5],
      [3, 2], [3, 4],
    ],
  },
};

const ADJACENT = {
  square: (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1,
  honeycomb: (a, b) => {
    const dr = Math.abs(a[0] - b[0]);
    const dc = Math.abs(a[1] - b[1]);
    return (dr === 0 && dc === 2) || (dr === 1 && dc === 1);
  },
  // 横は同じ行で列±1。縦は「上が△・下が▽」で同じ列のときだけ辺を共有する。
  pentagram: (a, b) => {
    if (a[0] === b[0]) return Math.abs(a[1] - b[1]) === 1;
    if (a[1] !== b[1] || Math.abs(a[0] - b[0]) !== 1) return false;
    const upper = a[0] < b[0] ? a : b;
    return triangleUp(upper[0], upper[1]);
  },
};

const neighborMaps = Object.fromEntries(
  Object.values(BOARDS).map((board) => {
    const map = new Map();
    for (const a of board.cells) {
      map.set(posKey(a), board.cells.filter((b) => posKey(a) !== posKey(b) && ADJACENT[board.id](a, b)));
    }
    return [board.id, map];
  }),
);

export function neighbors(boardId, pos) {
  return neighborMaps[boardId].get(posKey(pos)) ?? [];
}

export function isCell(boardId, pos) {
  return neighborMaps[boardId].has(posKey(pos));
}

export function boardRows(boardId) {
  return [...new Set(BOARDS[boardId].cells.map(([r]) => r))].sort((a, b) => a - b);
}
