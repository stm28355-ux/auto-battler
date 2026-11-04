// 強いチーム探し（tools/search.js）の切り落とし。どれも「必ず同じか弱くなるチーム・変更」だけを捨てる。
//
//   ① 下位互換だけに替える変更は試さない（isDowngrade）
//   ② 効き目の届く先がない道具（隣にキャラがいない・行にキャラがいない）は空きマスと同じ（itemLive）
//   ③ 防御だけの道具で、隣が前線以外のキャラだけのものも同じ（防御は前線のものしか使われない）
//   ④ 浮いたコストで「足しても損にならない道具」をキャラの隣に置けるなら、置いた方が強い（safeAddition）
//
// 防御が使われるのは各行の前線の防御だけ（src/core/rows.js）。HPは共有でキャラは倒れないので、前線は配置で決まる。
// 道具は種族の数・前線・計算行のどれにも数えない（src/engine/resolve.js）。
import { BOARDS, neighbors, posKey } from '../../src/data/boards.js';
import { frontLiners, teamCost } from '../../src/core/team.js';
import { pieceCost } from '../../src/core/cost.js';

const ALWAYS = new Set(['teamBuff', 'heal', 'pulse']); // どこに置いても効く
const ON_ADJ = new Set(['poison', 'paralyze', 'curse', 'pierce', 'adjAtkMult']); // 隣のキャラの攻撃に付く

const charsAt = (team, catalog) => {
  const map = new Map();
  for (const s of team.slots) {
    const p = catalog.piece(s.pieceId);
    if (p?.kind === 'character') map.set(posKey(s.pos), s.pos);
  }
  return map;
};
const frontKeys = (team, catalog) => new Set([...frontLiners(team, catalog).values()].map(posKey));

// 道具 piece を pos に置いたとき、何かに効くか（②③）。知らない効果は効くものとして扱う
export function itemLive(team, pos, piece, catalog, cache = {}) {
  const chars = cache.chars ?? charsAt(team, catalog);
  const fronts = cache.fronts ?? frontKeys(team, catalog);
  const adj = neighbors(team.board, pos).filter((n) => chars.has(posKey(n)));
  const adjFront = adj.some((n) => fronts.has(posKey(n)));
  if (piece.atk > 0 && adj.length) return true;
  if (piece.def > 0 && adjFront) return true;
  for (const e of piece.effects ?? []) {
    if (ALWAYS.has(e.type)) return true;
    if (e.type === 'rowBuff') {
      if ([...chars.values()].some((c) => c[0] === pos[0])) return true;
    } else if (e.type === 'adjBuff') {
      if (e.stat === 'def' ? adjFront : adj.length) return true;
    } else if (ON_ADJ.has(e.type)) {
      if (adj.length) return true;
    } else return true;
  }
  return false;
}

// 効かない道具を外す（②③）。外すとほかの道具の判定は変わらない（道具は前線・キャラの位置を変えない）
export function removeDeadItems(team, catalog) {
  const cache = { chars: charsAt(team, catalog), fronts: frontKeys(team, catalog) };
  const slots = team.slots.filter((s) => {
    const p = catalog.piece(s.pieceId);
    return p?.kind !== 'item' || itemLive(team, s.pos, p, catalog, cache);
  });
  return slots.length === team.slots.length ? team : { ...team, slots };
}

// 足しても損にならない道具：攻撃・攻撃速度を上げない（麻痺の「攻撃・速度が最も高い敵」の狙いが変わらない）
export function safeToAdd(piece) {
  if (piece.kind !== 'item' || piece.atk > 0) return false;
  return (piece.effects ?? []).every((e) => !(e.type === 'adjAtkMult' || ((e.type === 'adjBuff' || e.type === 'rowBuff' || e.type === 'teamBuff') && (e.stat === 'atk' || e.stat === 'spd'))));
}

// ④ 浮いたコストで置ける、効く安全な道具。{ pos, pieceId } か null（いちばん安いもの）
export function safeAddition(team, catalog, pieces = catalog.pieces()) {
  const slack = BOARDS[team.board].costCap - teamCost(team, catalog);
  const candidates = pieces.filter((p) => safeToAdd(p) && pieceCost(p) <= slack).sort((a, b) => pieceCost(a) - pieceCost(b));
  if (!candidates.length) return null;
  const used = new Set(team.slots.map((s) => posKey(s.pos)));
  const cache = { chars: charsAt(team, catalog), fronts: frontKeys(team, catalog) };
  for (const p of candidates) {
    for (const pos of BOARDS[team.board].cells) {
      if (!used.has(posKey(pos)) && itemLive(team, pos, p, catalog, cache)) return { pos, pieceId: p.id };
    }
  }
  return null;
}

// ②〜④を満たす形にそろえる。返すチームは元と同じか強い
export function canonicalize(team, catalog, pieces = catalog.pieces()) {
  let t = removeDeadItems(team, catalog);
  for (let add = safeAddition(t, catalog, pieces); add; add = safeAddition(t, catalog, pieces)) {
    t = { ...t, slots: [...t.slots, add] };
  }
  return t;
}

// 切り落としに当たるか（当たるなら同じか強いチームが別にある）
export const isPrunable = (team, catalog, pieces) => removeDeadItems(team, catalog) !== team || safeAddition(team, catalog, pieces) !== null;

// ① x が y の上位互換か。同じ種類・同じ種族（種族ボーナスの数が変わるため）、能力値がどれも以上、y の効果をすべて同じか強い形で持つ。
//    前線でないマスのキャラは防御を比べない
const MORE = ['stacks', 'chance', 'duration', 'value', 'amount', 'mult'];
const sameShape = (a, b) => Object.keys(a).every((k) => MORE.includes(k) || k === 'interval' || a[k] === b[k]);
const covers = (ex, ey) => ex.type === ey.type && sameShape(ex, ey) && sameShape(ey, ex)
  && MORE.every((k) => (ey[k] ?? 0) <= (ex[k] ?? 0)) && (ex.interval ?? 0) <= (ey.interval ?? 0);
export function dominates(x, y, { ignoreDef = false } = {}) {
  if (x === y || x.kind !== y.kind || (x.kind === 'character' && x.tribe !== y.tribe)) return false;
  const stats = ignoreDef && x.kind === 'character' ? ['hp', 'atk', 'spd'] : ['hp', 'atk', 'def', 'spd'];
  if (stats.some((s) => (x[s] ?? 0) < (y[s] ?? 0))) return false;
  return (y.effects ?? []).every((ey) => (x.effects ?? []).some((ex) => covers(ex, ey)));
}

// ① 1マスだけ from → to に替える変更が、下位互換に替えるだけか
export function isDowngrade(team, pos, fromId, toId, catalog) {
  const from = catalog.piece(fromId);
  const to = catalog.piece(toId);
  if (!from || !to) return false;
  const front = frontKeys(team, catalog).has(posKey(pos));
  return dominates(from, to, { ignoreDef: !front });
}
