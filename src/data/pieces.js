// 初期の駒（spec §3）。コストは src/core/cost.js で自動計算する。
// 道具の「攻撃時」効果は、隣接するキャラクターの攻撃に付与される。

export const CHARACTERS = [
  // 戦士
  { id: 'c_squire', kind: 'character', name: '見習い剣士', icon: '🗡️', tribe: 'warrior', hp: 220, atk: 25, def: 20, spd: 1.0, effects: [] },
  { id: 'c_knight', kind: 'character', name: '騎士', icon: '🤺', tribe: 'warrior', hp: 450, atk: 25, def: 60, spd: 0.8, effects: [] },
  { id: 'c_berserker', kind: 'character', name: '狂戦士', icon: '🪓', tribe: 'warrior', hp: 300, atk: 55, def: 10, spd: 1.2, effects: [] },
  // 魔導
  { id: 'c_apprentice', kind: 'character', name: '見習い魔導士', icon: '🔮', tribe: 'mage', hp: 160, atk: 20, def: 10, spd: 1.0,
    effects: [{ type: 'poison', stacks: 1, chance: 0.8 }] },
  { id: 'c_hexer', kind: 'character', name: '呪術師', icon: '🧪', tribe: 'mage', hp: 240, atk: 15, def: 20, spd: 1.2,
    effects: [{ type: 'poison', stacks: 2, chance: 0.8 }] },
  { id: 'c_sorcerer', kind: 'character', name: '雷術師', icon: '⚡', tribe: 'mage', hp: 220, atk: 40, def: 10, spd: 0.8,
    effects: [{ type: 'paralyze', target: 'fastest', duration: 3, chance: 0.4 }] },
  // 獣
  { id: 'c_wolf', kind: 'character', name: '狼', icon: '🐺', tribe: 'beast', hp: 180, atk: 20, def: 10, spd: 2.0, effects: [] },
  { id: 'c_bear', kind: 'character', name: '熊', icon: '🐻', tribe: 'beast', hp: 500, atk: 35, def: 25, spd: 0.7, effects: [] },
  { id: 'c_viper', kind: 'character', name: '毒蛇', icon: '🐍', tribe: 'beast', hp: 150, atk: 15, def: 5, spd: 2.2,
    effects: [{ type: 'poison', stacks: 1, chance: 0.4 }] },
  // 機械
  { id: 'c_drone', kind: 'character', name: '偵察機', icon: '🛸', tribe: 'machine', hp: 150, atk: 20, def: 20, spd: 1.5, effects: [] },
  { id: 'c_golem', kind: 'character', name: 'ゴーレム', icon: '🗿', tribe: 'machine', hp: 700, atk: 20, def: 40, spd: 0.6, effects: [] },
  { id: 'c_medibot', kind: 'character', name: '修理ロボ', icon: '🔧', tribe: 'machine', hp: 250, atk: 10, def: 30, spd: 0.8,
    effects: [{ type: 'heal', amount: 15, interval: 1 }] },

  // 上級（コスト4〜）。マスが少なくコスト上限の高いボード（ハニカムなど）で、上限を使い切るための駒。
  { id: 'c_dragoon', kind: 'character', name: '竜騎士', icon: '🐉', tribe: 'warrior', hp: 600, atk: 60, def: 50, spd: 1.0, effects: [] },
  { id: 'c_general', kind: 'character', name: '将軍', icon: '👑', tribe: 'warrior', hp: 650, atk: 55, def: 50, spd: 1.0,
    effects: [{ type: 'adjAtkMult', mult: 0.25 }] },
  { id: 'c_archmage', kind: 'character', name: '大魔導士', icon: '🧙', tribe: 'mage', hp: 400, atk: 40, def: 20, spd: 1.0,
    effects: [{ type: 'poison', stacks: 2, chance: 1 }] },
  { id: 'c_behemoth', kind: 'character', name: '古の巨獣', icon: '🦣', tribe: 'beast', hp: 900, atk: 45, def: 40, spd: 0.9, effects: [] },
  { id: 'c_fighter', kind: 'character', name: '戦闘機', icon: '✈️', tribe: 'machine', hp: 450, atk: 55, def: 40, spd: 1.3, effects: [] },

  // 追加（各種族6体まで）。行効果を持つ駒を含む。
  { id: 'c_paladin', kind: 'character', name: '聖騎士', icon: '⚜️', tribe: 'warrior', hp: 500, atk: 35, def: 45, spd: 0.9,
    effects: [{ type: 'rowBuff', stat: 'def', mode: 'add', value: 10 }] },
  { id: 'c_witch', kind: 'character', name: '魔女', icon: '🧹', tribe: 'mage', hp: 200, atk: 25, def: 10, spd: 1.1,
    effects: [{ type: 'poison', stacks: 1, chance: 0.6 }, { type: 'rowBuff', stat: 'atk', mode: 'pct', value: 0.1 }] },
  { id: 'c_oracle', kind: 'character', name: '預言者', icon: '👁️', tribe: 'mage', hp: 260, atk: 20, def: 15, spd: 1.0,
    effects: [{ type: 'rowBuff', stat: 'atk', mode: 'add', value: 8 }] },
  { id: 'c_boar', kind: 'character', name: '猪', icon: '🐗', tribe: 'beast', hp: 350, atk: 32, def: 15, spd: 1.1, effects: [] },
  { id: 'c_hawk', kind: 'character', name: '鷹', icon: '🦅', tribe: 'beast', hp: 200, atk: 25, def: 5, spd: 1.6,
    effects: [{ type: 'rowBuff', stat: 'spd', mode: 'pct', value: 0.1 }] },
  { id: 'c_turret', kind: 'character', name: '砲台', icon: '🗼', tribe: 'machine', hp: 300, atk: 45, def: 30, spd: 0.8, effects: [] },
  { id: 'c_reactor', kind: 'character', name: '動力炉', icon: '🔋', tribe: 'machine', hp: 500, atk: 15, def: 35, spd: 0.7,
    effects: [{ type: 'rowBuff', stat: 'hp', mode: 'pct', value: 0.1 }] },

  // 中立（シナジーで攻撃+10%が付くので、能力はやや控えめ）。後ろの駒ほど高コストで強い。
  { id: 'c_elf', kind: 'character', name: 'エルフ', icon: '🧝', tribe: 'neutral', hp: 220, atk: 25, def: 10, spd: 1.2, effects: [] },
  { id: 'c_dwarf', kind: 'character', name: 'ドワーフ', icon: '⛏️', tribe: 'neutral', hp: 450, atk: 35, def: 40, spd: 0.9,
    effects: [{ type: 'rowBuff', stat: 'def', mode: 'add', value: 8 }] },
  { id: 'c_fiend', kind: 'character', name: '魔人', icon: '👹', tribe: 'neutral', hp: 700, atk: 55, def: 40, spd: 1.1, effects: [] },
];

export const ITEMS = [
  { id: 'i_sword', kind: 'item', name: '鉄の剣', icon: '⚔️', atk: 25, def: 0, effects: [] },
  { id: 'i_shield', kind: 'item', name: '木の盾', icon: '🛡️', atk: 0, def: 55, effects: [] },
  { id: 'i_spear', kind: 'item', name: '槍', icon: '🔱', atk: 15, def: 18, effects: [] },
  { id: 'i_gear', kind: 'item', name: '歯車', icon: '⚙️', atk: 10, def: 25, effects: [] },
  { id: 'i_banner', kind: 'item', name: '軍旗', icon: '🚩', atk: 0, def: 0,
    effects: [{ type: 'adjAtkMult', mult: 0.5 }] },
  { id: 'i_vial', kind: 'item', name: '毒瓶', icon: '☠️', atk: 0, def: 0,
    effects: [{ type: 'poison', stacks: 1, chance: 0.6 }] },
  { id: 'i_stungun', kind: 'item', name: 'スタンガン', icon: '🔌', atk: 0, def: 0,
    effects: [{ type: 'paralyze', target: 'front', duration: 3, chance: 0.4 }] },
  { id: 'i_potion', kind: 'item', name: '回復薬', icon: '🧴', atk: 0, def: 0,
    effects: [{ type: 'heal', amount: 18, interval: 1 }] },

  // 上級
  { id: 'i_blade', kind: 'item', name: '魔剣', icon: '🗡️', atk: 60, def: 0, effects: [] },
  { id: 'i_armor', kind: 'item', name: '聖鎧', icon: '🥋', atk: 0, def: 95, effects: [] },
  { id: 'i_crown', kind: 'item', name: '王冠', icon: '💎', atk: 0, def: 0,
    effects: [{ type: 'adjAtkMult', mult: 0.8 }] },
];
