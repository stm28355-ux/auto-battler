// Ver.1 の環境（tools/snapshot-env.js で書き出したもの。手で直さない）
export default {
  "id": "v1",
  "name": "Ver.1",
  "status": "保存版",
  "note": "Ver.1の環境をそのまま残したもの。",
  "balance": {
    "damageScale": 1,
    "poisonDamage": 0.25,
    "poisonDuration": null,
    "paralyzeFactor": 0.5,
    "cost": {
      "step": 1,
      "ceil": 0,
      "curve": 1.6,
      "scale": 1.3,
      "hp": 400,
      "atkSpd": 40,
      "def": 55,
      "itemAtk": 16,
      "itemDef": 25,
      "poison": 0.5,
      "paralyze": 1,
      "adjAtkMult": 4.5,
      "heal": 0.1,
      "rowBuff": 3
    }
  },
  "costCaps": {
    "pentagram": 40,
    "square": 50,
    "honeycomb": 60
  },
  "characters": [
    {
      "id": "c_squire",
      "kind": "character",
      "name": "見習い剣士",
      "icon": "🗡️",
      "tribe": "warrior",
      "hp": 220,
      "atk": 25,
      "def": 20,
      "spd": 1,
      "effects": []
    },
    {
      "id": "c_knight",
      "kind": "character",
      "name": "騎士",
      "icon": "🤺",
      "tribe": "warrior",
      "hp": 450,
      "atk": 25,
      "def": 60,
      "spd": 0.8,
      "effects": []
    },
    {
      "id": "c_berserker",
      "kind": "character",
      "name": "狂戦士",
      "icon": "🪓",
      "tribe": "warrior",
      "hp": 300,
      "atk": 55,
      "def": 10,
      "spd": 1.2,
      "effects": []
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
      "id": "c_sorcerer",
      "kind": "character",
      "name": "雷術師",
      "icon": "⚡",
      "tribe": "mage",
      "hp": 220,
      "atk": 40,
      "def": 10,
      "spd": 0.8,
      "effects": [
        {
          "type": "paralyze",
          "target": "fastest",
          "duration": 3,
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
      "atk": 20,
      "def": 10,
      "spd": 2,
      "effects": []
    },
    {
      "id": "c_bear",
      "kind": "character",
      "name": "熊",
      "icon": "🐻",
      "tribe": "beast",
      "hp": 500,
      "atk": 35,
      "def": 25,
      "spd": 0.7,
      "effects": []
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
      "id": "c_drone",
      "kind": "character",
      "name": "偵察機",
      "icon": "🛸",
      "tribe": "machine",
      "hp": 150,
      "atk": 20,
      "def": 20,
      "spd": 1.5,
      "effects": []
    },
    {
      "id": "c_golem",
      "kind": "character",
      "name": "ゴーレム",
      "icon": "🗿",
      "tribe": "machine",
      "hp": 700,
      "atk": 20,
      "def": 40,
      "spd": 0.6,
      "effects": []
    },
    {
      "id": "c_medibot",
      "kind": "character",
      "name": "修理ロボ",
      "icon": "🔧",
      "tribe": "machine",
      "hp": 250,
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
      "id": "c_dragoon",
      "kind": "character",
      "name": "竜騎士",
      "icon": "🐉",
      "tribe": "warrior",
      "hp": 600,
      "atk": 60,
      "def": 50,
      "spd": 1,
      "effects": []
    },
    {
      "id": "c_general",
      "kind": "character",
      "name": "将軍",
      "icon": "👑",
      "tribe": "warrior",
      "hp": 650,
      "atk": 55,
      "def": 50,
      "spd": 1,
      "effects": [
        {
          "type": "adjAtkMult",
          "mult": 0.25
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
      "id": "c_behemoth",
      "kind": "character",
      "name": "古の巨獣",
      "icon": "🦣",
      "tribe": "beast",
      "hp": 900,
      "atk": 45,
      "def": 40,
      "spd": 0.9,
      "effects": []
    },
    {
      "id": "c_fighter",
      "kind": "character",
      "name": "戦闘機",
      "icon": "✈️",
      "tribe": "machine",
      "hp": 450,
      "atk": 55,
      "def": 40,
      "spd": 1.3,
      "effects": []
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
          "value": 10
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
          "type": "rowBuff",
          "stat": "atk",
          "mode": "add",
          "value": 8
        }
      ]
    },
    {
      "id": "c_boar",
      "kind": "character",
      "name": "猪",
      "icon": "🐗",
      "tribe": "beast",
      "hp": 350,
      "atk": 32,
      "def": 15,
      "spd": 1.1,
      "effects": []
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
      "id": "c_turret",
      "kind": "character",
      "name": "砲台",
      "icon": "🗼",
      "tribe": "machine",
      "hp": 300,
      "atk": 45,
      "def": 30,
      "spd": 0.8,
      "effects": []
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
      "id": "c_elf",
      "kind": "character",
      "name": "エルフ",
      "icon": "🧝",
      "tribe": "neutral",
      "hp": 220,
      "atk": 25,
      "def": 10,
      "spd": 1.2,
      "effects": []
    },
    {
      "id": "c_dwarf",
      "kind": "character",
      "name": "ドワーフ",
      "icon": "⛏️",
      "tribe": "neutral",
      "hp": 450,
      "atk": 35,
      "def": 40,
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
      "id": "c_fiend",
      "kind": "character",
      "name": "魔人",
      "icon": "👹",
      "tribe": "neutral",
      "hp": 700,
      "atk": 55,
      "def": 40,
      "spd": 1.1,
      "effects": []
    }
  ],
  "items": [
    {
      "id": "i_sword",
      "kind": "item",
      "name": "鉄の剣",
      "icon": "⚔️",
      "atk": 25,
      "def": 0,
      "effects": []
    },
    {
      "id": "i_shield",
      "kind": "item",
      "name": "木の盾",
      "icon": "🛡️",
      "atk": 0,
      "def": 55,
      "effects": []
    },
    {
      "id": "i_spear",
      "kind": "item",
      "name": "槍",
      "icon": "🔱",
      "atk": 15,
      "def": 18,
      "effects": []
    },
    {
      "id": "i_gear",
      "kind": "item",
      "name": "歯車",
      "icon": "⚙️",
      "atk": 10,
      "def": 25,
      "effects": []
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
          "type": "adjAtkMult",
          "mult": 0.5
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
          "chance": 0.6
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
          "duration": 3,
          "chance": 0.4
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
          "amount": 18,
          "interval": 1
        }
      ]
    },
    {
      "id": "i_blade",
      "kind": "item",
      "name": "魔剣",
      "icon": "🗡️",
      "atk": 60,
      "def": 0,
      "effects": []
    },
    {
      "id": "i_armor",
      "kind": "item",
      "name": "聖鎧",
      "icon": "🥋",
      "atk": 0,
      "def": 95,
      "effects": []
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
          "type": "adjAtkMult",
          "mult": 0.8
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
            "value": 15,
            "mode": "add",
            "scope": "tribe"
          }
        ],
        "3": [
          {
            "type": "statBuff",
            "stat": "def",
            "value": 30,
            "mode": "add",
            "scope": "tribe"
          }
        ],
        "5": [
          {
            "type": "statBuff",
            "stat": "def",
            "value": 50,
            "mode": "add",
            "scope": "tribe"
          }
        ],
        "7": [
          {
            "type": "statBuff",
            "stat": "def",
            "value": 75,
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
            "value": 0.12,
            "mode": "pct",
            "scope": "tribe"
          }
        ],
        "3": [
          {
            "type": "statBuff",
            "stat": "spd",
            "value": 0.18,
            "mode": "pct",
            "scope": "tribe"
          }
        ],
        "5": [
          {
            "type": "statBuff",
            "stat": "spd",
            "value": 0.22,
            "mode": "pct",
            "scope": "tribe"
          }
        ],
        "7": [
          {
            "type": "statBuff",
            "stat": "spd",
            "value": 0.28,
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
            "type": "statBuff",
            "stat": "hp",
            "value": 0.1,
            "mode": "pct",
            "scope": "team"
          }
        ],
        "3": [
          {
            "type": "statBuff",
            "stat": "hp",
            "value": 0.2,
            "mode": "pct",
            "scope": "team"
          }
        ],
        "5": [
          {
            "type": "statBuff",
            "stat": "hp",
            "value": 0.35,
            "mode": "pct",
            "scope": "team"
          }
        ],
        "7": [
          {
            "type": "statBuff",
            "stat": "hp",
            "value": 0.5,
            "mode": "pct",
            "scope": "team"
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
            "stat": "atk",
            "value": 0.1,
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
          "value": 0.08,
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
          "value": 0.15,
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
            1,
            2
          ],
          "pieceId": "i_banner"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_squire"
        },
        {
          "pos": [
            2,
            2
          ],
          "pieceId": "c_berserker"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "i_sword"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_squire"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "i_shield"
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
        "r_amulet"
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
          "pieceId": "c_wolf"
        },
        {
          "pos": [
            1,
            4
          ],
          "pieceId": "c_viper"
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
          "pieceId": "i_banner"
        },
        {
          "pos": [
            2,
            5
          ],
          "pieceId": "i_gear"
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
            4
          ],
          "pieceId": "c_bear"
        }
      ],
      "relics": []
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
          "pieceId": "c_drone"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            2,
            2
          ],
          "pieceId": "i_vial"
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
          "pieceId": "i_banner"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_hexer"
        },
        {
          "pos": [
            3,
            3
          ],
          "pieceId": "i_vial"
        }
      ],
      "relics": [
        "r_grimoire"
      ]
    },
    {
      "id": "p_square_recruits",
      "name": "新兵の訓練隊",
      "board": "square",
      "tier": "easy",
      "slots": [
        {
          "pos": [
            1,
            1
          ],
          "pieceId": "c_squire"
        },
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "i_spear"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_squire"
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
            1
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "i_vial"
        },
        {
          "pos": [
            3,
            3
          ],
          "pieceId": "i_sword"
        }
      ],
      "relics": []
    },
    {
      "id": "p_honeycomb_stray",
      "name": "迷いの獣道",
      "board": "honeycomb",
      "tier": "easy",
      "slots": [
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
            4
          ],
          "pieceId": "c_viper"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_wolf"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "i_spear"
        },
        {
          "pos": [
            2,
            5
          ],
          "pieceId": "i_gear"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_viper"
        },
        {
          "pos": [
            3,
            4
          ],
          "pieceId": "c_squire"
        }
      ],
      "relics": []
    },
    {
      "id": "p_pentagram_novices",
      "name": "見習いの集い",
      "board": "pentagram",
      "tier": "easy",
      "slots": [
        {
          "pos": [
            1,
            3
          ],
          "pieceId": "c_drone"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_squire"
        },
        {
          "pos": [
            2,
            2
          ],
          "pieceId": "i_spear"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "c_wolf"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_squire"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "i_gear"
        }
      ],
      "relics": []
    },
    {
      "id": "p_square_beastking",
      "name": "獣王の軍勢",
      "board": "square",
      "tier": "hard",
      "slots": [
        {
          "pos": [
            1,
            1
          ],
          "pieceId": "c_behemoth"
        },
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "i_banner"
        },
        {
          "pos": [
            1,
            3
          ],
          "pieceId": "i_blade"
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
            2
          ],
          "pieceId": "c_wolf"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "i_vial"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_bear"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_viper"
        },
        {
          "pos": [
            3,
            3
          ],
          "pieceId": "i_gear"
        }
      ],
      "relics": [
        "r_totem",
        "r_hourglass",
        "r_whetstone"
      ]
    },
    {
      "id": "p_honeycomb_factory",
      "name": "機械工廠",
      "board": "honeycomb",
      "tier": "hard",
      "slots": [
        {
          "pos": [
            1,
            2
          ],
          "pieceId": "c_fighter"
        },
        {
          "pos": [
            1,
            4
          ],
          "pieceId": "c_golem"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_golem"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "i_crown"
        },
        {
          "pos": [
            2,
            5
          ],
          "pieceId": "i_gear"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "c_medibot"
        },
        {
          "pos": [
            3,
            4
          ],
          "pieceId": "c_fighter"
        }
      ],
      "relics": [
        "r_heart",
        "r_hourglass",
        "r_amulet"
      ]
    },
    {
      "id": "p_pentagram_ritual",
      "name": "呪いの儀式",
      "board": "pentagram",
      "tier": "hard",
      "slots": [
        {
          "pos": [
            1,
            3
          ],
          "pieceId": "c_archmage"
        },
        {
          "pos": [
            2,
            1
          ],
          "pieceId": "c_hexer"
        },
        {
          "pos": [
            2,
            2
          ],
          "pieceId": "i_vial"
        },
        {
          "pos": [
            2,
            3
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            2,
            4
          ],
          "pieceId": "i_stungun"
        },
        {
          "pos": [
            2,
            5
          ],
          "pieceId": "c_viper"
        },
        {
          "pos": [
            3,
            1
          ],
          "pieceId": "c_hexer"
        },
        {
          "pos": [
            3,
            2
          ],
          "pieceId": "i_vial"
        },
        {
          "pos": [
            3,
            3
          ],
          "pieceId": "c_apprentice"
        },
        {
          "pos": [
            3,
            4
          ],
          "pieceId": "i_banner"
        },
        {
          "pos": [
            4,
            3
          ],
          "pieceId": "c_sorcerer"
        }
      ],
      "relics": [
        "r_grimoire",
        "r_hourglass",
        "r_amulet"
      ]
    }
  ]
};
