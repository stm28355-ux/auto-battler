// 種族シナジー（spec §4）。bonuses のキーは必要な体数。満たしている最大の段階だけが効く。
// scope: 'tribe' はその種族のキャラだけ、'team' はチーム全体に効く。
// 5体・7体は、マスの多いボード（ペンタグラム）で同じ種族を揃える利点のための段階。
// 中立だけは「満たした最大の段階」が、いちばん弱い段階になる（少ないほど強い）。

const allStats = (value) => ['hp', 'atk', 'def', 'spd']
  .map((stat) => ({ type: 'statBuff', stat, value, mode: 'pct', scope: 'tribe' }));

export const TRIBES = {
  warrior: {
    name: '戦士',
    color: '#d9644a',
    bonuses: {
      2: [{ type: 'statBuff', stat: 'def', value: 10, mode: 'add', scope: 'tribe' }],
      3: [{ type: 'statBuff', stat: 'def', value: 20, mode: 'add', scope: 'tribe' }],
      5: [{ type: 'statBuff', stat: 'def', value: 30, mode: 'add', scope: 'tribe' }],
      7: [{ type: 'statBuff', stat: 'def', value: 35, mode: 'add', scope: 'tribe' }],
    },
  },
  mage: {
    name: '魔導',
    color: '#9b6ad6',
    bonuses: {
      2: [{ type: 'poisonBonus', value: 1 }],
      3: [{ type: 'poisonBonus', value: 1.5 }],
      5: [{ type: 'poisonBonus', value: 2 }],
      7: [{ type: 'poisonBonus', value: 2.5 }],
    },
  },
  beast: {
    name: '獣',
    color: '#6aa84f',
    bonuses: {
      2: [{ type: 'statBuff', stat: 'spd', value: 0.1, mode: 'pct', scope: 'tribe' }],
      3: [{ type: 'statBuff', stat: 'spd', value: 0.15, mode: 'pct', scope: 'tribe' }],
      5: [{ type: 'statBuff', stat: 'spd', value: 0.18, mode: 'pct', scope: 'tribe' }],
      7: [{ type: 'statBuff', stat: 'spd', value: 0.25, mode: 'pct', scope: 'tribe' }],
    },
  },
  machine: {
    name: '機械',
    color: '#4a90c2',
    bonuses: {
      2: [{ type: 'regen', value: 0.004 }],
      3: [{ type: 'regen', value: 0.008 }],
      5: [{ type: 'regen', value: 0.01 }, { type: 'paralyzeBonus', value: 0.5 }],
      7: [{ type: 'regen', value: 0.015 }, { type: 'paralyzeBonus', value: 1 }],
    },
  },
  // 中立：1体から効き、少ないほど強い（他の種族の構成に1体だけ混ぜる使い方）。
  // この分の強さは、中立のキャラのコストには入れない。
  neutral: {
    name: '中立',
    color: '#b8b08a',
    bonuses: {
      1: allStats(0.2),
      2: allStats(0.1),
      3: allStats(0.05),
    },
  },
};
