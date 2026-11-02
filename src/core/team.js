import { BOARDS, isCell, posKey } from '../data/boards.js';
import { TRIBES } from '../data/tribes.js';
import { pieceCost } from './cost.js';

export const MAX_RELICS = 3;

const placed = (team, catalog) =>
  team.slots.map((slot) => ({ ...slot, piece: catalog.piece(slot.pieceId) })).filter((s) => s.piece);

// 各行で列がいちばん小さいキャラクターが前線（spec §2）。行番号 → 座標。
export function frontLiners(team, catalog) {
  const fronts = new Map();
  for (const { pos, piece } of placed(team, catalog)) {
    if (piece.kind !== 'character') continue;
    const current = fronts.get(pos[0]);
    if (!current || pos[1] < current[1]) fronts.set(pos[0], pos);
  }
  return new Map([...fronts].sort(([a], [b]) => a - b));
}

export function teamCost(team, catalog) {
  return placed(team, catalog).reduce((sum, { piece }) => sum + pieceCost(piece), 0);
}

export function tribeCounts(team, catalog) {
  const counts = new Map();
  for (const { piece } of placed(team, catalog)) {
    if (piece.kind === 'character') counts.set(piece.tribe, (counts.get(piece.tribe) ?? 0) + 1);
  }
  return counts;
}

// 発動している種族ボーナス。種族ごとに、満たしている最大の段階だけを返す。
export function activeSynergies(team, catalog) {
  const result = [];
  for (const [tribe, count] of tribeCounts(team, catalog)) {
    const tiers = Object.keys(TRIBES[tribe]?.bonuses ?? {}).map(Number).filter((n) => count >= n);
    if (tiers.length) {
      const tier = Math.max(...tiers);
      result.push({ tribe, count, tier, effects: TRIBES[tribe].bonuses[tier] });
    }
  }
  return result;
}

// エラーメッセージの配列を返す。空なら対戦に出せるチーム。
export function validateTeam(team, catalog) {
  const board = BOARDS[team?.board];
  if (!board) return [`ボードが不正です（${team?.board}）`];
  const errors = [];
  const seen = new Set();
  for (const slot of team.slots ?? []) {
    const key = posKey(slot.pos ?? []);
    if (!isCell(board.id, slot.pos ?? [])) errors.push(`(${key}) は${board.name}のマスではありません`);
    else if (seen.has(key)) errors.push(`(${key}) に駒が重複しています`);
    seen.add(key);
    if (!catalog.piece(slot.pieceId)) errors.push(`駒が見つかりません（${slot.pieceId}）`);
  }
  if (!placed(team, catalog).some(({ piece }) => piece.kind === 'character')) {
    errors.push('キャラクターを1体以上配置してください');
  }
  const cost = teamCost(team, catalog);
  if (cost > board.costCap) errors.push(`コストが上限を超えています（${cost} / ${board.costCap}）`);
  const relics = team.relics ?? [];
  if (relics.length > MAX_RELICS) errors.push(`遺物は${MAX_RELICS}つまでです`);
  if (new Set(relics).size !== relics.length) errors.push('同じ遺物は重複して持てません');
  for (const id of relics) if (!catalog.relic(id)) errors.push(`遺物が見つかりません（${id}）`);
  return errors;
}
