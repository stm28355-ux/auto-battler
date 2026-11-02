import { BOARDS, isCell, posKey } from '../data/boards.js';
import { CHARACTERS, ITEMS } from '../data/pieces.js';
import { validatePiece } from '../core/piece.js';

export const TEAM_FORMAT = 'auto-battler/team';
export const TEAM_VERSION = 1;
export const MAX_NAME = 30;
export const MAX_JSON_CHARS = 1_000_000;
const MAX_CUSTOM_PIECES = 100;
const MAX_ID = 64;
const PIECE_KEYS = ['id', 'kind', 'name', 'icon', 'tribe', 'hp', 'atk', 'def', 'spd', 'effects'];

// 標準の駒のID。自作駒はこれと重ならないIDにする。
export const BUILTIN_IDS = new Set([...CHARACTERS, ...ITEMS].map((p) => p.id));

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;

function sanitizeCustomPiece(raw, index, errors) {
  const label = `customPieces[${index}]`;
  if (!isObj(raw)) {
    errors.push(`${label} が不正です`);
    return null;
  }
  const piece = Object.fromEntries(PIECE_KEYS.filter((k) => k in raw).map((k) => [k, structuredClone(raw[k])]));
  if (!isStr(piece.id, MAX_ID)) errors.push(`${label}: IDが不正です`);
  if (!isStr(piece.name, MAX_NAME)) errors.push(`${label}: 名前は1〜${MAX_NAME}文字にしてください`);
  if (piece.icon === undefined) piece.icon = '❓';
  else if (!isStr(piece.icon, 8)) errors.push(`${label}: アイコンが不正です`);
  piece.effects ??= [];
  const problems = validatePiece(piece);
  errors.push(...problems.map((p) => `自作駒「${String(piece.name)}」: ${p}`));
  return piece;
}

// 入力（JSONから読んだ値やlocalStorageの値）を検査し、既知の項目だけを持つチームを返す。
// 構造が壊れているときだけエラーにする。コスト超過などの「ルール違反」は validateTeam が扱う。
export function sanitizeTeam(raw) {
  if (!isObj(raw)) return { team: null, errors: ['チームのデータが不正です'] };
  const errors = [];

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name || name.length > MAX_NAME) errors.push(`チーム名は1〜${MAX_NAME}文字にしてください`);

  const board = Object.hasOwn(BOARDS, raw.board) ? BOARDS[raw.board] : null;
  if (!board) errors.push(`ボードが不正です（${String(raw.board)}）`);

  const slots = [];
  if (!Array.isArray(raw.slots) || raw.slots.length > 64) {
    errors.push('slots が不正です');
  } else {
    const seen = new Set();
    raw.slots.forEach((s, i) => {
      const pos = s?.pos;
      const okPos = Array.isArray(pos) && pos.length === 2 && pos.every(Number.isInteger);
      if (!isObj(s) || !okPos || !isStr(s.pieceId, MAX_ID)) {
        errors.push(`slots[${i}] が不正です`);
      } else if (board && !isCell(board.id, pos)) {
        errors.push(`(${pos}) は${board.name}のマスではありません`);
      } else if (seen.has(posKey(pos))) {
        errors.push(`(${pos}) に駒が重複しています`);
      } else {
        seen.add(posKey(pos));
        slots.push({ pos: [pos[0], pos[1]], pieceId: s.pieceId });
      }
    });
  }

  const relics = [];
  if (!Array.isArray(raw.relics ?? []) || (raw.relics ?? []).length > 10) {
    errors.push('relics が不正です');
  } else {
    for (const id of raw.relics ?? []) {
      if (isStr(id, MAX_ID)) relics.push(id);
      else errors.push('relics に不正なIDがあります');
    }
  }

  const customPieces = [];
  if (raw.customPieces !== undefined) {
    if (!Array.isArray(raw.customPieces) || raw.customPieces.length > MAX_CUSTOM_PIECES) {
      errors.push('customPieces が不正です');
    } else {
      const ids = new Set();
      raw.customPieces.forEach((p, i) => {
        const piece = sanitizeCustomPiece(p, i, errors);
        if (!piece) return;
        if (BUILTIN_IDS.has(piece.id)) errors.push(`自作駒のID（${piece.id}）が標準の駒と重複しています`);
        else if (ids.has(piece.id)) errors.push(`自作駒のID（${piece.id}）が重複しています`);
        ids.add(piece.id);
        customPieces.push(piece);
      });
    }
  }

  if (errors.length) return { team: null, errors };
  return { team: { name, board: board.id, slots, relics, ...(customPieces.length && { customPieces }) }, errors };
}

// 保存・書き出し用の形。駒は行・列順、自作駒は実際に使っているものだけ。
export function normalizeTeam(team) {
  const slots = [...team.slots]
    .map((s) => ({ pos: [s.pos[0], s.pos[1]], pieceId: s.pieceId }))
    .sort((a, b) => a.pos[0] - b.pos[0] || a.pos[1] - b.pos[1]);
  const used = new Set(slots.map((s) => s.pieceId));
  const customPieces = (team.customPieces ?? []).filter((p) => used.has(p.id) && !BUILTIN_IDS.has(p.id));
  return {
    name: team.name,
    board: team.board,
    slots,
    relics: [...(team.relics ?? [])],
    ...(customPieces.length && { customPieces: structuredClone(customPieces) }),
  };
}

export function exportTeamJson(team) {
  return JSON.stringify({ format: TEAM_FORMAT, version: TEAM_VERSION, team: normalizeTeam(team) }, null, 2);
}

// { team, errors }。errors があれば team は null（理由を画面に出して拒否する）。
export function parseTeamJson(text) {
  if (typeof text !== 'string' || !text.trim()) return { team: null, errors: ['JSONが空です'] };
  if (text.length > MAX_JSON_CHARS) return { team: null, errors: ['JSONが大きすぎます'] };
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { team: null, errors: [`JSONとして読み込めません（${e.message}）`] };
  }
  if (!isObj(data) || data.format !== TEAM_FORMAT) return { team: null, errors: ['チームのJSONではありません'] };
  if (data.version !== TEAM_VERSION) return { team: null, errors: [`未対応のバージョンです（${String(data.version)}）`] };
  return sanitizeTeam(data.team);
}
