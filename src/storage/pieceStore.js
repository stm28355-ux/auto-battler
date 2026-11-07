import { defaultStorage } from './local.js';
import { sanitizePiece } from './pieceJson.js';

export const MAX_STORED_PIECES = 200;
const LEGACY_KEY = 'auto-battler.pieces.v1';

// 自作駒の保存先。Ver.1・Ver.2 は共通（環境を分ける前からの保存先）。Ver.3 からは環境ごとに別にする。
export const pieceKey = (envId) => (envId === 'v1' || envId === 'v2' || !envId ? LEGACY_KEY : `${LEGACY_KEY}@${envId}`);

// 初めて開いた環境に、1つ前の環境の自作駒をコピーする（保存チームのコピーと同じ。チームに入っている自作駒が消えないように）。
//   Ver.2 以前の自作駒（共通の保存先）は、コスト式が違うので持ち込まない。保存先がまだ一度も作られていないときだけ。
export function copyPiecesOnce(storage, fromEnvId, toEnvId) {
  const from = pieceKey(fromEnvId);
  const to = pieceKey(toEnvId);
  if (!fromEnvId || from === to || from === LEGACY_KEY || storage.getItem(to) !== null) return 0;
  const raw = storage.getItem(from);
  if (raw === null) return 0;
  let count = 0;
  try {
    count = JSON.parse(raw).length ?? 0;
    storage.setItem(to, raw);
  } catch {
    return 0;
  }
  return count;
}

// 新しい自作駒のID。標準の駒（c_・i_）とは重ならない。
export function newPieceId() {
  const random = globalThis.crypto?.randomUUID?.().replaceAll('-', '').slice(0, 12)
    ?? Math.random().toString(36).slice(2, 14).padEnd(12, '0');
  return `u_${random}`;
}

// 自作駒の保存庫。壊れたデータや範囲外の駒は読み飛ばす。
export function createPieceStore(storage = defaultStorage(LEGACY_KEY), KEY = LEGACY_KEY) {
  const read = () => {
    let raw = [];
    try {
      const parsed = JSON.parse(storage.getItem(KEY) ?? '[]');
      if (Array.isArray(parsed)) raw = parsed.slice(0, MAX_STORED_PIECES);
    } catch {
      // 壊れた保存データは無視する
    }
    const seen = new Set();
    const pieces = [];
    for (const r of raw) {
      const { piece } = sanitizePiece(r);
      if (piece && !seen.has(piece.id)) {
        seen.add(piece.id);
        pieces.push(piece);
      }
    }
    return pieces;
  };
  const write = (pieces) => {
    try {
      storage.setItem(KEY, JSON.stringify(pieces));
      return true;
    } catch {
      return false; // 容量超過など
    }
  };

  return {
    load: read,
    // 同じIDがあれば置き換え、なければ追加する。保存できたら true
    saveMany(incoming) {
      const pieces = read();
      for (const piece of incoming) {
        const checked = sanitizePiece(piece).piece;
        if (!checked) return false;
        const i = pieces.findIndex((p) => p.id === checked.id);
        if (i >= 0) pieces[i] = checked;
        else pieces.push(checked);
      }
      return pieces.length <= MAX_STORED_PIECES && write(pieces);
    },
    save(piece) {
      return this.saveMany([piece]);
    },
    remove(id) {
      return write(read().filter((p) => p.id !== id));
    },
  };
}
