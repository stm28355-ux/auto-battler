// 標準の駒（spec §3。Ver.3）。コストは src/core/cost.js で自動計算する。
// 道具の「攻撃時」効果・防御貫通・攻撃・防御は、隣接するキャラクターに付く。
// 種族ごとの役割：
//   戦士 … HP・防御が高く、攻撃もそこそこある王道
//   魔導 … 毒・呪い・攻撃頻度の低い大火力・防御貫通で崩す
//   獣   … 攻撃・攻撃速度が高い
//   機械 … 回復と麻痺で耐える
//   中立 … 1体でも強い（少ないほどシナジーが強い）
// どのキャラにも、他と使い分ける理由（固有の効果か、はっきりした能力値の偏り）を持たせる。
//
// Ver.3：コストと、決めた効果は固定（docs/ver3-memo.md）。能力値などはコストに合うように調整する。
// コメントの「前」は前線向け、「後ろ」は前線以外向け、「両方」はどちらでも。数字はコスト。

const buff = (type, stat, mode, value) => ({ type, stat, mode, value });

export const CHARACTERS = [
  // 戦士
  // 見習い剣士（前・3）：行のHP。マスの多いペンタグラムで使いやすい
  { id: 'c_squire', kind: 'character', name: '見習い剣士', icon: '🗡️', tribe: 'warrior', hp: 240, atk: 22, def: 25, spd: 1.0,
    effects: [buff('rowBuff', 'hp', 'add', 40)] },
  // 騎士（前・5）：HPと防御。鎧磨き（隣の道具の防御+50%）
  { id: 'c_knight', kind: 'character', name: '騎士', icon: '🤺', tribe: 'warrior', hp: 340, atk: 20, def: 50, spd: 0.8,
    effects: [{ type: 'adjBuff', stat: 'hp', mode: 'pct', value: 0.1 }, { type: 'itemAmp', stat: 'def', value: 0.5 }] },
  // 狂戦士（後ろ・6）：攻撃と少しの防御貫通。研磨（隣の道具の攻撃+30%）
  { id: 'c_berserker', kind: 'character', name: '狂戦士', icon: '🪓', tribe: 'warrior', hp: 210, atk: 53, def: 10, spd: 1.0,
    effects: [{ type: 'pierce', value: 0.15 }, { type: 'itemAmp', stat: 'atk', value: 0.3 }] },
  // 聖騎士（後ろ・7）：行の防御（その行の前線を守る）と、手当て（毒を減らし麻痺を解く）
  { id: 'c_paladin', kind: 'character', name: '聖騎士', icon: '⚜️', tribe: 'warrior', hp: 480, atk: 48, def: 15, spd: 0.9,
    effects: [{ type: 'rowBuff', stat: 'def', mode: 'add', value: 15 }, { type: 'cure', interval: 2, poison: 2 }] },
  // 剣聖（後ろ・9）：防御貫通50%と、全員の攻撃+4（中コストの強化役。+10 では体が残らなかった）
  { id: 'c_swordmaster', kind: 'character', name: '剣聖', icon: '🥷', tribe: 'warrior', hp: 350, atk: 41, def: 20, spd: 1.0,
    effects: [{ type: 'pierce', value: 0.5 }, { type: 'teamBuff', stat: 'atk', mode: 'add', value: 4 }] },
  // 重装兵（前・11）：HPと防御
  { id: 'c_guard', kind: 'character', name: '重装兵', icon: '🪖', tribe: 'warrior', hp: 1100, atk: 25, def: 110, spd: 0.6,
    effects: [buff('adjBuff', 'def', 'add', 10)] },
  // 竜騎士（両方・13）：行の攻撃+20%
  { id: 'c_dragoon', kind: 'character', name: '竜騎士', icon: '🐉', tribe: 'warrior', hp: 700, atk: 80, def: 50, spd: 0.8,
    effects: [buff('rowBuff', 'atk', 'pct', 0.2)] },
  // 将軍（両方・15）：号令（開始から8秒、全員の攻撃速度+20%）と、戦士の攻撃+10%
  { id: 'c_general', kind: 'character', name: '将軍', icon: '👑', tribe: 'warrior', hp: 690, atk: 46, def: 50, spd: 1.0,
    effects: [{ type: 'rally', stat: 'spd', value: 0.2, duration: 8 }, { type: 'teamBuff', stat: 'atk', mode: 'pct', value: 0.1, tribe: 'warrior' }] },

  // 魔導
  // 見習い魔導士（後ろ・3）：毒80%。毒蛇と対になる安い毒役
  { id: 'c_apprentice', kind: 'character', name: '見習い魔導士', icon: '🔮', tribe: 'mage', hp: 200, atk: 20, def: 10, spd: 1.0,
    effects: [{ type: 'poison', stacks: 1, chance: 0.8 }] },
  // 魔女（後ろ・4）：毒と、魔導の攻撃速度+10%（魔導の種族の強化役）
  { id: 'c_witch', kind: 'character', name: '魔女', icon: '🧹', tribe: 'mage', hp: 180, atk: 22, def: 10, spd: 1.1,
    effects: [{ type: 'poison', stacks: 1, chance: 0.6 }, { type: 'teamBuff', stat: 'spd', mode: 'pct', value: 0.1, tribe: 'mage' }] },
  // 預言者（後ろ・5）：全員の攻撃
  { id: 'c_oracle', kind: 'character', name: '預言者', icon: '👁️', tribe: 'mage', hp: 270, atk: 21, def: 15, spd: 1.0,
    effects: [{ type: 'teamBuff', stat: 'atk', mode: 'add', value: 4 }] },
  // 呪詛師（後ろ・5）：呪い
  { id: 'c_cursemaster', kind: 'character', name: '呪詛師', icon: '💀', tribe: 'mage', hp: 280, atk: 25, def: 20, spd: 1.0,
    effects: [{ type: 'curse', duration: 4, chance: 0.5 }] },
  // 雷術師（後ろ・7）：重い一撃と、号令（開始から4秒、全員の攻撃速度+20%。雷の電気信号で速くなる）
  { id: 'c_sorcerer', kind: 'character', name: '雷術師', icon: '⚡', tribe: 'mage', hp: 220, atk: 114, def: 5, spd: 0.4,
    effects: [{ type: 'rally', stat: 'spd', value: 0.2, duration: 4 }] },
  // 呪術師（後ろ・10）：毒+3、速い攻撃、毒で攻撃+（相手の毒の蓄積1ごとに攻撃+1）
  { id: 'c_hexer', kind: 'character', name: '呪術師', icon: '🧪', tribe: 'mage', hp: 270, atk: 11, def: 15, spd: 1.5,
    effects: [{ type: 'poison', stacks: 3, chance: 0.8 }, { type: 'venomAtk', value: 1 }] },
  // 炎術師（後ろ・12）：防御貫通と、重い一撃で燃やす（攻撃時 毒+3）。遅い大火力が、毒で後から効く
  { id: 'c_pyromancer', kind: 'character', name: '炎術師', icon: '🔥', tribe: 'mage', hp: 380, atk: 122, def: 15, spd: 0.5,
    effects: [{ type: 'pierce', value: 0.5 }, { type: 'poison', stacks: 3, chance: 1 }] },
  // 大魔導士（後ろ・14）：攻撃時の毒+3と、定期的な毒
  { id: 'c_archmage', kind: 'character', name: '大魔導士', icon: '🧙', tribe: 'mage', hp: 600, atk: 40, def: 20, spd: 1.0,
    effects: [{ type: 'poison', stacks: 3, chance: 1 }, { type: 'pulse', status: 'poison', amount: 1, interval: 1 }] },

  // 獣（安い駒が多い。シナジーの後ろの段階が強い）
  // 毒蛇（後ろ・3）：毒30%
  { id: 'c_viper', kind: 'character', name: '毒蛇', icon: '🐍', tribe: 'beast', hp: 200, atk: 15, def: 5, spd: 2.2,
    effects: [{ type: 'poison', stacks: 1, chance: 0.3 }] },
  // 狼（後ろ・3）：隣の攻撃
  { id: 'c_wolf', kind: 'character', name: '狼', icon: '🐺', tribe: 'beast', hp: 160, atk: 19, def: 10, spd: 1.8,
    effects: [{ type: 'adjBuff', stat: 'atk', mode: 'add', value: 5 }] },
  // 鷹（後ろ・3）：そのまま
  { id: 'c_hawk', kind: 'character', name: '鷹', icon: '🦅', tribe: 'beast', hp: 200, atk: 25, def: 5, spd: 1.6,
    effects: [buff('rowBuff', 'spd', 'pct', 0.1)] },
  // 豹（後ろ・5）：そのまま
  { id: 'c_leopard', kind: 'character', name: '豹', icon: '🐆', tribe: 'beast', hp: 200, atk: 45, def: 10, spd: 1.5, effects: [] },
  // 猪（後ろ・7）：全員の攻撃
  { id: 'c_boar', kind: 'character', name: '猪', icon: '🐗', tribe: 'beast', hp: 390, atk: 37, def: 15, spd: 1.0,
    effects: [{ type: 'teamBuff', stat: 'atk', mode: 'add', value: 4 }] },
  // 熊（両方・8）：行のHP
  { id: 'c_bear', kind: 'character', name: '熊', icon: '🐻', tribe: 'beast', hp: 850, atk: 40, def: 30, spd: 0.7,
    effects: [buff('rowBuff', 'hp', 'pct', 0.1)] },
  // 獅子（両方・11）：行の攻撃と攻撃速度
  { id: 'c_lion', kind: 'character', name: '獅子', icon: '🦁', tribe: 'beast', hp: 700, atk: 60, def: 25, spd: 1.0,
    effects: [buff('rowBuff', 'atk', 'pct', 0.1), buff('rowBuff', 'spd', 'pct', 0.1)] },
  // 古の巨獣（両方・14）：獣の攻撃+15%・攻撃速度+10%（獣の種族の強化役）
  { id: 'c_behemoth', kind: 'character', name: '古の巨獣', icon: '🦣', tribe: 'beast', hp: 930, atk: 56, def: 35, spd: 0.8,
    effects: [{ type: 'teamBuff', stat: 'atk', mode: 'pct', value: 0.15, tribe: 'beast' }, { type: 'teamBuff', stat: 'spd', mode: 'pct', value: 0.1, tribe: 'beast' }] },

  // 機械（回復と麻痺）
  // 偵察機（後ろ・3）：そのまま
  { id: 'c_drone', kind: 'character', name: '偵察機', icon: '🛸', tribe: 'machine', hp: 180, atk: 20, def: 20, spd: 1.4,
    effects: [{ type: 'paralyze', target: 'random', duration: 2, chance: 0.3 }] },
  // 動力炉（両方・5）：機械の攻撃速度+10%（機械の種族の強化役）
  { id: 'c_reactor', kind: 'character', name: '動力炉', icon: '🔋', tribe: 'machine', hp: 550, atk: 14, def: 30, spd: 0.7,
    effects: [{ type: 'teamBuff', stat: 'spd', mode: 'pct', value: 0.1, tribe: 'machine' }] },
  // 電磁塔（両方・6）：行まとめて麻痺。確率を下げて攻撃速度を上げた
  { id: 'c_tesla', kind: 'character', name: '電磁塔', icon: '📡', tribe: 'machine', hp: 450, atk: 25, def: 35, spd: 1.0,
    effects: [{ type: 'paralyze', target: 'row', duration: 2, chance: 0.3 }] },
  // 砲台（後ろ・7）：防御貫通と、隣の攻撃（機械で攻撃を上げられる駒）
  { id: 'c_turret', kind: 'character', name: '砲台', icon: '🗼', tribe: 'machine', hp: 230, atk: 74, def: 30, spd: 0.5,
    effects: [{ type: 'pierce', value: 0.5 }, { type: 'adjBuff', stat: 'atk', mode: 'add', value: 8 }] },
  // ゴーレム（前・9）：隣の防御と、前線への麻痺
  { id: 'c_golem', kind: 'character', name: 'ゴーレム', icon: '🗿', tribe: 'machine', hp: 1000, atk: 20, def: 65, spd: 0.6,
    effects: [buff('adjBuff', 'def', 'add', 10), { type: 'paralyze', target: 'front', duration: 1.5, chance: 0.7 }] },
  // 修理ロボ（後ろ・10）：回復と、手当て（毒を減らし麻痺を解く）
  { id: 'c_medibot', kind: 'character', name: '修理ロボ', icon: '🔧', tribe: 'machine', hp: 470, atk: 18, def: 45, spd: 0.8,
    effects: [{ type: 'heal', amount: 40, interval: 1 }, { type: 'cure', interval: 1.5, poison: 2 }] },
  // 戦闘機（両方・12）：いちばん速い相手（麻痺で遅くなった分も入れる）を麻痺70%、隣の攻撃速度
  { id: 'c_fighter', kind: 'character', name: '戦闘機', icon: '✈️', tribe: 'machine', hp: 650, atk: 55, def: 45, spd: 1.2,
    effects: [{ type: 'paralyze', target: 'fastest', duration: 1, chance: 0.7 }, buff('adjBuff', 'spd', 'pct', 0.1)] },
  // 修理工房（両方・15）：回復と、定期的な毒（有害なガス）。HPより防御が高い（回復がよく効く）
  { id: 'c_workshop', kind: 'character', name: '修理工房', icon: '🏭', tribe: 'machine', hp: 550, atk: 15, def: 120, spd: 0.5,
    effects: [{ type: 'heal', amount: 50, interval: 1 }, { type: 'pulse', status: 'poison', amount: 1, interval: 0.8 }] },

  // 中立（シナジーは少ないほど強い：1体 +20%、2体 +10%、3体以上 +5%）
  // エルフ（後ろ・3）：防御貫通40%の安い対・壁役
  { id: 'c_elf', kind: 'character', name: 'エルフ', icon: '🧝', tribe: 'neutral', hp: 160, atk: 20, def: 5, spd: 1.3,
    effects: [{ type: 'pierce', value: 0.4 }] },
  // ドワーフ（両方・7）：鍛冶（隣の道具の攻撃・防御+40%）
  { id: 'c_dwarf', kind: 'character', name: 'ドワーフ', icon: '⛏️', tribe: 'neutral', hp: 430, atk: 31, def: 40, spd: 0.9,
    effects: [{ type: 'itemAmp', stat: 'atk', value: 0.4 }, { type: 'itemAmp', stat: 'def', value: 0.4 }] },
  // 吸血鬼（後ろ・10）：与えたダメージの50%を回復し、隣のキャラにも吸血25%を配る
  { id: 'c_vampire', kind: 'character', name: '吸血鬼', icon: '🧛', tribe: 'neutral', hp: 380, atk: 38, def: 20, spd: 1.1,
    effects: [{ type: 'lifesteal', value: 0.5 }, { type: 'lifestealAura', value: 0.25 }] },
  // 竜人（両方・12）：全員のHPと攻撃速度
  { id: 'c_dragonkin', kind: 'character', name: '竜人', icon: '🐲', tribe: 'neutral', hp: 730, atk: 42, def: 65, spd: 0.8,
    effects: [{ type: 'teamBuff', stat: 'hp', mode: 'add', value: 50 }, { type: 'teamBuff', stat: 'spd', mode: 'pct', value: 0.05 }] },
  // 魔人（両方・16）：効果なしの最強キャラ。攻撃速度は速め
  { id: 'c_fiend', kind: 'character', name: '魔人', icon: '👹', tribe: 'neutral', hp: 1000, atk: 70, def: 50, spd: 1.3, effects: [] },
];

export const ITEMS = [
  // 隣のキャラに効く
  { id: 'i_shield', kind: 'item', name: '木の盾', icon: '🛡️', atk: 0, def: 40, effects: [] },
  { id: 'i_gear', kind: 'item', name: '歯車', icon: '⚙️', atk: 0, def: 0,
    effects: [{ type: 'adjBuff', stat: 'hp', mode: 'pct', value: 0.25 }] },
  { id: 'i_banner', kind: 'item', name: '軍旗', icon: '🚩', atk: 0, def: 0,
    effects: [{ type: 'adjBuff', stat: 'spd', mode: 'pct', value: 0.25 }] },
  { id: 'i_stungun', kind: 'item', name: 'スタンガン', icon: '🔌', atk: 5, def: 0,
    effects: [{ type: 'paralyze', target: 'random', duration: 1.5, chance: 0.3 }] },
  { id: 'i_vial', kind: 'item', name: '毒瓶', icon: '☠️', atk: 0, def: 0,
    effects: [{ type: 'poison', stacks: 1, chance: 0.4 }] },
  // 槍：Ver.2 の魔剣の効果
  { id: 'i_spear', kind: 'item', name: '槍', icon: '🔱', atk: 15, def: 0, effects: [{ type: 'pierce', value: 0.3 }] },
  { id: 'i_crown', kind: 'item', name: '王冠', icon: '💎', atk: 0, def: 0,
    effects: [{ type: 'adjBuff', stat: 'atk', mode: 'pct', value: 0.4 }, { type: 'adjBuff', stat: 'def', mode: 'pct', value: 0.4 }] },
  // 魔剣（8）：攻撃と、隣の攻撃速度+0.15（固定値）。攻撃の道具のいちばん上（鉄の剣 < 槍 < 魔剣）
  { id: 'i_blade', kind: 'item', name: '魔剣', icon: '🗡️', atk: 32, def: 0,
    effects: [{ type: 'adjBuff', stat: 'spd', mode: 'add', value: 0.15 }] },
  { id: 'i_armor', kind: 'item', name: '聖鎧', icon: '🥋', atk: 0, def: 50,
    effects: [{ type: 'adjBuff', stat: 'hp', mode: 'add', value: 200 }] },

  // どこに置いても効く
  { id: 'i_sword', kind: 'item', name: '鉄の剣', icon: '⚔️', atk: 16, def: 0,
    effects: [] },
  // 戦太鼓：行の攻撃速度（道具が行の1マスを使うので、2体ぶんで数える）
  { id: 'i_drum', kind: 'item', name: '戦太鼓', icon: '🥁', atk: 0, def: 0, effects: [buff('rowBuff', 'spd', 'pct', 0.3)] },
  { id: 'i_ward', kind: 'item', name: '結界石', icon: '🔷', atk: 0, def: 0, effects: [buff('teamBuff', 'def', 'add', 10)] },
  { id: 'i_potion', kind: 'item', name: '回復薬', icon: '🧴', atk: 0, def: 0, effects: [{ type: 'heal', amount: 30, interval: 1 }] },
  // 毒の香炉：毒瓶（隣3体 × 攻撃速度1.2 × 80%）と同じ毒の量。魔導の毒ボーナスは付与1回ごとなので、回数も近づけた
  { id: 'i_censer', kind: 'item', name: '毒の香炉', icon: '🏺', atk: 0, def: 0,
    effects: [{ type: 'pulse', status: 'poison', amount: 1, interval: 0.35 }] },
  // 呪いの人形：2秒ごとに2秒の呪い（ほぼずっと呪い）
  { id: 'i_doll', kind: 'item', name: '呪いの人形', icon: '🪆', atk: 0, def: 0,
    effects: [{ type: 'pulse', status: 'curse', amount: 2, interval: 2 }] },
];
