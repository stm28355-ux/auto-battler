// ゲーム側で用意するチーム。Phase 6（ランダムマッチ）で数を増やす。

export const PRESET_TEAMS = [
  {
    id: 'p_square_knights',
    name: '鉄壁の騎士団',
    board: 'square',
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
    slots: [
      { pos: [1, 3], pieceId: 'c_drone' },
      { pos: [2, 1], pieceId: 'c_apprentice' },
      { pos: [2, 2], pieceId: 'i_vial' },
      { pos: [3, 1], pieceId: 'c_apprentice' },
      { pos: [3, 2], pieceId: 'c_hexer' },
    ],
    relics: ['r_grimoire'],
  },
];
