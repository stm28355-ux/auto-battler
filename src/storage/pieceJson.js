import { CHARACTERS, ITEMS } from '../data/pieces.js';
import { validatePiece } from '../core/piece.js';

// 自作駒のJSON。手で書き換えたJSONや、壊れた保存データが入ってきても、
// 「既知の項目だけ・決まった型・決まった範囲」のものだけを通す。

export const PIECE_FORMAT = 'auto-battler/piece';
export const PIECES_FORMAT = 'auto-battler/pieces';
export const PIECE_VERSION = 1;
export const MAX_NAME = 30;
export const MAX_PIECES = 100; // 1つのJSONに入れられる駒の数
export const MAX_JSON_CHARS = 1_000_000;
export const ID_PATTERN = /^(?!__)[A-Za-z0-9_-]{1,64}$/; // `__proto__` のような名前は使えない

// 標準の駒のID。自作駒はこれと重ならないIDにする。
// 環境（src/data/environment.js）を切り替えると標準の駒も変わるので、その都度いまの一覧を見る。
export const BUILTIN_IDS = {
  has: (id) => CHARACTERS.some((p) => p.id === id) || ITEMS.some((p) => p.id === id),
};

const PIECE_FIELDS = {
  character: ['id', 'kind', 'name', 'icon', 'tribe', 'hp', 'atk', 'def', 'spd', 'effects'],
  item: ['id', 'kind', 'name', 'icon', 'atk', 'def', 'effects'],
};
const EFFECT_FIELDS = {
  poison: ['stacks', 'chance'],
  paralyze: ['target', 'duration', 'chance'],
  adjAtkMult: ['mult'],
  rowBuff: ['stat', 'mode', 'value'],
  heal: ['amount', 'interval'],
};
const MAX_EFFECTS_READ = 8; // 多すぎる配列は、検査の前に切り詰める
const MAX_ICON_CODEPOINTS = 8;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const isId = (v) => typeof v === 'string' && ID_PATTERN.test(v);
// 制御文字と、文字の向きを変える文字（表示を偽装できる）を弾く
const BAD_CHARS = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/;
const MARKUP_CHARS = /[<>&"'`]/;
const isText = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !BAD_CHARS.test(v);
const isIcon = (v) => isText(v, 16) && Array.from(v).length <= MAX_ICON_CODEPOINTS && !MARKUP_CHARS.test(v);

function sanitizeEffect(raw) {
  const type = isObj(raw) && typeof raw.type === 'string' ? raw.type : undefined;
  const effect = { type };
  if (type !== undefined && Object.hasOwn(EFFECT_FIELDS, type)) {
    for (const k of EFFECT_FIELDS[type]) if (Object.hasOwn(raw, k)) effect[k] = raw[k];
  }
  return effect;
}

// 自作駒1つの検査。{ piece, errors }。errors があれば piece は null。
export function sanitizePiece(raw, label = '駒') {
  if (!isObj(raw)) return { piece: null, errors: [`${label}が不正です`] };
  if (typeof raw.kind !== 'string' || !Object.hasOwn(PIECE_FIELDS, raw.kind)) {
    return { piece: null, errors: [`${label}: 駒の種類が不正です`] };
  }

  const piece = {};
  for (const k of PIECE_FIELDS[raw.kind]) if (Object.hasOwn(raw, k)) piece[k] = raw[k];
  piece.icon ??= '❓';
  if (Array.isArray(piece.effects)) piece.effects = piece.effects.slice(0, MAX_EFFECTS_READ).map(sanitizeEffect);
  else piece.effects ??= [];

  const errors = [];
  if (!isId(piece.id)) errors.push(`${label}: IDは英数字・_・-で64文字以内にしてください`);
  else if (BUILTIN_IDS.has(piece.id)) errors.push(`自作駒のID（${piece.id}）が標準の駒と重複しています`);
  if (!isText(piece.name, MAX_NAME)) errors.push(`${label}: 名前は1〜${MAX_NAME}文字にしてください`);
  if (!isIcon(piece.icon)) errors.push(`${label}: アイコンは記号や絵文字で${MAX_ICON_CODEPOINTS}文字以内にしてください`);
  if (!Array.isArray(piece.effects)) errors.push(`${label}: 特殊効果が不正です`);
  else errors.push(...validatePiece(piece).map((p) => `${label}: ${p}`));

  return errors.length ? { piece: null, errors } : { piece, errors };
}

// 保存・書き出し用に、既知の項目だけを取り出す
const pick = (piece) => sanitizePiece(piece).piece ?? piece;

export function exportPieceJson(piece) {
  return JSON.stringify({ format: PIECE_FORMAT, version: PIECE_VERSION, piece: pick(piece) }, null, 2);
}

export function exportPiecesJson(pieces) {
  return JSON.stringify({ format: PIECES_FORMAT, version: PIECE_VERSION, pieces: pieces.map(pick) }, null, 2);
}

// { pieces, errors }。errors があれば pieces は空（1つでも不正なら全体を拒否する）。
export function parsePieceJson(text) {
  const fail = (...errors) => ({ pieces: [], errors });
  if (typeof text !== 'string' || !text.trim()) return fail('JSONが空です');
  if (text.length > MAX_JSON_CHARS) return fail('JSONが大きすぎます');
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return fail(`JSONとして読み込めません（${e.message}）`);
  }
  if (isObj(data) && data.format === 'auto-battler/team') {
    return fail('駒のJSONではありません（チームのJSONです。「チーム編成」タブで読み込んでください）');
  }
  if (!isObj(data) || (data.format !== PIECE_FORMAT && data.format !== PIECES_FORMAT)) return fail('駒のJSONではありません');
  if (data.version !== PIECE_VERSION) return fail(`未対応のバージョンです（${String(data.version)}）`);

  const raws = data.format === PIECE_FORMAT ? [data.piece] : data.pieces;
  if (!Array.isArray(raws) || raws.length === 0 || raws.length > MAX_PIECES) {
    return fail(`駒は1〜${MAX_PIECES}個にしてください`);
  }
  const errors = [];
  const pieces = [];
  const ids = new Set();
  raws.forEach((raw, i) => {
    const { piece, errors: errs } = sanitizePiece(raw, raws.length > 1 ? `${i + 1}個目` : '駒');
    errors.push(...errs);
    if (!piece) return;
    if (ids.has(piece.id)) errors.push(`IDが重複しています（${piece.id}）`);
    ids.add(piece.id);
    pieces.push(piece);
  });
  return errors.length ? fail(...errors) : { pieces, errors };
}
