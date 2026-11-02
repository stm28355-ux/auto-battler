import { EFFECT_TYPES, PARALYZE_TARGETS, PULSE_STATUS, STAT_NAMES } from '../data/effects.js';
import { TRIBES } from '../data/tribes.js';

// 駒作成で入力できる範囲（spec §3）。遊びとして、1つの値だけでもコスト上限（いちばん高いボード）まで上げられる広さにする。
// 強すぎる駒はコストが上限を超えて置けなくなるので、範囲で強さを抑える必要はない。
export const STAT_RANGES = {
  character: { hp: [100, 5000], atk: [10, 300], def: [0, 800], spd: [0.3, 5.0] },
  item: { atk: [0, 200], def: [0, 400] },
};
// 特殊効果の数値の上限
export const EFFECT_MAX = { stacks: 30, seconds: 30, buffPct: 2, buffAdd: 300, buffAddHp: 3000 };

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
      if (!Number.isInteger(e.stacks) || e.stacks < 1 || e.stacks > EFFECT_MAX.stacks) return `毒の付与量は1〜${EFFECT_MAX.stacks}の整数にしてください`;
      if (!inRange(e.chance, [0, 1])) return '毒の確率は0〜1にしてください';
      break;
    case 'paralyze':
      if (!has(PARALYZE_TARGETS, e.target)) return `麻痺の対象が不正です（${e.target}）`;
      if (!inRange(e.duration, [0.1, 30])) return '麻痺の秒数は0.1〜30にしてください';
      if (!inRange(e.chance, [0, 1])) return '麻痺の確率は0〜1にしてください';
      break;
    case 'curse':
      if (!inRange(e.duration, [0.5, EFFECT_MAX.seconds])) return `呪いの秒数は0.5〜${EFFECT_MAX.seconds}にしてください`;
      if (!inRange(e.chance, [0, 1])) return '呪いの確率は0〜1にしてください';
      break;
    case 'pierce':
      if (!inRange(e.value, [0.05, 1])) return '防御貫通は5〜100%にしてください';
      break;
    case 'adjAtkMult':
      if (!inRange(e.mult, [0, 5])) return '攻撃倍率は0〜5にしてください';
      break;
    case 'adjBuff':
    case 'rowBuff':
    case 'teamBuff': {
      const name = type.name;
      if (!has(STAT_NAMES, e.stat)) return `${name}の対象ステータスが不正です（${e.stat}）`;
      if (e.mode !== 'add' && e.mode !== 'pct') return `${name}は固定値(add)か割合(pct)にしてください`;
      if (e.mode === 'add' && e.stat === 'spd') return `${name}で攻撃速度は割合のみ指定できます`;
      if (!inRange(e.value, e.mode === 'pct' ? [0.01, EFFECT_MAX.buffPct] : [1, e.stat === 'hp' ? EFFECT_MAX.buffAddHp : EFFECT_MAX.buffAdd])) {
        return e.mode === 'pct'
          ? `${name}の割合は1〜${EFFECT_MAX.buffPct * 100}%にしてください`
          : `${name}の固定値が範囲外です（HP 1〜${EFFECT_MAX.buffAddHp}、攻撃・防御 1〜${EFFECT_MAX.buffAdd}）`;
      }
      break;
    }
    case 'heal':
      if (!inRange(e.amount, [1, 1000])) return '回復量は1〜1000にしてください';
      if (!inRange(e.interval, [0.1, 30])) return '回復間隔は0.1〜30秒にしてください';
      break;
    case 'pulse':
      if (!has(PULSE_STATUS, e.status)) return `定期付与の状態異常が不正です（${e.status}）`;
      if (e.status === 'poison' && (!Number.isInteger(e.amount) || e.amount < 1 || e.amount > EFFECT_MAX.stacks)) return `定期付与の毒の量は1〜${EFFECT_MAX.stacks}の整数にしてください`;
      if (e.status === 'curse' && !inRange(e.amount, [0.5, EFFECT_MAX.seconds])) return `定期付与の呪いの秒数は0.5〜${EFFECT_MAX.seconds}にしてください`;
      if (!inRange(e.interval, [0.5, 30])) return '定期付与の間隔は0.5〜30秒にしてください';
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
