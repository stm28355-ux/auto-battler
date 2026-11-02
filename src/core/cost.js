// コスト計算（spec §6）。係数は Phase 7 で調整する。

// 0.2 * 5 のような浮動小数の誤差で ceil が1つ上がらないようにする。
const ceil = (x) => Math.ceil(x - 1e-9);

export function effectCost(e) {
  switch (e.type) {
    case 'poison':
      return 0.5 * e.stacks * e.chance;
    case 'paralyze':
      return 1.0 * e.chance;
    case 'adjAtkMult':
      return 5 * e.mult;
    case 'heal':
      return e.amount / e.interval / 10;
    default:
      return 0;
  }
}

export function pieceCost(piece) {
  const effects = (piece.effects ?? []).reduce((sum, e) => sum + effectCost(e), 0);
  const raw = piece.kind === 'character'
    ? piece.hp / 400 + (piece.atk * piece.spd) / 40 + piece.def / 50 + effects
    : piece.atk / 20 + piece.def / 25 + effects;
  return Math.max(1, ceil(raw));
}
