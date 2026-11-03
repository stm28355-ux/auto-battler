import { pieceCost } from '../core/cost.js';
import { BASE_LIFE, DEFAULT_PIECES, INITIAL_POINTS, LIMITS, PERKS, piecePrice, PRICES } from './config.js';

// 引継ぎ（spec §15）：ゲームオーバーなどで貯めたポイントを、挑戦の前に割り振る。割り振りはいつでも無料でやり直せる。
//   meta: { points: これまでに得たポイントの合計, alloc, best: 到達した最高の層, clears: { front, top }, runs: 挑戦した回数 }
//   alloc: { reroll: リロール回数, life: 追加のライフ, relics: { ID: 数 }, pieces: { ID: 数 }, perks: { shortcut, bossHeal, strongRare } }

export const defaultAlloc = () => ({ reroll: 0, life: 0, relics: {}, pieces: { ...DEFAULT_PIECES }, perks: {} });
export const defaultMeta = () => ({ points: INITIAL_POINTS, alloc: defaultAlloc(), best: 0, clears: { front: 0, top: 0 }, runs: 0 });

export const lifeOf = (alloc) => BASE_LIFE + alloc.life;
export const maxExtraLife = LIMITS.life - BASE_LIFE;

// 割り振りに使っているポイント
export function allocCost(alloc, catalog) {
  const sum = (obj, price) => Object.entries(obj).reduce((s, [id, n]) => s + n * price(id), 0);
  return alloc.reroll * PRICES.reroll
    + alloc.life * PRICES.life
    + sum(alloc.relics, () => PRICES.relic)
    + sum(alloc.pieces, (id) => piecePrice(pieceCost(catalog.piece(id))))
    + Object.keys(PERKS).filter((k) => alloc.perks[k]).reduce((s, k) => s + PERKS[k].price, 0);
}

const int = (v, max) => (Number.isInteger(v) && v >= 0 ? Math.min(v, max) : 0);
const counts = (obj, known, max) => {
  const out = {};
  if (obj && typeof obj === 'object') {
    for (const [id, n] of Object.entries(obj)) {
      const v = known.has(id) ? int(n, max) : 0;
      if (v) out[id] = v;
    }
  }
  return out;
};

// 保存データを読む。壊れた値・知らないIDは捨てる。割り振りがポイントを超えていたら（調整で値段が変わったときなど）初期に戻す
export function normalizeMeta(raw, catalog) {
  const meta = defaultMeta();
  if (!raw || typeof raw !== 'object') return meta;
  const pieceIds = new Set(catalog.pieces().map((p) => p.id));
  const relicIds = new Set(catalog.relics().map((r) => r.id));
  meta.points = Math.max(INITIAL_POINTS, int(raw.points, 1e6));
  meta.best = int(raw.best, 100);
  meta.runs = int(raw.runs, 1e6);
  meta.clears = { front: int(raw.clears?.front, 1e6), top: int(raw.clears?.top, 1e6) };
  const a = raw.alloc ?? {};
  const alloc = {
    reroll: int(a.reroll, LIMITS.reroll),
    life: int(a.life, maxExtraLife),
    relics: counts(a.relics, relicIds, LIMITS.relic),
    pieces: counts(a.pieces, pieceIds, LIMITS.piece),
    perks: Object.fromEntries(Object.keys(PERKS).filter((k) => a.perks?.[k] === true).map((k) => [k, true])),
  };
  meta.alloc = allocCost(alloc, catalog) <= meta.points ? alloc : defaultAlloc();
  return meta;
}

// 割り振りを1つ変える。できなければ null（上限・下限・ポイント不足）
//   what: 'reroll' | 'life' | ['relics', id] | ['pieces', id] | ['perks', key]。delta: +1 / -1
export function changeAlloc(meta, what, delta, catalog) {
  const alloc = structuredClone(meta.alloc);
  if (what === 'reroll' || what === 'life') {
    const max = what === 'reroll' ? LIMITS.reroll : maxExtraLife;
    const next = alloc[what] + delta;
    if (next < 0 || next > max) return null;
    alloc[what] = next;
  } else {
    const [group, id] = what;
    if (group === 'perks') {
      if (!PERKS[id]) return null;
      if (delta > 0) alloc.perks[id] = true;
      else delete alloc.perks[id];
    } else {
      const max = group === 'relics' ? LIMITS.relic : LIMITS.piece;
      const known = group === 'relics' ? catalog.relic(id) : catalog.piece(id);
      const next = (alloc[group][id] ?? 0) + delta;
      if (!known || next < 0 || next > max) return null;
      if (next) alloc[group][id] = next;
      else delete alloc[group][id];
    }
  }
  return allocCost(alloc, catalog) <= meta.points ? { ...meta, alloc } : null;
}
