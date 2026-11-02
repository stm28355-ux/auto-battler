import { EFFECT_TYPES, PARALYZE_TARGETS } from '../data/effects.js';
import { TRIBES } from '../data/tribes.js';

// 駒作成で入力できる範囲（spec §3）。
export const STAT_RANGES = {
  character: { hp: [100, 1000], atk: [10, 100], def: [0, 100], spd: [0.5, 3.0] },
  item: { atk: [0, 100], def: [0, 100] },
};

export const MAX_EFFECTS = 2;

const inRange = (v, [min, max]) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// '__proto__' や 'constructor' のような名前を、辞書のキーとして通さない。
const has = (dict, key) => typeof key === 'string' && Object.hasOwn(dict, key);

function validateEffect(e, kind) {
  const type = has(EFFECT_TYPES, e?.type) ? EFFECT_TYPES[e.type] : null;
  if (!type) return `不明な効果です（${e?.type}）`;
  if (!type.on.includes(kind)) return `${type.name}はこの駒に付けられません`;
  switch (e.type) {
    case 'poison':
      if (!Number.isInteger(e.stacks) || e.stacks < 1 || e.stacks > 10) return '毒の付与量は1〜10の整数にしてください';
      if (!inRange(e.chance, [0, 1])) return '毒の確率は0〜1にしてください';
      break;
    case 'paralyze':
      if (!has(PARALYZE_TARGETS, e.target)) return `麻痺の対象が不正です（${e.target}）`;
      if (!inRange(e.duration, [0.1, 30])) return '麻痺の秒数は0.1〜30にしてください';
      if (!inRange(e.chance, [0, 1])) return '麻痺の確率は0〜1にしてください';
      break;
    case 'adjAtkMult':
      if (!inRange(e.mult, [0, 5])) return '攻撃倍率は0〜5にしてください';
      break;
    case 'heal':
      if (!inRange(e.amount, [1, 1000])) return '回復量は1〜1000にしてください';
      if (!inRange(e.interval, [0.1, 30])) return '回復間隔は0.1〜30秒にしてください';
      break;
  }
  return null;
}

// エラーメッセージの配列を返す。空なら正しい駒。
export function validatePiece(piece) {
  const errors = [];
  const ranges = has(STAT_RANGES, piece?.kind) ? STAT_RANGES[piece.kind] : null;
  if (!ranges) return [`駒の種類が不正です（${piece?.kind}）`];
  if (typeof piece.id !== 'string' || !piece.id) errors.push('IDがありません');
  if (typeof piece.name !== 'string' || !piece.name) errors.push('名前がありません');
  for (const [stat, range] of Object.entries(ranges)) {
    if (!inRange(piece[stat], range)) errors.push(`${stat} は ${range[0]}〜${range[1]} にしてください`);
  }
  if (piece.kind === 'character' && !has(TRIBES, piece.tribe)) errors.push(`種族が不正です（${piece.tribe}）`);
  const effects = piece.effects ?? [];
  if (!Array.isArray(effects) || effects.length > MAX_EFFECTS) errors.push(`特殊効果は${MAX_EFFECTS}個までです`);
  else for (const e of effects) {
    const err = validateEffect(e, piece.kind);
    if (err) errors.push(err);
  }
  return errors;
}
