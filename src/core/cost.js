import { BALANCE } from '../data/balance.js';
import { EFFECT_TYPES } from '../data/effects.js';

// コスト計算（spec §6）。係数は src/data/balance.js にある。

// 0.2 * 5 のような浮動小数の誤差で ceil が1つ上がらないようにする。
const ceil = (x) => Math.ceil(x - 1e-9);

export function effectCost(e) {
  const c = BALANCE.cost;
  switch (e.type) {
    case 'poison':
      return c.poison * e.stacks * e.chance;
    case 'paralyze':
      return c.paralyze * e.chance;
    case 'adjAtkMult':
      return c.adjAtkMult * e.mult;
    case 'heal':
      return (c.heal * e.amount) / e.interval;
    case 'rowBuff': {
      // 基準キャラ（HP300・攻撃30・防御30・速度1）1体への効きめを、同じ行の想定人数ぶん数える
      const add = e.mode === 'add';
      const gain = {
        hp: (add ? e.value : e.value * 300) / c.hp,
        atk: (add ? e.value : e.value * 30) / c.atkSpd,
        def: (add ? e.value : e.value * 30) / c.def,
        spd: (e.value * 30) / c.atkSpd,
      }[e.stat] ?? 0;
      return c.rowBuff * gain;
    }
    default:
      return 0;
  }
}

// コストの内訳。画面で「どの値がいくら効いているか」を見せるために使う。
export function costBreakdown(piece) {
  const c = BALANCE.cost;
  const parts = piece.kind === 'character'
    ? [
      { label: 'HP', value: piece.hp / c.hp },
      { label: '攻撃×攻撃速度', value: (piece.atk * piece.spd) / c.atkSpd },
      { label: '防御', value: piece.def / c.def },
    ]
    : [
      { label: '攻撃', value: piece.atk / c.itemAtk },
      { label: '防御', value: piece.def / c.itemDef },
    ];
  for (const e of piece.effects ?? []) {
    parts.push({ label: EFFECT_TYPES[e.type]?.name ?? e.type, value: effectCost(e) });
  }
  const raw = parts.reduce((sum, p) => sum + p.value, 0);
  const priced = c.scale * raw ** c.curve;
  const units = priced / c.step;
  return { parts, raw, priced, total: Math.max(c.step, (c.ceil ? ceil(units) : Math.round(units)) * c.step) };
}

export const pieceCost = (piece) => costBreakdown(piece).total;
