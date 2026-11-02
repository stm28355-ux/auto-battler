import { CHARACTERS, ITEMS } from '../data/pieces.js';
import { RELICS } from '../data/relics.js';

// 初期の駒・遺物に自作駒を加えた辞書。チーム編成や戦闘はここから駒を引く。
export function createCatalog(customPieces = []) {
  const pieces = new Map([...CHARACTERS, ...ITEMS, ...customPieces].map((p) => [p.id, p]));
  const relics = new Map(RELICS.map((r) => [r.id, r]));
  return {
    piece: (id) => pieces.get(id),
    relic: (id) => relics.get(id),
    pieces: () => [...pieces.values()],
    relics: () => [...relics.values()],
  };
}
