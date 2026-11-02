// 種族シナジー（spec §4）。bonuses のキーは必要な体数。満たしている最大の段階だけが効く。
// scope: 'tribe' はその種族のキャラだけ、'team' はチーム全体に効く。
// 5体・7体は、マスの多いボード（ペンタグラム）で同じ種族を揃える利点のための段階。

export const TRIBES = {
  warrior: {
    name: '戦士',
    color: '#d9644a',
    bonuses: {
      2: [{ type: 'statBuff', stat: 'def', value: 15, mode: 'add', scope: 'tribe' }],
      3: [{ type: 'statBuff', stat: 'def', value: 30, mode: 'add', scope: 'tribe' }],
      5: [{ type: 'statBuff', stat: 'def', value: 50, mode: 'add', scope: 'tribe' }],
      7: [{ type: 'statBuff', stat: 'def', value: 75, mode: 'add', scope: 'tribe' }],
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
      2: [{ type: 'statBuff', stat: 'spd', value: 0.12, mode: 'pct', scope: 'tribe' }],
      3: [{ type: 'statBuff', stat: 'spd', value: 0.18, mode: 'pct', scope: 'tribe' }],
      5: [{ type: 'statBuff', stat: 'spd', value: 0.22, mode: 'pct', scope: 'tribe' }],
      7: [{ type: 'statBuff', stat: 'spd', value: 0.28, mode: 'pct', scope: 'tribe' }],
    },
  },
  machine: {
    name: '機械',
    color: '#4a90c2',
    bonuses: {
      2: [{ type: 'statBuff', stat: 'hp', value: 0.1, mode: 'pct', scope: 'team' }],
      3: [{ type: 'statBuff', stat: 'hp', value: 0.2, mode: 'pct', scope: 'team' }],
      5: [{ type: 'statBuff', stat: 'hp', value: 0.35, mode: 'pct', scope: 'team' }],
      7: [{ type: 'statBuff', stat: 'hp', value: 0.5, mode: 'pct', scope: 'team' }],
    },
  },
  // 中立：1体から効く。この分の強さは、中立のキャラのコストには入れない（他の種族のようにシナジーで補わないため）。
  neutral: {
    name: '中立',
    color: '#b8b08a',
    bonuses: {
      1: [{ type: 'statBuff', stat: 'atk', value: 0.1, mode: 'pct', scope: 'tribe' }],
    },
  },
};
