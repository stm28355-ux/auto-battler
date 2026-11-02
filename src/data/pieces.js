// 標準の駒（spec §3）。コストは src/core/cost.js で自動計算する。
// 道具の「攻撃時」効果・防御貫通・攻撃・防御は、隣接するキャラクターに付く。
// 種族ごとの役割（Ver.2）：
//   戦士 … HP・防御が高く、攻撃もそこそこある王道
//   魔導 … 毒・呪い・攻撃頻度の低い大火力・防御貫通で崩す
//   獣   … 攻撃・攻撃速度が高い
//   機械 … 回復と麻痺で耐える
//   中立 … 1体でも強い（少ないほどシナジーが強い）
// どのキャラにも、他と使い分ける理由（固有の効果か、はっきりした能力値の偏り）を持たせる。

const buff = (type, stat, mode, value) => ({ type, stat, mode, value });

export const CHARACTERS = [
  // 戦士
  { id: 'c_squire', kind: 'character', name: '見習い剣士', icon: '🗡️', tribe: 'warrior', hp: 240, atk: 30, def: 20, spd: 1.0,
    effects: [buff('rowBuff', 'hp', 'add', 30)] },
  { id: 'c_knight', kind: 'character', name: '騎士', icon: '🤺', tribe: 'warrior', hp: 450, atk: 30, def: 60, spd: 0.8,
    effects: [buff('adjBuff', 'hp', 'pct', 0.1)] },
  { id: 'c_berserker', kind: 'character', name: '狂戦士', icon: '🪓', tribe: 'warrior', hp: 300, atk: 60, def: 10, spd: 1.0,
    effects: [{ type: 'pierce', value: 0.3 }] },
  { id: 'c_paladin', kind: 'character', name: '聖騎士', icon: '⚜️', tribe: 'warrior', hp: 500, atk: 35, def: 45, spd: 0.9,
    effects: [buff('rowBuff', 'def', 'add', 12)] },
  { id: 'c_guard', kind: 'character', name: '重装兵', icon: '🪖', tribe: 'warrior', hp: 700, atk: 20, def: 90, spd: 0.6,
    effects: [buff('adjBuff', 'def', 'add', 10)] },
  { id: 'c_swordmaster', kind: 'character', name: '剣聖', icon: '🥷', tribe: 'warrior', hp: 380, atk: 55, def: 30, spd: 1.0,
    effects: [{ type: 'pierce', value: 0.5 }] },
  { id: 'c_dragoon', kind: 'character', name: '竜騎士', icon: '🐉', tribe: 'warrior', hp: 600, atk: 70, def: 45, spd: 0.8,
    effects: [buff('rowBuff', 'atk', 'pct', 0.1)] },
  { id: 'c_general', kind: 'character', name: '将軍', icon: '👑', tribe: 'warrior', hp: 600, atk: 50, def: 50, spd: 1.0,
    effects: [buff('adjBuff', 'atk', 'pct', 0.25)] },

  // 魔導
  { id: 'c_apprentice', kind: 'character', name: '見習い魔導士', icon: '🔮', tribe: 'mage', hp: 160, atk: 20, def: 10, spd: 1.0,
    effects: [{ type: 'poison', stacks: 1, chance: 0.8 }] },
  { id: 'c_hexer', kind: 'character', name: '呪術師', icon: '🧪', tribe: 'mage', hp: 240, atk: 15, def: 20, spd: 1.2,
    effects: [{ type: 'poison', stacks: 2, chance: 0.8 }] },
  { id: 'c_witch', kind: 'character', name: '魔女', icon: '🧹', tribe: 'mage', hp: 200, atk: 25, def: 10, spd: 1.1,
    effects: [{ type: 'poison', stacks: 1, chance: 0.6 }, buff('rowBuff', 'atk', 'pct', 0.1)] },
  { id: 'c_oracle', kind: 'character', name: '預言者', icon: '👁️', tribe: 'mage', hp: 260, atk: 20, def: 15, spd: 1.0,
    effects: [buff('teamBuff', 'atk', 'add', 5)] },
  { id: 'c_cursemaster', kind: 'character', name: '呪詛師', icon: '💀', tribe: 'mage', hp: 280, atk: 25, def: 20, spd: 1.0,
    effects: [{ type: 'curse', duration: 4, chance: 0.5 }] },
  { id: 'c_sorcerer', kind: 'character', name: '雷術師', icon: '⚡', tribe: 'mage', hp: 300, atk: 150, def: 10, spd: 0.4, effects: [] },
  { id: 'c_pyromancer', kind: 'character', name: '炎術師', icon: '🔥', tribe: 'mage', hp: 300, atk: 110, def: 15, spd: 0.5,
    effects: [{ type: 'pierce', value: 0.5 }] },
  { id: 'c_archmage', kind: 'character', name: '大魔導士', icon: '🧙', tribe: 'mage', hp: 400, atk: 40, def: 20, spd: 1.0,
    effects: [{ type: 'poison', stacks: 2, chance: 1 }] },

  // 獣
  { id: 'c_viper', kind: 'character', name: '毒蛇', icon: '🐍', tribe: 'beast', hp: 150, atk: 15, def: 5, spd: 2.2,
    effects: [{ type: 'poison', stacks: 1, chance: 0.4 }] },
  { id: 'c_wolf', kind: 'character', name: '狼', icon: '🐺', tribe: 'beast', hp: 180, atk: 22, def: 10, spd: 1.8,
    effects: [buff('adjBuff', 'spd', 'pct', 0.1)] },
  { id: 'c_hawk', kind: 'character', name: '鷹', icon: '🦅', tribe: 'beast', hp: 200, atk: 25, def: 5, spd: 1.6,
    effects: [buff('rowBuff', 'spd', 'pct', 0.1)] },
  { id: 'c_leopard', kind: 'character', name: '豹', icon: '🐆', tribe: 'beast', hp: 200, atk: 45, def: 10, spd: 1.5, effects: [] },
  { id: 'c_boar', kind: 'character', name: '猪', icon: '🐗', tribe: 'beast', hp: 350, atk: 40, def: 15, spd: 1.0,
    effects: [{ type: 'pierce', value: 0.3 }] },
  { id: 'c_bear', kind: 'character', name: '熊', icon: '🐻', tribe: 'beast', hp: 550, atk: 40, def: 30, spd: 0.7,
    effects: [buff('rowBuff', 'hp', 'pct', 0.1)] },
  { id: 'c_lion', kind: 'character', name: '獅子', icon: '🦁', tribe: 'beast', hp: 450, atk: 45, def: 25, spd: 1.0,
    effects: [buff('rowBuff', 'atk', 'pct', 0.1)] },
  { id: 'c_behemoth', kind: 'character', name: '古の巨獣', icon: '🦣', tribe: 'beast', hp: 900, atk: 50, def: 40, spd: 0.8,
    effects: [buff('adjBuff', 'atk', 'add', 8)] },

  // 機械
  { id: 'c_drone', kind: 'character', name: '偵察機', icon: '🛸', tribe: 'machine', hp: 180, atk: 20, def: 20, spd: 1.4,
    effects: [{ type: 'paralyze', target: 'random', duration: 2, chance: 0.3 }] },
  { id: 'c_medibot', kind: 'character', name: '修理ロボ', icon: '🔧', tribe: 'machine', hp: 260, atk: 10, def: 30, spd: 0.8,
    effects: [{ type: 'heal', amount: 15, interval: 1 }] },
  { id: 'c_turret', kind: 'character', name: '砲台', icon: '🗼', tribe: 'machine', hp: 320, atk: 80, def: 30, spd: 0.5,
    effects: [{ type: 'pierce', value: 0.5 }] },
  { id: 'c_tesla', kind: 'character', name: '電磁塔', icon: '📡', tribe: 'machine', hp: 350, atk: 20, def: 30, spd: 0.7,
    effects: [{ type: 'paralyze', target: 'row', duration: 2, chance: 0.5 }] },
  { id: 'c_reactor', kind: 'character', name: '動力炉', icon: '🔋', tribe: 'machine', hp: 500, atk: 15, def: 35, spd: 0.7,
    effects: [buff('rowBuff', 'hp', 'pct', 0.1)] },
  { id: 'c_fighter', kind: 'character', name: '戦闘機', icon: '✈️', tribe: 'machine', hp: 420, atk: 50, def: 35, spd: 1.2,
    effects: [{ type: 'paralyze', target: 'front', duration: 1.5, chance: 0.3 }] },
  { id: 'c_workshop', kind: 'character', name: '修理工房', icon: '🏭', tribe: 'machine', hp: 450, atk: 10, def: 35, spd: 0.5,
    effects: [{ type: 'heal', amount: 35, interval: 1 }] },
  { id: 'c_golem', kind: 'character', name: 'ゴーレム', icon: '🗿', tribe: 'machine', hp: 750, atk: 20, def: 50, spd: 0.6,
    effects: [buff('adjBuff', 'def', 'add', 8)] },

  // 中立（シナジーは少ないほど強い：1体 +20%、2体 +10%、3体以上 +5%）
  { id: 'c_elf', kind: 'character', name: 'エルフ', icon: '🧝', tribe: 'neutral', hp: 220, atk: 28, def: 10, spd: 1.3,
    effects: [{ type: 'pierce', value: 0.2 }] },
  { id: 'c_vampire', kind: 'character', name: '吸血鬼', icon: '🧛', tribe: 'neutral', hp: 450, atk: 45, def: 25, spd: 1.1,
    effects: [{ type: 'heal', amount: 12, interval: 1 }] },
  { id: 'c_dwarf', kind: 'character', name: 'ドワーフ', icon: '⛏️', tribe: 'neutral', hp: 450, atk: 35, def: 45, spd: 0.9,
    effects: [buff('rowBuff', 'def', 'add', 8)] },
  { id: 'c_dragonkin', kind: 'character', name: '竜人', icon: '🐲', tribe: 'neutral', hp: 800, atk: 40, def: 60, spd: 0.8, effects: [] },
  { id: 'c_fiend', kind: 'character', name: '魔人', icon: '👹', tribe: 'neutral', hp: 700, atk: 60, def: 40, spd: 1.0, effects: [] },
];

export const ITEMS = [
  // 隣のキャラに効く
  { id: 'i_sword', kind: 'item', name: '鉄の剣', icon: '⚔️', atk: 15, def: 0, effects: [] },
  { id: 'i_shield', kind: 'item', name: '木の盾', icon: '🛡️', atk: 0, def: 25, effects: [] },
  { id: 'i_spear', kind: 'item', name: '槍', icon: '🔱', atk: 10, def: 0, effects: [{ type: 'pierce', value: 0.25 }] },
  { id: 'i_gear', kind: 'item', name: '歯車', icon: '⚙️', atk: 0, def: 15, effects: [buff('adjBuff', 'hp', 'pct', 0.15)] },
  { id: 'i_banner', kind: 'item', name: '軍旗', icon: '🚩', atk: 0, def: 0, effects: [buff('adjBuff', 'spd', 'pct', 0.3)] },
  { id: 'i_vial', kind: 'item', name: '毒瓶', icon: '☠️', atk: 0, def: 0, effects: [{ type: 'poison', stacks: 1, chance: 0.8 }] },
  { id: 'i_stungun', kind: 'item', name: 'スタンガン', icon: '🔌', atk: 0, def: 0,
    effects: [{ type: 'paralyze', target: 'front', duration: 2, chance: 0.3 }] },
  { id: 'i_blade', kind: 'item', name: '魔剣', icon: '🗡️', atk: 15, def: 0, effects: [{ type: 'pierce', value: 0.3 }] },
  { id: 'i_armor', kind: 'item', name: '聖鎧', icon: '🥋', atk: 0, def: 40, effects: [buff('adjBuff', 'hp', 'add', 150)] },
  { id: 'i_crown', kind: 'item', name: '王冠', icon: '💎', atk: 0, def: 0,
    effects: [buff('adjBuff', 'atk', 'pct', 0.3), buff('adjBuff', 'def', 'pct', 0.3)] },

  // どこに置いても効く
  { id: 'i_potion', kind: 'item', name: '回復薬', icon: '🧴', atk: 0, def: 0, effects: [{ type: 'heal', amount: 30, interval: 1 }] },
  { id: 'i_drum', kind: 'item', name: '戦太鼓', icon: '🥁', atk: 0, def: 0, effects: [buff('rowBuff', 'spd', 'pct', 0.2)] },
  { id: 'i_ward', kind: 'item', name: '結界石', icon: '🔷', atk: 0, def: 0, effects: [buff('teamBuff', 'def', 'add', 10)] },
  { id: 'i_censer', kind: 'item', name: '毒の香炉', icon: '🏺', atk: 0, def: 0,
    effects: [{ type: 'pulse', status: 'poison', amount: 1, interval: 1 }] },
  { id: 'i_doll', kind: 'item', name: '呪いの人形', icon: '🪆', atk: 0, def: 0,
    effects: [{ type: 'pulse', status: 'curse', amount: 4, interval: 3 }] },
];
