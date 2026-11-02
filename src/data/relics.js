// 遺物（spec §3）。マスを使わずコストなし、1チーム3つまで。

export const RELICS = [
  { id: 'r_whetstone', name: '砥石', icon: '🪨',
    effects: [{ type: 'statBuff', stat: 'atk', value: 5, mode: 'add', scope: 'team' }] },
  { id: 'r_amulet', name: '守りの護符', icon: '🧿',
    effects: [{ type: 'statBuff', stat: 'def', value: 10, mode: 'add', scope: 'team' }] },
  { id: 'r_hourglass', name: '砂時計', icon: '⏳',
    effects: [{ type: 'statBuff', stat: 'spd', value: 0.1, mode: 'pct', scope: 'team' }] },
  { id: 'r_heart', name: '生命の結晶', icon: '💎',
    effects: [{ type: 'statBuff', stat: 'hp', value: 0.1, mode: 'pct', scope: 'team' }] },
  { id: 'r_warhorn', name: '戦の角笛', icon: '📯',
    effects: [{ type: 'statBuff', stat: 'atk', value: 0.15, mode: 'pct', scope: 'team', tribe: 'warrior' }] },
  { id: 'r_grimoire', name: '魔導書', icon: '📕',
    effects: [{ type: 'statBuff', stat: 'atk', value: 0.2, mode: 'pct', scope: 'team', tribe: 'mage' }] },
  { id: 'r_totem', name: '獣のトーテム', icon: '🪶',
    effects: [{ type: 'statBuff', stat: 'spd', value: 0.15, mode: 'pct', scope: 'team', tribe: 'beast' }] },
  { id: 'r_spring', name: '癒しの泉', icon: '⛲',
    effects: [{ type: 'heal', amount: 10, interval: 1 }] },
];
