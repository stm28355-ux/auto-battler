import { pieceCost } from '../core/cost.js';
import { OFFER } from './config.js';

// 報酬の候補（spec §15）。どれも「セット」の配列を返す。プレイヤーはセットを1つ選ぶ。

const pickWeighted = (list, weight, rng) => {
  const total = list.reduce((s, x) => s + weight(x), 0);
  let r = rng() * total;
  for (const x of list) {
    r -= weight(x);
    if (r < 0) return x;
  }
  return list[list.length - 1];
};

// 普通の駒：キャラ7：道具3。その中で、コストの低い駒ほど出やすい
export function normalPiece(pieces, rng) {
  const kind = rng() < OFFER.itemRate ? 'item' : 'character';
  const list = pieces.filter((p) => p.kind === kind);
  return pickWeighted(list, (p) => 1 / pieceCost(p) ** OFFER.costPow, rng).id;
}

// レア駒：キャラはコスト4以上、道具はコスト3以上。キャラ・道具に関係なく均等
export const isRare = (p) => pieceCost(p) >= OFFER.rareMin[p.kind];
export function rarePiece(pieces, rng) {
  const list = pieces.filter(isRare);
  return list[Math.floor(rng() * list.length)].id;
}

// 駒2個のセットを3つ
export function pieceOffer(pieces, rng, { rare = false } = {}) {
  const one = () => (rare ? rarePiece(pieces, rng) : normalPiece(pieces, rng));
  return Array.from({ length: OFFER.sets }, () => [one(), one()]);
}

// 候補に出せる遺物：均等。解毒の聖水を上限まで持っていたら出さない
export function relicPool(relics, owned = {}) {
  return relics.filter((r) => !(r.id === OFFER.antidoteId && (owned[r.id] ?? 0) >= OFFER.antidoteMax));
}

// 遺物 perSet 個のセットを3つ（セットの中では重ならない）
export function relicOffer(relics, owned, rng, perSet = 1) {
  const pool = relicPool(relics, owned);
  return Array.from({ length: OFFER.sets }, () => {
    const left = [...pool];
    const set = [];
    while (set.length < perSet && left.length) set.push(left.splice(Math.floor(rng() * left.length), 1)[0].id);
    return set;
  });
}
