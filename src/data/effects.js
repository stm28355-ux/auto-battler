import { TRIBES } from './tribes.js';

// 特殊効果の種類（spec §5）。on は付けられる駒の種類。
export const EFFECT_TYPES = {
  poison: { name: '毒', on: ['character', 'item'] },
  paralyze: { name: '麻痺', on: ['character', 'item'] },
  adjAtkMult: { name: '隣接攻撃倍率', on: ['character', 'item'] },
  heal: { name: '回復', on: ['character', 'item', 'relic'] },
  statBuff: { name: 'ステータス強化', on: ['relic'] },
  poisonBonus: { name: '毒付与量', on: [] }, // 種族ボーナス専用
};

export const PARALYZE_TARGETS = {
  front: '前線',
  random: 'ランダム',
  fastest: '攻撃速度が最も高い敵',
  strongest: '攻撃が最も高い敵',
};

export const STAT_NAMES = { hp: 'HP', atk: '攻撃', def: '防御', spd: '攻撃速度' };

const pct = (x) => `${Math.round(x * 100)}%`;
const chanceText = (chance) => (chance >= 1 ? '' : `${pct(chance)}で`);

function scopeText(e) {
  if (e.tribe) return TRIBES[e.tribe].name;
  return e.scope === 'tribe' ? '同種族' : 'チーム全体';
}

export function describeEffect(e) {
  switch (e.type) {
    case 'poison':
      return `攻撃時 ${chanceText(e.chance)}毒+${e.stacks}`;
    case 'paralyze':
      return `攻撃時 ${chanceText(e.chance)}麻痺${e.duration}秒（${PARALYZE_TARGETS[e.target]}）`;
    case 'adjAtkMult':
      return `隣接キャラの攻撃倍率+${pct(e.mult)}`;
    case 'heal':
      return `${e.interval}秒ごとにHP+${e.amount}`;
    case 'statBuff': {
      const value = e.mode === 'pct' ? pct(e.value) : e.value;
      return `${scopeText(e)}の${STAT_NAMES[e.stat]}+${value}`;
    }
    case 'poisonBonus':
      return `毒付与量+${e.value}`;
    default:
      return `不明な効果（${e.type}）`;
  }
}
