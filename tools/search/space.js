// 強いチーム探しの「チームの作り方・変え方」。どれもルールに合うチームを返し、切り落とし（prune.js）を通した形にそろえる。
import { BOARDS, posKey } from '../../src/data/boards.js';
import { MAX_RELICS, teamCost, validateTeam } from '../../src/core/team.js';
import { pieceCost } from '../../src/core/cost.js';
import { canonicalize, isDowngrade } from './prune.js';

const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const shuffle = (list, rng) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// 同じチームを見分けるキー（並び順を問わない）
export const teamKey = (t) => `${t.board}|${t.slots.map((s) => `${posKey(s.pos)}:${s.pieceId}`).sort().join(' ')}|${[...t.relics].sort().join(',')}`;

// 形の区切り（探索で、区切りごとにいちばん強いチームを残す）：ボード・キャラの数・道具の数・主な種族
export function descriptor(t, catalog) {
  const chars = t.slots.map((s) => catalog.piece(s.pieceId)).filter((p) => p.kind === 'character');
  const counts = new Map();
  for (const p of chars) counts.set(p.tribe, (counts.get(p.tribe) ?? 0) + 1);
  const [tribe, n] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? ['none', 0];
  const main = n * 2 >= chars.length ? tribe : 'mix';
  return `${t.board}|c${chars.length}|i${t.slots.length - chars.length}|${main}`;
}

export function createSpace(catalog, { boards = Object.keys(BOARDS) } = {}) {
  const pieces = catalog.pieces();
  const characters = pieces.filter((p) => p.kind === 'character');
  const items = pieces.filter((p) => p.kind === 'item');
  const relics = catalog.relics().map((r) => r.id);
  const cost = (id) => pieceCost(catalog.piece(id));

  // コスト上限を超えていたら、ランダムな駒を同じ種類の安い駒に下げる（なければ外す）
  function repairCost(team, rng) {
    const t = { ...team, slots: team.slots.map((s) => ({ ...s })) };
    const cap = BOARDS[t.board].costCap;
    for (let guard = 0; teamCost(t, catalog) > cap && guard < 200; guard++) {
      const i = Math.floor(rng() * t.slots.length);
      const s = t.slots[i];
      const p = catalog.piece(s.pieceId);
      const cheaper = (p.kind === 'character' ? characters : items).filter((q) => pieceCost(q) < pieceCost(p));
      if (cheaper.length && rng() < 0.7) s.pieceId = pick(cheaper, rng).id;
      else if (p.kind === 'item' || t.slots.filter((x) => catalog.piece(x.pieceId).kind === 'character').length > 1) t.slots.splice(i, 1);
    }
    return t;
  }

  // 仕上げ：コストを直す → 切り落としの形にそろえる → ルールに合わなければ null
  function finish(team, rng) {
    const t = canonicalize(repairCost(team, rng), catalog, pieces);
    return validateTeam(t, catalog).length ? null : t;
  }

  const randomRelics = (rng) => shuffle(relics, rng).slice(0, MAX_RELICS);

  // ランダムなチーム。キャラの数・道具の数を均等に選ぶ（キャラが少なく道具が多い形も同じくらい出す）
  function random(rng, board = pick(boards, rng)) {
    const cells = shuffle(BOARDS[board].cells, rng);
    const nChars = 1 + Math.floor(rng() * cells.length);
    const nItems = Math.floor(rng() * (cells.length - nChars + 1));
    const slots = [
      ...cells.slice(0, nChars).map((pos) => ({ pos, pieceId: pick(characters, rng).id })),
      ...cells.slice(nChars, nChars + nItems).map((pos) => ({ pos, pieceId: pick(items, rng).id })),
    ];
    return finish({ name: 'ランダム', board, slots, relics: randomRelics(rng) }, rng);
  }

  // 1マスを替える（空にする・駒を置く）。下位互換に替えるだけの変更は選ばない（①）
  function setCell(t, pos, rng, { single = false } = {}) {
    const key = posKey(pos);
    const cur = t.slots.find((s) => posKey(s.pos) === key);
    for (let tries = 0; tries < 20; tries++) {
      const own = t.slots.map((s) => s.pieceId);
      const next = rng() < 0.12 ? null : own.length && rng() < 0.4 ? pick(own, rng) : pick(pieces, rng).id;
      if (next === (cur?.pieceId ?? null)) continue;
      if (single && cur && next && isDowngrade(t, pos, cur.pieceId, next, catalog)) continue;
      const slots = t.slots.filter((s) => posKey(s.pos) !== key);
      if (next) slots.push({ pos, pieceId: next });
      return { ...t, slots };
    }
    return t;
  }

  const swapCells = (t, a, b) => ({ ...t, slots: t.slots.map((s) => (posKey(s.pos) === posKey(a) ? { ...s, pos: b } : posKey(s.pos) === posKey(b) ? { ...s, pos: a } : s)) });

  // 変える：1〜4マスの置き換え・入れ替え（移動）・同じ駒をまとめて替える・別のチームから1行もらう・遺物を1つ替える
  function mutate(parent, rng, others = []) {
    let t = { ...parent, slots: parent.slots.map((s) => ({ ...s })), relics: [...parent.relics] };
    const cells = BOARDS[t.board].cells;
    const r = rng();
    if (r < 0.4) {
      const n = 1 + Math.floor(rng() ** 2 * 4);
      for (const pos of shuffle(cells, rng).slice(0, n)) t = setCell(t, pos, rng, { single: n === 1 });
    } else if (r < 0.55) {
      // 入れ替え（空きマスとの入れ替え＝移動）を1〜2回
      for (let k = rng() < 0.7 ? 1 : 2; k > 0; k--) t = swapCells(t, ...shuffle(cells, rng));
    } else if (r < 0.65) {
      // 同じ駒をまとめて別の駒に替える（同じ種類の駒どうし）
      const from = pick(t.slots, rng)?.pieceId;
      const kind = catalog.piece(from).kind;
      const to = pick(pieces.filter((p) => p.kind === kind && p.id !== from), rng).id;
      t.slots = t.slots.map((s) => (s.pieceId === from ? { ...s, pieceId: to } : s));
    } else if (r < 0.73) {
      // 持っている駒を2〜3マスに増やす（「ゴーレムをもう2体」のような、1マスずつでは届きにくい変更）
      const id = pick(t.slots, rng)?.pieceId;
      const n = rng() < 0.5 ? 2 : 3;
      const targets = shuffle(cells, rng).filter((pos) => !t.slots.some((s) => posKey(s.pos) === posKey(pos) && s.pieceId === id)).slice(0, n);
      t.slots = [...t.slots.filter((s) => !targets.some((pos) => posKey(pos) === posKey(s.pos))), ...targets.map((pos) => ({ pos, pieceId: id }))];
    } else if (r < 0.82) {
      const donor = pick(others.filter((o) => o.board === t.board && o !== parent), rng);
      if (!donor) return null;
      const row = pick(cells, rng)[0];
      t.slots = [...t.slots.filter((s) => s.pos[0] !== row), ...donor.slots.filter((s) => s.pos[0] === row).map((s) => ({ ...s }))];
    } else {
      const left = relics.filter((id) => !t.relics.includes(id));
      t.relics[Math.floor(rng() * t.relics.length)] = pick(left, rng);
      if (rng() < 0.3) t = setCell(t, pick(cells, rng), rng);
    }
    return finish(t, rng);
  }

  // すぐ近くのチームを全部：1マスの変更（空にする・すべての駒）と、遺物の全組み合わせ。pairs: true なら2マス同時の変更も
  function* neighborhood(team, { pairs = false } = {}) {
    const cells = BOARDS[team.board].cells;
    const options = [null, ...pieces.map((p) => p.id)];
    const place = (t, pos, id) => {
      const slots = t.slots.filter((s) => posKey(s.pos) !== posKey(pos));
      if (id) slots.push({ pos, pieceId: id });
      return { ...t, slots };
    };
    const at = (t, pos) => t.slots.find((s) => posKey(s.pos) === posKey(pos))?.pieceId ?? null;
    const ok = (t) => validateTeam(t, catalog).length === 0;
    for (const pos of cells) {
      for (const id of options) {
        if (id === at(team, pos)) continue;
        if (at(team, pos) && id && isDowngrade(team, pos, at(team, pos), id, catalog)) continue;
        const t = canonicalize(place(team, pos, id), catalog, pieces);
        if (ok(t)) yield t;
      }
    }
    for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) {
      if (at(team, cells[a]) === at(team, cells[b])) continue;
      const t = canonicalize(swapCells(team, cells[a], cells[b]), catalog, pieces);
      if (ok(t)) yield t;
    }
    for (const from of new Set(team.slots.map((s) => s.pieceId))) {
      const kind = catalog.piece(from).kind;
      if (team.slots.filter((s) => s.pieceId === from).length < 2) continue;
      for (const p of pieces) {
        if (p.kind !== kind || p.id === from) continue;
        const t = canonicalize({ ...team, slots: team.slots.map((s) => (s.pieceId === from ? { ...s, pieceId: p.id } : s)) }, catalog, pieces);
        if (ok(t)) yield t;
      }
    }
    for (let i = 0; i < relics.length; i++) for (let j = i + 1; j < relics.length; j++) for (let k = j + 1; k < relics.length; k++) {
      yield { ...team, relics: [relics[i], relics[j], relics[k]] };
    }
    if (!pairs) return;
    // 持っている駒を2〜3マスに増やす（どのマスを、どの手持ちの駒にするか、を全部）
    const own = [...new Set(team.slots.map((s) => s.pieceId))];
    for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) for (let c = b; c < cells.length; c++) {
      const targets = c === b ? [cells[a], cells[b]] : [cells[a], cells[b], cells[c]];
      for (const id of own) {
        if (targets.some((pos) => at(team, pos) === id)) continue;
        let t = team;
        for (const pos of targets) t = place(t, pos, id);
        if (teamCost(t, catalog) > BOARDS[t.board].costCap) continue;
        const cc = canonicalize(t, catalog, pieces);
        if (ok(cc)) yield cc;
      }
    }
    // 入れ替え＋1マスの変更（駒をそろえたあと並びを直す、の1手）
    for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) {
      if (at(team, cells[a]) === at(team, cells[b])) continue;
      const sw = swapCells(team, cells[a], cells[b]);
      for (const pos of cells) for (const id of options) {
        if (id === at(sw, pos)) continue;
        const t = place(sw, pos, id);
        if (teamCost(t, catalog) > BOARDS[t.board].costCap) continue;
        const c = canonicalize(t, catalog, pieces);
        if (ok(c)) yield c;
      }
    }
    for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) {
      for (const x of options) {
        if (x === at(team, cells[a])) continue;
        const one = place(team, cells[a], x);
        for (const y of options) {
          if (y === at(team, cells[b])) continue;
          const t = place(one, cells[b], y);
          if (teamCost(t, catalog) > BOARDS[t.board].costCap) continue;
          const c = canonicalize(t, catalog, pieces);
          if (ok(c)) yield c;
        }
      }
    }
  }

  return { random, mutate, neighborhood, finish, cost };
}
