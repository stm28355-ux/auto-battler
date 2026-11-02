import { triangleUp } from '../data/boards.js';

const SQRT3 = Math.sqrt(3);
const SQUARE = 80;
const HEX_R = 46;
const TRI = 100;

function rawPolygon(shape, r, c) {
  switch (shape) {
    case 'square': {
      const x = (c - 1) * SQUARE;
      const y = (r - 1) * SQUARE;
      return [[x, y], [x + SQUARE, y], [x + SQUARE, y + SQUARE], [x, y + SQUARE]];
    }
    case 'hex': {
      // 頂点が上のハニカム。列は半マスずつずれる。
      const cx = (c * SQRT3 * HEX_R) / 2;
      const cy = HEX_R + (r - 1) * 1.5 * HEX_R;
      return Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 180) * (60 * k - 90);
        return [cx + HEX_R * Math.cos(a), cy + HEX_R * Math.sin(a)];
      });
    }
    case 'triangle': {
      const h = (TRI * SQRT3) / 2;
      const x = (c * TRI) / 2;
      const y = (r - 1) * h;
      return triangleUp(r, c)
        ? [[x, y], [x + TRI / 2, y + h], [x - TRI / 2, y + h]]
        : [[x - TRI / 2, y], [x + TRI / 2, y], [x, y + h]];
    }
    default:
      throw new Error(`unknown shape: ${shape}`);
  }
}

const centroid = (pts) => [
  pts.reduce((s, p) => s + p[0], 0) / pts.length,
  pts.reduce((s, p) => s + p[1], 0) / pts.length,
];

// 盤面の各マスの多角形と中心点。mirror で左右反転（対戦時に右側のチームを向かい合わせる用）。
export function boardLayout(board, { mirror = false, gap = 0.92, pad = 6 } = {}) {
  const raw = board.cells.map((pos) => ({ pos, pts: rawPolygon(board.shape, pos[0], pos[1]) }));
  const xs = raw.flatMap((c) => c.pts.map((p) => p[0]));
  const ys = raw.flatMap((c) => c.pts.map((p) => p[1]));
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const cells = raw.map(({ pos, pts }) => {
    const flipped = mirror ? pts.map(([x, y]) => [minX + maxX - x, y]) : pts;
    const center = centroid(flipped);
    const points = flipped.map(([x, y]) => [center[0] + (x - center[0]) * gap, center[1] + (y - center[1]) * gap]);
    return { pos, points, center };
  });
  return {
    viewBox: [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2],
    cells,
  };
}
