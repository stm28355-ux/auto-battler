// 種族シナジー（spec §4）。bonuses のキーは必要な体数。
// scope: 'tribe' はその種族のキャラだけ、'team' はチーム全体に効く。

export const TRIBES = {
  warrior: {
    name: '戦士',
    color: '#d9644a',
    bonuses: {
      2: [{ type: 'statBuff', stat: 'def', value: 15, mode: 'add', scope: 'tribe' }],
      3: [{ type: 'statBuff', stat: 'def', value: 30, mode: 'add', scope: 'tribe' }],
    },
  },
  mage: {
    name: '魔導',
    color: '#9b6ad6',
    bonuses: {
      2: [{ type: 'poisonBonus', value: 1 }],
      3: [{ type: 'poisonBonus', value: 1.5 }],
    },
  },
  beast: {
    name: '獣',
    color: '#6aa84f',
    bonuses: {
      2: [{ type: 'statBuff', stat: 'spd', value: 0.15, mode: 'pct', scope: 'tribe' }],
      3: [{ type: 'statBuff', stat: 'spd', value: 0.22, mode: 'pct', scope: 'tribe' }],
    },
  },
  machine: {
    name: '機械',
    color: '#4a90c2',
    bonuses: {
      2: [{ type: 'statBuff', stat: 'hp', value: 0.1, mode: 'pct', scope: 'team' }],
      3: [{ type: 'statBuff', stat: 'hp', value: 0.2, mode: 'pct', scope: 'team' }],
    },
  },
};
