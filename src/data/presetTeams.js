// ゲーム側で用意するチーム。ランダムマッチの対戦相手になる。
// tier: 強さ（easy / normal / hard）。同じボードの中で、コストと構成が上がっていく。
// 上の3つ（normal）はテストでも使うので、順番を変えない。

export const TIERS = {
  easy: { name: 'やさしい' },
  normal: { name: 'ふつう' },
  hard: { name: 'つよい' },
};

export const PRESET_TEAMS = [
  // ---- ふつう ----
  {
    id: 'p_square_knights',
    name: '鉄壁の騎士団',
    board: 'square',
    tier: 'normal',
    slots: [
      { pos: [1, 1], pieceId: 'c_knight' },
      { pos: [1, 2], pieceId: 'i_banner' },
      { pos: [2, 1], pieceId: 'c_squire' },
      { pos: [2, 2], pieceId: 'c_berserker' },
      { pos: [3, 1], pieceId: 'c_squire' },
    ],
    relics: ['r_amulet'],
  },
  {
    id: 'p_honeycomb_pack',
    name: '獣の群れ',
    board: 'honeycomb',
    tier: 'normal',
    slots: [
      { pos: [1, 2], pieceId: 'c_wolf' },
      { pos: [1, 4], pieceId: 'c_viper' },
      { pos: [2, 1], pieceId: 'c_bear' },
      { pos: [2, 3], pieceId: 'i_banner' },
      { pos: [2, 5], pieceId: 'i_spear' },
      { pos: [3, 2], pieceId: 'c_wolf' },
      { pos: [3, 4], pieceId: 'c_viper' },
    ],
    relics: ['r_totem'],
  },
  {
    id: 'p_pentagram_cult',
    name: '毒の結社',
    board: 'pentagram',
    tier: 'normal',
    slots: [
      { pos: [1, 3], pieceId: 'c_drone' },
      { pos: [2, 1], pieceId: 'c_apprentice' },
      { pos: [2, 2], pieceId: 'i_vial' },
      { pos: [3, 1], pieceId: 'c_apprentice' },
      { pos: [3, 2], pieceId: 'c_hexer' },
    ],
    relics: ['r_grimoire'],
  },

  // ---- やさしい ----
  {
    id: 'p_square_recruits',
    name: '新兵の訓練隊',
    board: 'square',
    tier: 'easy',
    slots: [
      { pos: [1, 1], pieceId: 'c_squire' },
      { pos: [1, 2], pieceId: 'i_spear' },
      { pos: [2, 1], pieceId: 'c_squire' },
      { pos: [2, 2], pieceId: 'i_gear' },
      { pos: [3, 1], pieceId: 'c_apprentice' },
      { pos: [3, 2], pieceId: 'i_vial' },
    ],
    relics: [],
  },
  {
    id: 'p_honeycomb_stray',
    name: '迷いの獣道',
    board: 'honeycomb',
    tier: 'easy',
    slots: [
      { pos: [1, 2], pieceId: 'c_wolf' },
      { pos: [2, 1], pieceId: 'c_wolf' },
      { pos: [2, 3], pieceId: 'i_spear' },
      { pos: [3, 2], pieceId: 'c_viper' },
    ],
    relics: [],
  },
  {
    id: 'p_pentagram_novices',
    name: '見習いの集い',
    board: 'pentagram',
    tier: 'easy',
    slots: [
      { pos: [2, 1], pieceId: 'c_squire' },
      { pos: [2, 2], pieceId: 'i_spear' },
      { pos: [3, 1], pieceId: 'c_squire' },
      { pos: [3, 2], pieceId: 'i_gear' },
    ],
    relics: [],
  },

  // ---- つよい ----
  {
    id: 'p_square_beastking',
    name: '獣王の軍勢',
    board: 'square',
    tier: 'hard',
    slots: [
      { pos: [1, 1], pieceId: 'c_bear' },
      { pos: [1, 2], pieceId: 'i_banner' },
      { pos: [1, 3], pieceId: 'i_sword' },
      { pos: [2, 1], pieceId: 'c_wolf' },
      { pos: [2, 2], pieceId: 'c_wolf' },
      { pos: [2, 3], pieceId: 'i_vial' },
      { pos: [3, 1], pieceId: 'c_bear' },
      { pos: [3, 2], pieceId: 'c_viper' },
      { pos: [3, 3], pieceId: 'i_gear' },
    ],
    relics: ['r_totem', 'r_hourglass', 'r_whetstone'],
  },
  {
    id: 'p_honeycomb_factory',
    name: '機械工廠',
    board: 'honeycomb',
    tier: 'hard',
    slots: [
      { pos: [1, 2], pieceId: 'c_drone' },
      { pos: [1, 4], pieceId: 'c_golem' },
      { pos: [2, 1], pieceId: 'c_golem' },
      { pos: [2, 3], pieceId: 'i_banner' },
      { pos: [2, 5], pieceId: 'i_gear' },
      { pos: [3, 2], pieceId: 'c_medibot' },
      { pos: [3, 4], pieceId: 'c_drone' },
    ],
    relics: ['r_heart', 'r_hourglass', 'r_amulet'],
  },
  {
    id: 'p_pentagram_ritual',
    name: '呪いの儀式',
    board: 'pentagram',
    tier: 'hard',
    slots: [
      { pos: [1, 3], pieceId: 'c_sorcerer' },
      { pos: [2, 1], pieceId: 'c_hexer' },
      { pos: [2, 2], pieceId: 'i_vial' },
      { pos: [2, 3], pieceId: 'c_apprentice' },
      { pos: [2, 4], pieceId: 'i_stungun' },
      { pos: [3, 1], pieceId: 'c_hexer' },
      { pos: [3, 2], pieceId: 'i_vial' },
      { pos: [3, 3], pieceId: 'c_apprentice' },
      { pos: [3, 4], pieceId: 'i_banner' },
    ],
    relics: ['r_grimoire', 'r_hourglass', 'r_amulet'],
  },
];
