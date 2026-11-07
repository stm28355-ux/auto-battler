// 遺物（spec §3。Ver.3）。マスを使わずコストなし、1チーム3つまで。

export const RELICS = [
  { id: 'r_whetstone', name: '砥石', icon: '🪨',
    effects: [{ type: 'statBuff', stat: 'atk', value: 5, mode: 'add', scope: 'team' }] },
  { id: 'r_amulet', name: '守りの護符', icon: '🧿',
    effects: [{ type: 'statBuff', stat: 'def', value: 10, mode: 'add', scope: 'team' }] },
  { id: 'r_hourglass', name: '砂時計', icon: '⏳',
    effects: [{ type: 'statBuff', stat: 'spd', value: 0.08, mode: 'pct', scope: 'team' }] },
  { id: 'r_heart', name: '生命の結晶', icon: '💎',
    effects: [{ type: 'statBuff', stat: 'hp', value: 0.1, mode: 'pct', scope: 'team' }] },
  { id: 'r_warhorn', name: '戦の角笛', icon: '📯',
    // Ver.3：歯車の心臓（機械のHP）と分けるため号令にした。5秒・+50% では戦士の速攻が強すぎたので弱くし、8秒でもまだ速攻が強かったので6秒にした
    effects: [{ type: 'rally', stat: 'atk', value: 0.2, duration: 6, tribe: 'warrior' }] },
  { id: 'r_grimoire', name: '魔導書', icon: '📕',
    effects: [{ type: 'statBuff', stat: 'atk', value: 0.3, mode: 'pct', scope: 'team', tribe: 'mage' }] },
  { id: 'r_totem', name: '獣のトーテム', icon: '🪶',
    effects: [{ type: 'statBuff', stat: 'spd', value: 0.15, mode: 'pct', scope: 'team', tribe: 'beast' }] },
  { id: 'r_spring', name: '癒しの泉', icon: '⛲',
    effects: [{ type: 'heal', amount: 20, interval: 1 }] },
  { id: 'r_gearheart', name: '歯車の心臓', icon: '🫀',
    effects: [{ type: 'statBuff', stat: 'hp', value: 0.15, mode: 'pct', scope: 'team', tribe: 'machine' }] },
  { id: 'r_thunder', name: '雷の宝珠', icon: '🔆',
    effects: [{ type: 'paralyzeBonus', value: 1 }] },
  { id: 'r_phalanx', name: '方陣の旗', icon: '🏳️',
    effects: [{ type: 'fullRowBuff', stat: 'atk', value: 0.1, mode: 'pct' }, { type: 'fullRowBuff', stat: 'def', value: 10, mode: 'add' }] },
  { id: 'r_lone', name: '孤高の紋章', icon: '🎖️',
    // マス(2,3)（どのボードにもある中央寄りのマス）のキャラの全能力値。15% では王冠・魔剣と重なってエースが強すぎた（Ver.3 で 8%）
    effects: ['hp', 'atk', 'def', 'spd'].map((stat) => ({ type: 'cellBuff', pos: [2, 3], stat, value: 0.08, mode: 'pct' })) },
  // 対策用（耐久の構成が、毒を少し入れた相手に負けないための枠。毒を主軸にした構成には勝てない強さにする）
  { id: 'r_antidote', name: '解毒の聖水', icon: '💧',
    effects: [{ type: 'poisonResist', value: 0.2 }, { type: 'poisonChance', value: 0.1 }] },
];
