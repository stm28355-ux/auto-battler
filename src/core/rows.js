// 攻撃と防御は「計算行」ごとに求める（spec §2）。
// 同じボード同士なら、ふつうの行がそのまま計算行。ペンタグラム（4行）が他のボード（3行）と向かい合うときだけ、
// ペンタグラムの行を次のように3つの計算行へ振り分ける。
//   振り分け = 自分の行 → [計算行, 割合]。攻撃は割合ぶんずつ各計算行へ向かい、
//   防御は計算行に割り当てられた前線の防御を、割合で重みづけした平均にする。
export const PENTAGRAM_FOLD = {
  1: [[1, 1]],
  2: [[1, 0.5], [2, 0.5]],
  3: [[2, 0.5], [3, 0.5]],
  4: [[3, 1]],
};

export const folded = (boardId, foeBoardId) => boardId === 'pentagram' && foeBoardId !== 'pentagram';

export const calcRowCount = (boardId, foeBoardId) => (boardId === 'pentagram' && foeBoardId === 'pentagram' ? 4 : 3);

// 自分の行 → [[計算行, 割合], ...]
export const foldOf = (boardId, foeBoardId, row) => (folded(boardId, foeBoardId) ? PENTAGRAM_FOLD[row] ?? [] : [[row, 1]]);

// 計算行ごとの数値。units は解決済みのキャラ（row, pos, atk, def, atkMult, spd を持つ）。
//   atk: その計算行へ向かう秒間攻撃（防御を引く前。実効攻撃 × 攻撃倍率 × 攻撃速度 × 割合の合計）
//   def: その計算行の防御（割り当てられた前線の防御の、割合による加重平均。前線がなければ null）
//   target: その計算行で攻撃を受ける代表の駒（割合がいちばん大きい前線。同じなら小さい行）
export function rowStats(units, boardId, foeBoardId) {
  const count = calcRowCount(boardId, foeBoardId);
  const rows = Array.from({ length: count }, (_, i) => ({ row: i + 1, atk: 0, def: null, target: null, from: [], _w: 0, _d: 0, _share: 0 }));

  const fronts = new Map();
  for (const u of units) {
    const cur = fronts.get(u.row);
    if (!cur || u.pos[1] < cur.pos[1]) fronts.set(u.row, u);
    for (const [c, share] of foldOf(boardId, foeBoardId, u.row)) {
      if (rows[c - 1]) rows[c - 1].atk += share * u.atk * u.atkMult * u.spd;
    }
  }
  for (const r of [...fronts.keys()].sort((a, b) => a - b)) {
    const front = fronts.get(r);
    for (const [c, share] of foldOf(boardId, foeBoardId, r)) {
      const row = rows[c - 1];
      if (!row) continue;
      row._w += share;
      row._d += share * front.def;
      row.from.push({ row: r, share });
      if (share > row._share) {
        row._share = share;
        row.target = front;
      }
    }
  }
  return rows.map(({ _w, _d, _share, ...row }) => ({ ...row, def: _w > 0 ? _d / _w : null }));
}

// 前線がない計算行は、いちばん近い計算行（同じ距離なら小さい行）で代用する。攻撃の解決で使う。
export function fillRows(rows) {
  return rows.map((row) => {
    if (row.target) return row;
    let best = null;
    for (const other of rows) {
      if (!other.target) continue;
      if (!best || Math.abs(other.row - row.row) < Math.abs(best.row - row.row)) best = other;
    }
    return best ? { ...row, def: best.def, target: best.target } : row;
  });
}
