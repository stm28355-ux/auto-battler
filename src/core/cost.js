import { EFFECT_TYPES } from '../data/effects.js';

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

// コストの内訳。画面で「どの値がいくら効いているか」を見せるために使う。
export function costBreakdown(piece) {
  const parts = piece.kind === 'character'
    ? [
      { label: 'HP', value: piece.hp / 400 },
      { label: '攻撃×攻撃速度', value: (piece.atk * piece.spd) / 40 },
      { label: '防御', value: piece.def / 50 },
    ]
    : [
      { label: '攻撃', value: piece.atk / 20 },
      { label: '防御', value: piece.def / 25 },
    ];
  for (const e of piece.effects ?? []) {
    parts.push({ label: EFFECT_TYPES[e.type]?.name ?? e.type, value: effectCost(e) });
  }
  const raw = parts.reduce((sum, p) => sum + p.value, 0);
  return { parts, raw, total: Math.max(1, ceil(raw)) };
}

export const pieceCost = (piece) => costBreakdown(piece).total;
