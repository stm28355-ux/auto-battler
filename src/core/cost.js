import { BALANCE, EFFECT_COST_DEFAULTS } from '../data/balance.js';
import { EFFECT_TYPES, ON_HIT_TYPES } from '../data/effects.js';

// コスト計算（spec §6）。係数は src/data/balance.js にある。

// 0.2 * 5 のような浮動小数の誤差で ceil が1つ上がらないようにする。
const ceil = (x) => Math.ceil(x - 1e-9);

// 麻痺の対象ごとの重み（何体に効くか）。秒数も数える環境（cost.paralyzeSec がある環境）で使う。
// cost.paralyzeWeight がある環境（Ver.3〜）はその値を使う。
const PARALYZE_WEIGHT = { front: 1, random: 1, fastest: 1.2, strongest: 1.2, row: 2.5, all: 4 };

// 係数。過去の環境のバランス値にない係数（新しい効果のもの）は、既定値を使う。
const coef = () => {
  const c = { ...EFFECT_COST_DEFAULTS };
  for (const [k, v] of Object.entries(BALANCE.cost)) if (v != null || !(k in c)) c[k] = v;
  return c;
};

// 基準キャラ（cost.buffRef。ない環境は HP300・攻撃30・防御30）1体への、能力値を上げる効果の効きめ。速度は1とする
const BUFF_REF = { hp: 300, atk: 30, def: 30 };
function buffGain(e, c) {
  const ref = c.buffRef ?? BUFF_REF;
  const add = e.mode === 'add';
  return {
    hp: (add ? e.value : e.value * ref.hp) / c.hp,
    atk: (add ? e.value : e.value * ref.atk) / c.atkSpd,
    def: (add ? e.value : e.value * ref.def) / c.def,
    // 攻撃速度の固定値（Ver.3〜）は、基準キャラ（速度1）なら同じ割合と同じ。遅く重い駒ほど得なので cost.spdAdd 倍に数える
    spd: ((e.value * ref.atk) / c.atkSpd) * (add ? c.spdAdd ?? 1 : 1),
  }[e.stat] ?? 0;
}

// 能力値を上げる効果が、何体に効くと数えるか（Ver.3〜は cost.receivers で細かく決める）。
//   防御は前線にしか意味がないので、効く人数を少なく数える。道具の行効果は、道具がその行の1マスを使うので少なく数える。
function receivers(e, piece, c) {
  const r = c.receivers;
  if (!r) return c[e.type];
  const kind = piece.kind === 'item' ? 'item' : 'character';
  return r[e.stat]?.[e.type]?.[kind] ?? r[e.stat]?.[e.type]?.any ?? r.any?.[e.type]?.[kind] ?? c[e.type];
}

// piece: 効果を持つ駒。「攻撃時」の効果と防御貫通は、攻撃の回数に比例して効くので、
//   キャラなら攻撃速度倍（cost.onHitSpd がある環境）、道具なら隣のキャラ全員に付くので itemOnHit 倍に数える。
export function effectCost(e, piece = { kind: 'character', spd: 1 }) {
  const c = coef();
  let spread = 1;
  if (ON_HIT_TYPES.has(e.type) || e.type === 'pierce') {
    if (piece.kind === 'item') spread = c.itemOnHit ?? 1;
    else if (c.onHitSpd) spread = piece.spd ?? 1;
  }
  switch (e.type) {
    case 'poison':
      return spread * c.poison * e.stacks * e.chance;
    case 'paralyze':
      return spread * (c.paralyzeSec == null
        ? c.paralyze * e.chance
        : c.paralyzeSec * e.chance * e.duration * ((c.paralyzeWeight ?? PARALYZE_WEIGHT)[e.target] ?? 1));
    case 'curse':
      return spread * c.curse * e.chance * e.duration;
    case 'pierce':
      return spread * c.pierce * e.value;
    case 'adjAtkMult':
      return c.adjAtkMult * e.mult;
    case 'heal':
      return (c.heal * e.amount) / e.interval;
    case 'adjBuff':
    case 'rowBuff':
    case 'teamBuff':
      // 効く人数の想定（隣接・同じ行・全員）を掛ける
      return receivers(e, piece, c) * buffGain(e, c);
    case 'lifesteal':
      // 回復量 ≒ 吸血の割合 × 攻撃 × 攻撃速度（防御で減る分は cost.lifesteal に入れてある）
      return c.lifesteal * e.value * (piece.atk ?? 40) * (piece.spd ?? 1);
    case 'pulse':
      return ((e.status === 'curse' ? c.pulseCurse : c.pulsePoison) * e.amount) / e.interval;
    default:
      return 0;
  }
}

// コストの内訳。画面で「どの値がいくら効いているか」を見せるために使う。
export function costBreakdown(piece) {
  const c = coef();
  const parts = piece.kind === 'character'
    ? [
      { label: 'HP', value: piece.hp / c.hp },
      // 1発ごとに防御を引く環境（cost.atkPow がある環境）では、1発が重いほど防御を抜けるので割高にする
      { label: '攻撃×攻撃速度', value: ((piece.atk * piece.spd) / c.atkSpd) * (c.atkPow ? (piece.atk / c.atkRef) ** c.atkPow : 1) },
      { label: '防御', value: piece.def / c.def },
    ]
    : [
      { label: '攻撃', value: piece.atk / c.itemAtk },
      { label: '防御', value: piece.def / c.itemDef },
    ];
  for (const e of piece.effects ?? []) {
    parts.push({ label: EFFECT_TYPES[e.type]?.name ?? e.type, value: effectCost(e, piece) });
  }
  const raw = parts.reduce((sum, p) => sum + p.value, 0);
  const priced = c.scale * raw ** c.curve;
  const units = priced / c.step;
  return { parts, raw, priced, total: Math.max(c.step, (c.ceil ? ceil(units) : Math.round(units)) * c.step) };
}

export const pieceCost = (piece) => costBreakdown(piece).total;
