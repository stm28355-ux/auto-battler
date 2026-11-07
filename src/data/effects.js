import { TRIBES } from './tribes.js';

// 特殊効果の種類（spec §5）。on は付けられる駒の種類（relic は遺物、[] は種族ボーナス専用）。
// legacy: 過去の環境（Ver.1）の駒だけが使う効果。駒作成では選べないが、読み込み・戦闘はできる。
export const EFFECT_TYPES = {
  poison: { name: '毒', on: ['character', 'item'] },
  paralyze: { name: '麻痺', on: ['character', 'item'] },
  curse: { name: '呪い', on: ['character', 'item'] },
  pierce: { name: '防御貫通', on: ['character', 'item'] },
  adjBuff: { name: '隣接効果', on: ['character', 'item'] },
  rowBuff: { name: '行効果', on: ['character', 'item'] },
  teamBuff: { name: '全体効果', on: ['character', 'item'] },
  heal: { name: '回復', on: ['character', 'item', 'relic'] },
  pulse: { name: '定期付与', on: ['character', 'item'] },
  lifesteal: { name: '吸血', on: ['character'] }, // Ver.3
  cellBuff: { name: 'マスの強化', on: ['relic'] }, // Ver.3
  poisonChance: { name: '毒の確率', on: ['relic'] }, // Ver.3
  rally: { name: '号令', on: ['character', 'relic'] }, // Ver.3：開始から決まった秒数だけ、味方を強くする
  cure: { name: '手当て', on: ['character', 'item'] }, // Ver.3：一定時間ごとに、味方の毒を減らし、麻痺を1体解く
  lifestealAura: { name: '吸血を配る', on: ['character'] }, // Ver.3：隣のキャラに吸血を付ける
  venomAtk: { name: '毒で攻撃+', on: ['character'] }, // Ver.3：相手の毒の蓄積1ごとに、自分の攻撃が上がる
  itemAmp: { name: '道具を磨く', on: ['character'] }, // Ver.3：隣の道具の攻撃・防御を強くする
  adjAtkMult: { name: '隣接攻撃倍率', on: ['character', 'item'], legacy: true },
  statBuff: { name: 'ステータス強化', on: ['relic'] },
  fullRowBuff: { name: '3体の行の強化', on: ['relic'] },
  poisonBonus: { name: '毒付与量', on: ['relic'] },
  paralyzeBonus: { name: '麻痺時間', on: ['relic'] },
  poisonResist: { name: '毒軽減', on: ['relic'] },
  regen: { name: '再生', on: ['relic'] },
};

// 攻撃が当たったときに相手へ付く効果（道具が持つと、隣のキャラの攻撃に付く）
export const ON_HIT_TYPES = new Set(['poison', 'paralyze', 'curse']);

export const PARALYZE_TARGETS = {
  front: '前線',
  random: 'ランダム',
  fastest: '攻撃速度が最も高い敵',
  strongest: '攻撃が最も高い敵',
  row: '前線と同じ行の全員',
  all: '全員',
};

// 定期付与で付けられる状態異常。amount は毒なら付与量、呪いなら秒数。
export const PULSE_STATUS = { poison: '毒', curse: '呪い' };

export const STAT_NAMES = { hp: 'HP', atk: '攻撃', def: '防御', spd: '攻撃速度' };
export const BUFF_MODES = { add: '固定値', pct: '割合(%)' };
// 号令で上げられる値・道具を磨くで上げられる値
export const RALLY_STATS = { atk: '攻撃', spd: '攻撃速度' };
export const AMP_STATS = { atk: '攻撃', def: '防御' };

// 能力値を上げる効果（隣接・行・全体）。同じ形 { stat, mode, value } を持つ。
export const BUFF_TYPES = new Set(['adjBuff', 'rowBuff', 'teamBuff']);
const BUFF_RANGE = { adjBuff: '隣のキャラ', rowBuff: '同じ行のキャラ', teamBuff: '味方のキャラ全員' };

const pct = (x) => `${Math.round(x * 100)}%`;
const chanceText = (chance) => (chance >= 1 ? '' : `${pct(chance)}で`);
const buffValue = (e) => (e.mode === 'pct' ? pct(e.value) : e.value);

function scopeText(e) {
  if (e.tribe) return TRIBES[e.tribe]?.name ?? e.tribe;
  return e.scope === 'tribe' ? '同種族' : 'チーム全体';
}

export function describeEffect(e) {
  switch (e.type) {
    case 'poison':
      return `攻撃時 ${chanceText(e.chance)}毒+${e.stacks}`;
    case 'paralyze':
      return `攻撃時 ${chanceText(e.chance)}麻痺${e.duration}秒（${PARALYZE_TARGETS[e.target]}）`;
    case 'curse':
      return `攻撃時 ${chanceText(e.chance)}呪い${e.duration}秒`;
    case 'pierce':
      return `防御貫通${pct(e.value)}`;
    case 'adjBuff':
    case 'rowBuff':
      return `${BUFF_RANGE[e.type]}の${STAT_NAMES[e.stat]}+${buffValue(e)}`;
    case 'teamBuff':
      // tribe があれば、その種族のキャラだけ（Ver.3）
      return `${e.tribe ? `味方の${TRIBES[e.tribe]?.name ?? e.tribe}` : BUFF_RANGE.teamBuff}の${STAT_NAMES[e.stat]}+${buffValue(e)}`;
    case 'rally':
      return `開始から${e.duration}秒、${e.tribe ? `味方の${TRIBES[e.tribe]?.name ?? e.tribe}` : '味方のキャラ全員'}の${STAT_NAMES[e.stat]}+${pct(e.value)}`;
    case 'cure':
      return `${e.interval}秒ごとに、味方の毒-${e.poison}・麻痺を1体解く`;
    case 'lifestealAura':
      return `隣のキャラに吸血${pct(e.value)}を付ける`;
    case 'venomAtk':
      return `相手の毒の蓄積1ごとに攻撃+${e.value}`;
    case 'itemAmp':
      return `隣の道具の${STAT_NAMES[e.stat]}+${pct(e.value)}`;
    case 'adjAtkMult':
      return `隣接キャラの攻撃倍率+${pct(e.mult)}`;
    case 'heal':
      return `${e.interval}秒ごとにHP+${e.amount}`;
    case 'pulse':
      return e.status === 'curse'
        ? `${e.interval}秒ごとに相手へ呪い${e.amount}秒`
        : `${e.interval}秒ごとに相手へ毒+${e.amount}`;
    case 'lifesteal':
      return `攻撃で与えたダメージの${pct(e.value)}だけHP回復`;
    case 'cellBuff':
      return `マス(${e.pos.join(',')})のキャラの${STAT_NAMES[e.stat]}+${buffValue(e)}`;
    case 'poisonChance':
      return `確率のある攻撃時の毒の確率+${pct(e.value)}`;
    case 'statBuff':
      return `${scopeText(e)}の${STAT_NAMES[e.stat]}+${buffValue(e)}`;
    case 'fullRowBuff':
      return `キャラが3体以上いる行の${STAT_NAMES[e.stat]}+${buffValue(e)}`;
    case 'poisonBonus':
      return `毒付与量+${e.value}`;
    case 'paralyzeBonus':
      return `麻痺の時間+${e.value}秒`;
    case 'poisonResist':
      return `受ける毒ダメージ-${pct(e.value)}`;
    case 'regen':
      return `毎秒、最大HPの${Math.round(e.value * 1000) / 10}%回復`;
    default:
      return `不明な効果（${e.type}）`;
  }
}
