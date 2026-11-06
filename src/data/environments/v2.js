// Ver.2 の環境（tools/snapshot-env.js で書き出したもの。手で直さない）
export default {
  "id": "v2",
  "name": "Ver.2",
  "status": "保存版",
  "note": "Ver.2の環境をそのまま残したもの。",
  "balance": {
    "damageScale": 1.2,
    "armor": 0.6,
    "minDamage": 0.3,
    "curseAmp": 0.25,
    "boardTraits": {
      "square": {
        "rowBuffMult": 2
      }
    },
    "poisonDamage": 0.2,
    "poisonDuration": null,
    "paralyzeFactor": 0.3,
    "cost": {
      "step": 1,
      "ceil": 0,
      "curve": 1.55,
      "scale": 1.35,
      "hp": 400,
      "atkSpd": 40,
      "atkPow": 0.4,
      "atkRef": 40,
      "def": 65,
      "itemAtk": 14,
      "itemDef": 28,
      "poison": 0.7,
      "paralyze": 1,
      "paralyzeSec": 0.5,
      "onHitSpd": 1,
      "itemOnHit": 3,
      "adjAtkMult": 4.5,
      "heal": 0.05,
      "curse": 0.4,
      "pierce": 1.2,
      "adjBuff": 3,
      "teamBuff": 8,
      "pulsePoison": 1.2,
      "pulseCurse": 1.2,
      "buffRef": {
        "hp": 400,
        "atk": 45,
        "def": 40
      },
      "rowBuff": 3
    }
  },
  "costCaps": {
    "pentagram": 46,
    "square": 52,
    "honeycomb": 58
  },
  "characters": [
    {
      "id": "c_squire",
      "kind": "character",
      "name": "見習い剣士",
      "icon": "🗡️",
      "tribe": "warrior",
      "hp": 240,
      "atk": 30,
      "def": 20,
      "spd": 1,
      "effects": [
        {
          "type": "rowBuff",
          "stat": "hp",
          "mode": "add",
          "value": 30
        }
      ]
    },
    {
      "id": "c_knight",
      "kind": "character",
      "name": "騎士",
      "icon": "🤺",
      "tribe": "warrior",
      "hp": 450,
      "atk": 30,
      "def": 60,
      "spd": 0.8,
      "effects": [
        {
          "type": "adjBuff",
          "stat": "hp",
          "mode": "pct",
          "value": 0.1
        }
      ]
    },
    {
      "id": "c_berserker",
      "kind": "character",
      "name": "狂戦士",
      "icon": "🪓",
      "tribe": "warrior",
      "hp": 300,
      "atk": 60,
      "def": 10,
      "spd": 1,
      "effects": [
        {
          "type": "pierce",
          "value": 0.3
        }
      ]
    },
    {
      "id": "c_paladin",
      "kind": "character",
      "name": "聖騎士",
      "icon": "⚜️",
      "tribe": "warrior",
      "hp": 500,
      "atk": 35,
      "def": 45,
      "spd": 0.9,
      "effects": [
        {
          "type": "rowBuff",
          "stat": "def",
          "mode": "add",
          "value": 12
        }
      ]
    },
    {
      "id": "c_guard",
      "kind": "character",
      "name": "重装兵",
      "icon": "🪖",
      "tribe": "warrior",
      "hp": 700,
      "atk": 20,
      "def": 90,
      "spd": 0.6,
      "effects": [
        {
          "type": "adjBuff",
          "stat": "def",
          "mode": "add",
          "value": 10
        }
      ]
    },
    {
      "id": "c_swordmaster",
      "kind": "character",
      "name": "剣聖",
      "icon": "🥷",
      "tribe": "warrior",
      "hp": 380,
      "atk": 55,
      "def": 30,
      "spd": 1,
      "effects": [
        {
          "type": "pierce",
          "value": 0.5
        }
      ]
    },
    {
      "id": "c_dragoon",
      "kind": "character",
      "name": "竜騎士",
      "icon": "🐉",
      "tribe": "warrior",
      "hp": 600,
      "atk": 70,
      "def": 45,
      "spd": 0.8,
      "effects": [
        {
          "type": "rowBuff",
          "stat": "atk",
          "mode": "pct",
          "value": 0.1
        }
      ]
    },
    {
      "id": "c_general",
      "kind": "character",
      "name": "将軍",
      "icon": "👑",
      "tribe": "warrior",
      "hp": 600,
      "atk": 50,
      "def": 50,
      "spd": 1,
      "effects": [
        {
          "type": "adjBuff",
          "stat": "atk",
          "mode": "pct",
          "value": 0.25
        }
      ]
    },
    {
      "id": "c_apprentice",
      "kind": "character",
      "name": "見習い魔導士",
      "icon": "🔮",
      "tribe": "mage",
      "hp": 160,
      "atk": 20,
      "def": 10,
      "spd": 1,
      "effects": [
        {
          "type": "poison",
          "stacks": 1,
          "chance": 0.8
        }
      ]
    },
    {
      "id": "c_hexer",
      "kind": "character",
      "name": "呪術師",
      "icon": "🧪",
      "tribe": "mage",
      "hp": 240,
      "atk": 15,
      "def": 20,
      "spd": 1.2,
      "effects": [
        {
          "type": "poison",
          "stacks": 2,
          "chance": 0.8
        }
      ]
    },
    {
      "id": "c_witch",
      "kind": "character",
      "name": "魔女",
      "icon": "🧹",
      "tribe": "mage",
      "hp": 200,
      "atk": 25,
      "def": 10,
      "spd": 1.1,
      "effects": [
        {
          "type": "poison",
          "stacks": 1,
          "chance": 0.6
        },
        {
          "type": "rowBuff",
          "stat": "atk",
          "mode": "pct",
          "value": 0.1
        }
      ]
    },
    {
      "id": "c_oracle",
      "kind": "character",
      "name": "預言者",
      "icon": "👁️",
      "tribe": "mage",
      "hp": 260,
      "atk": 20,
      "def": 15,
      "spd": 1,
      "effects": [
        {
          "type": "teamBuff",
          "stat": "atk",
          "mode": "add",
          "value": 5
        }
      ]
    },
    {
      "id": "c_cursemaster",
      "kind": "character",
      "name": "呪詛師",
      "icon": "💀",
      "tribe": "mage",
      "hp": 280,
      "atk": 25,
      "def": 20,
      "spd": 1,
      "effects": [
        {
          "type": "curse",
          "duration": 4,
          "chance": 0.5
        }
      ]
    },
    {
      "id": "c_sorcerer",
      "kind": "character",
      "name": "雷術師",
      "icon": "⚡",
      "tribe": "mage",
      "hp": 300,
      "atk": 150,
      "def": 10,
      "spd": 0.4,
      "effects": []
    },
    {
      "id": "c_pyromancer",
      "kind": "character",
      "name": "炎術師",
      "icon": "🔥",
      "tribe": "mage",
      "hp": 300,
      "atk": 110,
      "def": 15,
      "spd": 0.5,
      "effects": [
        {
          "type": "pierce",
          "value": 0.5
        }
      ]
    },
    {
      "id": "c_archmage",
      "kind": "character",
      "name": "大魔導士",
      "icon": "🧙",
      "tribe": "mage",
      "hp": 400,
      "atk": 40,
      "def": 20,
      "spd": 1,
      "effects": [
        {
          "type": "poison",
          "stacks": 2,
          "chance": 1
        }
      ]
    },
    {
      "id": "c_viper",
      "kind": "character",
      "name": "毒蛇",
      "icon": "🐍",
      "tribe": "beast",
      "hp": 150,
      "atk": 15,
      "def": 5,
      "spd": 2.2,
      "effects": [
        {
          "type": "poison",
          "stacks": 1,
          "chance": 0.4
        }
      ]
    },
    {
      "id": "c_wolf",
      "kind": "character",
      "name": "狼",
      "icon": "🐺",
      "tribe": "beast",
      "hp": 180,
      "atk": 22,
      "def": 10,
      "spd": 1.8,
      "effects": [
        {
          "type": "adjBuff",
          "stat": "spd",
          "mode": "pct",
          "value": 0.1
        }
      ]
    },
    {
      "id": "c_hawk",
      "kind": "character",
      "name": "鷹",
      "icon": "🦅",
      "tribe": "beast",
      "hp": 200,
      "atk": 25,
      "def": 5,
      "spd": 1.6,
      "effects": [
        {
          "type": "rowBuff",
          "stat": "spd",
          "mode": "pct",
          "value": 0.1
        }
      ]
    },
    {
      "id": "c_leopard",
      "kind": "character",
      "name": "豹",
      "icon": "🐆",
      "tribe": "beast",
      "hp": 200,
      "atk": 45,
      "def": 10,
      "spd": 1.5,
      "effects": []
    },
    {
      "id": "c_boar",
      "kind": "character",
      "name": "猪",
      "icon": "🐗",
      "tribe": "beast",
      "hp": 350,
      "atk": 40,
      "def": 15,
      "spd": 1,
      "effects": [
        {
          "type": "pierce",
          "value": 0.3
        }
      ]
    },
    {
      "id": "c_bear",
      "kind": "character",
      "name": "熊",
      "icon": "🐻",
      "tribe": "beast",
      "hp": 550,
      "atk": 40,
      "def": 30,
      "spd": 0.7,
      "effects": [
        {
          "type": "rowBuff",
          "stat": "hp",
          "mode": "pct",
          "value": 0.1
        }
      ]
    },
    {
      "id": "c_lion",
      "kind": "character",
      "name": "獅子",
      "icon": "🦁",
      "tribe": "beast",
      "hp": 450,
      "atk": 45,
      "def": 25,
      "spd": 1,
      "effects": [
        {
          "type": "rowBuff",
          "stat": "atk",
          "mode": "pct",
          "value": 0.1
        }
      ]
    },
    {
      "id": "c_behemoth",
      "kind": "character",
      "name": "古の巨獣",
      "icon": "🦣",
      "tribe": "beast",
      "hp": 900,
      "atk": 50,
      "def": 40,
      "spd": 0.8,
      "effects": [
        {
          "type": "adjBuff",
          "stat": "atk",
          "mode": "add",
          "value": 8
        }
      ]
    },
    {
      "id": "c_drone",
      "kind": "character",
      "name": "偵察機",
      "icon": "🛸",
      "tribe": "machine",
      "hp": 180,
      "atk": 20,
      "def": 20,
      "spd": 1.4,
      "effects": [
        {
          "type": "paralyze",
          "target": "random",
          "duration": 2,
          "chance": 0.3
        }
      ]
    },
    {
      "id": "c_medibot",
      "kind": "character",
      "name": "修理ロボ",
      "icon": "🔧",
      "tribe": "machine",
      "hp": 260,
      "atk": 10,
      "def": 30,
      "spd": 0.8,
      "effects": [
        {
          "type": "heal",
          "amount": 15,
          "interval": 1
        }
      ]
    },
    {
      "id": "c_turret",
      "kind": "character",
      "name": "砲台",
      "icon": "🗼",
      "tribe": "machine",
      "hp": 320,
      "atk": 80,
      "def": 30,
      "spd": 0.5,
      "effects": [
        {
          "type": "pierce",
          "value": 0.5
        }
      ]
    },
    {
      "id": "c_tesla",
      "kind": "character",
      "name": "電磁塔",
      "icon": "📡",
      "tribe": "machine",
      "hp": 350,
      "atk": 20,
      "def": 30,
      "spd": 0.7,
      "effects": [
        {
          "type": "paralyze",
          "target": "row",
          "duration": 2,
          "chance": 0.5
        }
      ]
    },
    {
      "id": "c_reactor",
      "kind": "character",
      "name": "動力炉",
      "icon": "🔋",
      "tribe": "machine",
      "hp": 500,
      "atk": 15,
      "def": 35,
      "spd": 0.7,
      "effects": [
        {
          "type": "rowBuff",
          "stat": "hp",
          "mode": "pct",
          "value": 0.1
        }
      ]
    },
    {
      "id": "c_fighter",
      "kind": "character",
      "name": "戦闘機",
      "icon": "✈️",
      "tribe": "machine",
      "hp": 420,
      "atk": 50,
      "def": 35,
      "spd": 1.2,
      "effects": [
        {
          "type": "paralyze",
          "target": "front",
          "duration": 1.5,
          "chance": 0.3
        }
      ]
    },
    {
      "id": "c_workshop",
      "kind": "character",
      "name": "修理工房",
      "icon": "🏭",
      "tribe": "machine",
      "hp": 450,
      "atk": 10,
      "def": 35,
      "spd": 0.5,
      "effects": [
        {
          "type": "heal",
          "amount": 35,
          "interval": 1
        }
      ]
    },
    {
      "id": "c_golem",
      "kind": "character",
      "name": "ゴーレム",
      "icon": "🗿",
      "tribe": "machine",
      "hp": 750,
      "atk": 20,
      "def": 50,
      "spd": 0.6,
      "effects": [
        {
          "type": "adjBuff",
          "stat": "def",
          "mode": "add",
          "value": 8
        }
      ]
    },
    {
      "id": "c_elf",
      "kind": "character",
      "name": "エルフ",
      "icon": "🧝",
      "tribe": "neutral",
      "hp": 220,
      "atk": 28,
      "def": 10,
      "spd": 1.3,
      "effects": [
        {
          "type": "pierce",
          "value": 0.2
        }
      ]
    },
    {
      "id": "c_vampire",
      "kind": "character",
      "name": "吸血鬼",
      "icon": "🧛",
      "tribe": "neutral",
      "hp": 450,
      "atk": 45,
      "def": 25,
      "spd": 1.1,
      "effects": [
        {
          "type": "heal",
          "amount": 12,
          "interval": 1
        }
      ]
    },
    {
      "id": "c_dwarf",
      "kind": "character",
      "name": "ドワーフ",
      "icon": "⛏️",
      "tribe": "neutral",
      "hp": 450,
      "atk": 35,
      "def": 45,
      "spd": 0.9,
      "effects": [
        {
          "type": "rowBuff",
          "stat": "def",
          "mode": "add",
          "value": 8
        }
      ]
    },
    {
      "id": "c_dragonkin",
      "kind": "character",
      "name": "竜人",
      "icon": "🐲",
      "tribe": "neutral",
      "hp": 800,
      "atk": 40,
      "def": 60,
      "spd": 0.8,
      "effects": []
    },
    {
      "id": "c_fiend",
      "kind": "character",
      "name": "魔人",
      "icon": "👹",
      "tribe": "neutral",
      "hp": 700,
      "atk": 60,
      "def": 40,
      "spd": 1,
      "effects": []
    }
  ],
  "items": [
    {
      "id": "i_sword",
      "kind": "item",
      "name": "鉄の剣",
      "icon": "⚔️",
      "atk": 15,
      "def": 0,
      "effects": []
    },
    {
      "id": "i_shield",
      "kind": "item",
      "name": "木の盾",
      "icon": "🛡️",
      "atk": 0,
      "def": 25,
      "effects": []
    },
    {
      "id": "i_spear",
      "kind": "item",
      "name": "槍",
      "icon": "🔱",
      "atk": 10,
      "def": 0,
      "effects": [
        {
          "type": "pierce",
          "value": 0.25
        }
      ]
    },
    {
      "id": "i_gear",
      "kind": "item",
      "name": "歯車",
      "icon": "⚙️",
      "atk": 0,
      "def": 15,
      "effects": [
        {
          "type": "adjBuff",
          "stat": "hp",
          "mode": "pct",
          "value": 0.15
        }
      ]
    },
    {
      "id": "i_banner",
      "kind": "item",
      "name": "軍旗",
      "icon": "🚩",
      "atk": 0,
      "def": 0,
      "effects": [
        {
          "type": "adjBuff",
          "stat": "spd",
          "mode": "pct",
          "value": 0.3
        }
      ]
    },
    {
      "id": "i_vial",
      "kind": "item",
      "name": "毒瓶",
      "icon": "☠️",
      "atk": 0,
      "def": 0,
      "effects": [
        {
          "type": "poison",
          "stacks": 1,
          "chance": 0.8
        }
      ]
    },
    {
      "id": "i_stungun",
      "kind": "item",
      "name": "スタンガン",
      "icon": "🔌",
      "atk": 0,
      "def": 0,
      "effects": [
        {
          "type": "paralyze",
          "target": "front",
          "duration": 2,
          "chance": 0.3
        }
      ]
    },
    {
      "id": "i_blade",
      "kind": "item",
      "name": "魔剣",
      "icon": "🗡️",
      "atk": 15,
      "def": 0,
      "effects": [
        {
          "type": "pierce",
          "value": 0.3
        }
      ]
    },
    {
      "id": "i_armor",
      "kind": "item",
      "name": "聖鎧",
      "icon": "🥋",
      "atk": 0,
      "def": 40,
      "effects": [
        {
          "type": "adjBuff",
          "stat": "hp",
          "mode": "add",
          "value": 150
        }
      ]
    },
    {
      "id": "i_crown",
      "kind": "item",
      "name": "王冠",
      "icon": "💎",
      "atk": 0,
      "def": 0,
      "effects": [
        {
          "type": "adjBuff",
          "stat": "atk",
          "mode": "pct",
          "value": 0.3
        },
        {
          "type": "adjBuff",
          "stat": "def",
          "mode": "pct",
          "value": 0.3
        }
      ]
    },
    {
      "id": "i_potion",
      "kind": "item",
      "name": "回復薬",
      "icon": "🧴",
      "atk": 0,
      "def": 0,
      "effects": [
        {
          "type": "heal",
          "amount": 30,
          "interval": 1
        }
      ]
    },
    {
      "id": "i_drum",
      "kind": "item",
      "name": "戦太鼓",
      "icon": "🥁",
      "atk": 0,
      "def": 0,
      "effects": [
        {
          "type": "rowBuff",
          "stat": "spd",
          "mode": "pct",
          "value": 0.2
        }
      ]
    },
    {
      "id": "i_ward",
      "kind": "item",
      "name": "結界石",
      "icon": "🔷",
      "atk": 0,
      "def": 0,
      "effects": [
        {
          "type": "teamBuff",
          "stat": "def",
          "mode": "add",
          "value": 10
        }
      ]
    },
    {
      "id": "i_censer",
      "kind": "item",
      "name": "毒の香炉",
      "icon": "🏺",
      "atk": 0,
      "def": 0,
      "effects": [
        {
          "type": "pulse",
          "status": "poison",
          "amount": 1,
          "interval": 1
        }
      ]
    },
    {
      "id": "i_doll",
      "kind": "item",
      "name": "呪いの人形",
      "icon": "🪆",
      "atk": 0,
      "def": 0,
      "effects": [
        {
          "type": "pulse",
          "status": "curse",
          "amount": 4,
          "interval": 3
        }
      ]
    }
  ],
  "tribes": {
    "warrior": {
      "name": "戦士",
      "color": "#d9644a",
      "bonuses": {
        "2": [
          {
            "type": "statBuff",
            "stat": "def",
            "value": 10,
            "mode": "add",
            "scope": "tribe"
          }
        ],
        "3": [
          {
            "type": "statBuff",
            "stat": "def",
            "value": 20,
            "mode": "add",
            "scope": "tribe"
          }
        ],
        "5": [
          {
            "type": "statBuff",
            "stat": "def",
            "value": 30,
            "mode": "add",
            "scope": "tribe"
          }
        ],
        "7": [
          {
            "type": "statBuff",
            "stat": "def",
            "value": 35,
            "mode": "add",
            "scope": "tribe"
          }
        ]
      }
    },
    "mage": {
      "name": "魔導",
      "color": "#9b6ad6",
      "bonuses": {
        "2": [
          {
            "type": "poisonBonus",
            "value": 1
          }
        ],
        "3": [
          {
            "type": "poisonBonus",
            "value": 1.5
          }
        ],
        "5": [
          {
            "type": "poisonBonus",
            "value": 2
          }
        ],
        "7": [
          {
            "type": "poisonBonus",
            "value": 2.5
          }
        ]
      }
    },
    "beast": {
      "name": "獣",
      "color": "#6aa84f",
      "bonuses": {
        "2": [
          {
            "type": "statBuff",
            "stat": "spd",
            "value": 0.1,
            "mode": "pct",
            "scope": "tribe"
          }
        ],
        "3": [
          {
            "type": "statBuff",
            "stat": "spd",
            "value": 0.15,
            "mode": "pct",
            "scope": "tribe"
          }
        ],
        "5": [
          {
            "type": "statBuff",
            "stat": "spd",
            "value": 0.18,
            "mode": "pct",
            "scope": "tribe"
          }
        ],
        "7": [
          {
            "type": "statBuff",
            "stat": "spd",
            "value": 0.25,
            "mode": "pct",
            "scope": "tribe"
          }
        ]
      }
    },
    "machine": {
      "name": "機械",
      "color": "#4a90c2",
      "bonuses": {
        "2": [
          {
            "type": "regen",
            "value": 0.004
          }
        ],
        "3": [
          {
            "type": "regen",
            "value": 0.008
          }
        ],
        "5": [
          {
            "type": "regen",
            "value": 0.01
          },
          {
            "type": "paralyzeBonus",
            "value": 0.5
          }
        ],
        "7": [
          {
            "type": "regen",
            "value": 0.015
          },
          {
            "type": "paralyzeBonus",
            "value": 1
          }
        ]
      }
    },
    "neutral": {
      "name": "中立",
      "color": "#b8b08a",
      "bonuses": {
        "1": [
          {
            "type": "statBuff",
            "stat": "hp",
            "value": 0.2,
            "mode": "pct",
            "scope": "tribe"
          },
          {
            "type": "statBuff",
            "stat": "atk",
            "value": 0.2,
            "mode": "pct",
            "scope": "tribe"
          },
          {
            "type": "statBuff",
            "stat": "def",
            "value": 0.2,
            "mode": "pct",
            "scope": "tribe"
          },
          {
            "type": "statBuff",
            "stat": "spd",
            "value": 0.2,
            "mode": "pct",
            "scope": "tribe"
          }
        ],
        "2": [
          {
            "type": "statBuff",
            "stat": "hp",
            "value": 0.1,
            "mode": "pct",
            "scope": "tribe"
          },
          {
            "type": "statBuff",
            "stat": "atk",
            "value": 0.1,
            "mode": "pct",
            "scope": "tribe"
          },
          {
            "type": "statBuff",
            "stat": "def",
            "value": 0.1,
            "mode": "pct",
            "scope": "tribe"
          },
          {
            "type": "statBuff",
            "stat": "spd",
            "value": 0.1,
            "mode": "pct",
            "scope": "tribe"
          }
        ],
        "3": [
          {
            "type": "statBuff",
            "stat": "hp",
            "value": 0.05,
            "mode": "pct",
            "scope": "tribe"
          },
          {
            "type": "statBuff",
            "stat": "atk",
            "value": 0.05,
            "mode": "pct",
            "scope": "tribe"
          },
          {
            "type": "statBuff",
            "stat": "def",
            "value": 0.05,
            "mode": "pct",
            "scope": "tribe"
          },
          {
            "type": "statBuff",
            "stat": "spd",
            "value": 0.05,
            "mode": "pct",
            "scope": "tribe"
          }
        ]
      }
    }
  },
  "relics": [
    {
      "id": "r_whetstone",
      "name": "砥石",
      "icon": "🪨",
      "effects": [
        {
          "type": "statBuff",
          "stat": "atk",
          "value": 4,
          "mode": "add",
          "scope": "team"
        }
      ]
    },
    {
      "id": "r_amulet",
      "name": "守りの護符",
      "icon": "🧿",
      "effects": [
        {
          "type": "statBuff",
          "stat": "def",
          "value": 10,
          "mode": "add",
          "scope": "team"
        }
      ]
    },
    {
      "id": "r_hourglass",
      "name": "砂時計",
      "icon": "⏳",
      "effects": [
        {
          "type": "statBuff",
          "stat": "spd",
          "value": 0.05,
          "mode": "pct",
          "scope": "team"
        }
      ]
    },
    {
      "id": "r_heart",
      "name": "生命の結晶",
      "icon": "💎",
      "effects": [
        {
          "type": "statBuff",
          "stat": "hp",
          "value": 0.1,
          "mode": "pct",
          "scope": "team"
        }
      ]
    },
    {
      "id": "r_warhorn",
      "name": "戦の角笛",
      "icon": "📯",
      "effects": [
        {
          "type": "statBuff",
          "stat": "atk",
          "value": 0.15,
          "mode": "pct",
          "scope": "team",
          "tribe": "warrior"
        }
      ]
    },
    {
      "id": "r_grimoire",
      "name": "魔導書",
      "icon": "📕",
      "effects": [
        {
          "type": "statBuff",
          "stat": "atk",
          "value": 0.2,
          "mode": "pct",
          "scope": "team",
          "tribe": "mage"
        }
      ]
    },
    {
      "id": "r_totem",
      "name": "獣のトーテム",
      "icon": "🪶",
      "effects": [
        {
          "type": "statBuff",
          "stat": "spd",
          "value": 0.1,
          "mode": "pct",
          "scope": "team",
          "tribe": "beast"
        }
      ]
    },
    {
      "id": "r_spring",
      "name": "癒しの泉",
      "icon": "⛲",
      "effects": [
        {
          "type": "heal",
          "amount": 10,
          "interval": 1
        }
      ]
    },
    {
      "id": "r_gearheart",
      "name": "歯車の心臓",
      "icon": "🫀",
      "effects": [
        {
          "type": "statBuff",
          "stat": "def",
          "value": 15,
          "mode": "add",
          "scope": "team",
          "tribe": "machine"
        },
        {
          "type": "heal",
          "amount": 5,
          "interval": 1
        }
      ]
    },
    {
      "id": "r_thunder",
      "name": "雷の宝珠",
      "icon": "🔆",
      "effects": [
        {
          "type": "paralyzeBonus",
          "value": 1
        }
      ]
    },
    {
      "id": "r_phalanx",
      "name": "方陣の旗",
      "icon": "🏳️",
      "effects": [
        {
          "type": "fullRowBuff",
          "stat": "atk",
          "value": 0.1,
          "mode": "pct"
        },
        {
          "type": "fullRowBuff",
          "stat": "def",
          "value": 10,
          "mode": "add"
        }
      ]
    },
    {
      "id": "r_lone",
      "name": "孤高の紋章",
      "icon": "🎖️",
      "effects": [
        {
          "type": "statBuff",
          "stat": "hp",
          "value": 0.2,
          "mode": "pct",
          "scope": "team",
          "tribe": "neutral"
        }
      ]
    },
    {
      "id": "r_antidote",
      "name": "解毒の聖水",
      "icon": "💧",
      "effects": [
        {
          "type": "poisonResist",
          "value": 0.2
        }
      ]
    }
  ],
  "presets": [
    {
      "id": "p_square_knights",
      "name": "鉄壁の騎士団",
      "board": "square",
      "tier": "normal",
      "slots": [
        {
          "pos": [
            1,
            1
          ],
          "pieceId": "c_knight"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_paladin"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_knight"
        },
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "i_shield"
        },
        {
          "pos": [
            2,
            2
          ],
          "pieceId": "c_swordmaster"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_hawk"
        },
        {
          "pos": [
            1,
            3
          ],
          "pieceId": "i_spear"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "c_lion"
        },
        {
          "pos": [
            3,
            3
          ],
          "pieceId": "i_potion"
        }
      ],
      "relics": [
        "r_amulet",
        "r_warhorn",
        "r_heart"
      ]
    },
    {
      "id": "p_honeycomb_pack",
      "name": "獣の群れ",
      "board": "honeycomb",
      "tier": "normal",
      "slots": [
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "c_bear"
        },
        {
          "pos": [
            1,
            4
          ],
          "pieceId": "c_behemoth"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_bear"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "i_blade"
        },
        {
          "pos": [
            2,
            5
          ],
          "pieceId": "c_lion"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_boar"
        },
        {
          "pos": [
            3,
            4
          ],
          "pieceId": "c_lion"
        }
      ],
      "relics": [
        "r_totem",
        "r_hourglass",
        "r_whetstone"
      ]
    },
    {
      "id": "p_pentagram_cult",
      "name": "毒の結社",
      "board": "pentagram",
      "tier": "normal",
      "slots": [
        {
          "pos": [
            1,
            3
          ],
          "pieceId": "i_vial"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_knight"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_knight"
        },
        {
          "pos": [
            2,
            2
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "c_hexer"
        },
        {
          "pos": [
            2,
            4
          ],
          "pieceId": "c_cursemaster"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            3,
            3
          ],
          "pieceId": "c_witch"
        },
        {
          "pos": [
            3,
            4
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            4,
            3
          ],
          "pieceId": "i_potion"
        }
      ],
      "relics": [
        "r_hourglass",
        "r_spring",
        "r_amulet"
      ]
    },
    {
      "id": "p_honeycomb_wild",
      "name": "野生火力",
      "board": "honeycomb",
      "tier": "hard",
      "slots": [
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "c_lion"
        },
        {
          "pos": [
            1,
            4
          ],
          "pieceId": "c_lion"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_behemoth"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "i_blade"
        },
        {
          "pos": [
            2,
            5
          ],
          "pieceId": "c_leopard"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_leopard"
        },
        {
          "pos": [
            3,
            4
          ],
          "pieceId": "c_lion"
        }
      ],
      "relics": [
        "r_totem",
        "r_whetstone",
        "r_hourglass"
      ]
    },
    {
      "id": "p_honeycomb_kingdom",
      "name": "キングダム",
      "board": "honeycomb",
      "tier": "hard",
      "slots": [
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "c_guard"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_paladin"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_knight"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "c_general"
        },
        {
          "pos": [
            1,
            4
          ],
          "pieceId": "c_swordmaster"
        },
        {
          "pos": [
            2,
            5
          ],
          "pieceId": "c_squire"
        },
        {
          "pos": [
            3,
            4
          ],
          "pieceId": "c_squire"
        }
      ],
      "relics": [
        "r_amulet",
        "r_warhorn",
        "r_heart"
      ]
    },
    {
      "id": "p_pentagram_venom",
      "name": "毒魔術",
      "board": "pentagram",
      "tier": "hard",
      "slots": [
        {
          "pos": [
            4,
            3
          ],
          "pieceId": "i_vial"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_knight"
        },
        {
          "pos": [
            2,
            2
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "c_hexer"
        },
        {
          "pos": [
            2,
            4
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            2,
            5
          ],
          "pieceId": "c_witch"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_knight"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            3,
            3
          ],
          "pieceId": "c_hexer"
        },
        {
          "pos": [
            3,
            4
          ],
          "pieceId": "c_apprentice"
        }
      ],
      "relics": [
        "r_hourglass",
        "r_spring",
        "r_amulet"
      ]
    },
    {
      "id": "p_honeycomb_archmagic",
      "name": "大魔術",
      "board": "honeycomb",
      "tier": "hard",
      "slots": [
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "c_dragonkin"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_knight"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_cursemaster"
        },
        {
          "pos": [
            1,
            4
          ],
          "pieceId": "c_sorcerer"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "c_pyromancer"
        },
        {
          "pos": [
            2,
            5
          ],
          "pieceId": "c_pyromancer"
        },
        {
          "pos": [
            3,
            4
          ],
          "pieceId": "c_sorcerer"
        }
      ],
      "relics": [
        "r_grimoire",
        "r_whetstone",
        "r_amulet"
      ]
    },
    {
      "id": "p_square_factory",
      "name": "機械工廠",
      "board": "square",
      "tier": "hard",
      "slots": [
        {
          "pos": [
            1,
            1
          ],
          "pieceId": "c_golem"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_tesla"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_golem"
        },
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "c_medibot"
        },
        {
          "pos": [
            2,
            2
          ],
          "pieceId": "i_gear"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_drone"
        },
        {
          "pos": [
            1,
            3
          ],
          "pieceId": "c_turret"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "c_fighter"
        },
        {
          "pos": [
            3,
            3
          ],
          "pieceId": "c_drone"
        }
      ],
      "relics": [
        "r_gearheart",
        "r_thunder",
        "r_spring"
      ]
    },
    {
      "id": "p_square_rush",
      "name": "獣速攻",
      "board": "square",
      "tier": "hard",
      "slots": [
        {
          "pos": [
            1,
            1
          ],
          "pieceId": "c_leopard"
        },
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "c_wolf"
        },
        {
          "pos": [
            1,
            3
          ],
          "pieceId": "c_lion"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_leopard"
        },
        {
          "pos": [
            2,
            2
          ],
          "pieceId": "i_blade"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "c_leopard"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_leopard"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_wolf"
        },
        {
          "pos": [
            3,
            3
          ],
          "pieceId": "c_lion"
        }
      ],
      "relics": [
        "r_totem",
        "r_hourglass",
        "r_whetstone"
      ]
    },
    {
      "id": "p_square_phalanx",
      "name": "方陣",
      "board": "square",
      "tier": "hard",
      "slots": [
        {
          "pos": [
            1,
            1
          ],
          "pieceId": "c_paladin"
        },
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "c_lion"
        },
        {
          "pos": [
            1,
            3
          ],
          "pieceId": "i_drum"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_dwarf"
        },
        {
          "pos": [
            2,
            2
          ],
          "pieceId": "c_swordmaster"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "c_hawk"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_knight"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_witch"
        },
        {
          "pos": [
            3,
            3
          ],
          "pieceId": "c_wolf"
        }
      ],
      "relics": [
        "r_phalanx",
        "r_amulet",
        "r_whetstone"
      ]
    }
  ]
};
