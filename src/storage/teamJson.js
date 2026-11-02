import { BOARDS, isCell, posKey } from '../data/boards.js';
import { BUILTIN_IDS, MAX_JSON_CHARS, MAX_NAME, PIECE_FORMAT, PIECES_FORMAT, isId, sanitizePiece } from './pieceJson.js';

export { BUILTIN_IDS, MAX_JSON_CHARS, MAX_NAME };
export const TEAM_FORMAT = 'auto-battler/team';
export const TEAM_VERSION = 1;
const MAX_SLOTS = 64;
const MAX_RELICS_READ = 10;
const MAX_CUSTOM_PIECES = 100;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const BAD_CHARS = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/;

// 入力（JSONから読んだ値やlocalStorageの値）を検査し、既知の項目だけを持つチームを返す。
// 構造が壊れているときだけエラーにする。コスト超過などの「ルール違反」は validateTeam が扱う。
export function sanitizeTeam(raw) {
  if (!isObj(raw)) return { team: null, errors: ['チームのデータが不正です'] };
  const errors = [];

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name || name.length > MAX_NAME || BAD_CHARS.test(name)) errors.push(`チーム名は1〜${MAX_NAME}文字にしてください`);

  const board = typeof raw.board === 'string' && Object.hasOwn(BOARDS, raw.board) ? BOARDS[raw.board] : null;
  if (!board) errors.push(`ボードが不正です（${String(raw.board)}）`);

  const slots = [];
  if (!Array.isArray(raw.slots) || raw.slots.length > MAX_SLOTS) {
    errors.push('slots が不正です');
  } else {
    const seen = new Set();
    raw.slots.forEach((s, i) => {
      const pos = s?.pos;
      const okPos = Array.isArray(pos) && pos.length === 2 && pos.every(Number.isInteger);
      if (!isObj(s) || !okPos || !isId(s.pieceId)) {
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
  const rawRelics = raw.relics ?? [];
  if (!Array.isArray(rawRelics) || rawRelics.length > MAX_RELICS_READ) {
    errors.push('relics が不正です');
  } else {
    for (const id of rawRelics) {
      if (isId(id)) relics.push(id);
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
        const { piece, errors: errs } = sanitizePiece(p, `自作駒[${i + 1}]`);
        errors.push(...errs);
        if (!piece) return;
        if (ids.has(piece.id)) errors.push(`自作駒のID（${piece.id}）が重複しています`);
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
  if (isObj(data) && (data.format === PIECE_FORMAT || data.format === PIECES_FORMAT)) {
    return { team: null, errors: ['チームのJSONではありません（駒のJSONです。「駒作成」タブで読み込んでください）'] };
  }
  if (!isObj(data) || data.format !== TEAM_FORMAT) return { team: null, errors: ['チームのJSONではありません'] };
  if (data.version !== TEAM_VERSION) return { team: null, errors: [`未対応のバージョンです（${String(data.version)}）`] };
  return sanitizeTeam(data.team);
}
