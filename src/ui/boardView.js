import { neighbors, posKey } from '../data/boards.js';
import { frontLiners } from '../core/team.js';
import { boardLayout } from './geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_SIZE = { square: 40, hex: 40, triangle: 28 };

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// 盤面をSVGで描く。マスにマウスを乗せると隣接マスをハイライトし、onHover を呼ぶ。
export function renderBoard(board, { team = null, catalog = null, mirror = false, onHover = null } = {}) {
  const layout = boardLayout(board, { mirror });
  const svg = svgEl('svg', { viewBox: layout.viewBox.join(' '), class: 'board' });
  const occupants = new Map((team?.slots ?? []).map((s) => [posKey(s.pos), catalog.piece(s.pieceId)]));
  const fronts = new Set(team ? [...frontLiners(team, catalog).values()].map(posKey) : []);
  const groups = new Map();

  for (const cell of layout.cells) {
    const key = posKey(cell.pos);
    const piece = occupants.get(key);
    const classes = ['cell'];
    if (piece) classes.push(`cell--${piece.kind}`);
    if (fronts.has(key)) classes.push('cell--front');

    const g = svgEl('g', { class: classes.join(' '), 'data-pos': key });
    g.append(svgEl('polygon', { points: cell.points.map((p) => p.join(',')).join(' ') }));
    const label = svgEl('text', { x: cell.center[0], y: cell.center[1], class: piece ? 'cell-icon' : 'cell-coord' });
    if (piece) label.setAttribute('font-size', ICON_SIZE[board.shape]);
    label.textContent = piece ? piece.icon : `${cell.pos[0]},${cell.pos[1]}`;
    g.append(label);

    g.addEventListener('mouseenter', () => {
      g.classList.add('cell--hover');
      for (const n of neighbors(board.id, cell.pos)) groups.get(posKey(n))?.classList.add('cell--adj');
      onHover?.(cell.pos, piece ?? null);
    });
    g.addEventListener('mouseleave', () => {
      g.classList.remove('cell--hover');
      for (const n of neighbors(board.id, cell.pos)) groups.get(posKey(n))?.classList.remove('cell--adj');
      onHover?.(null, null);
    });

    groups.set(key, g);
    svg.append(g);
  }
  return svg;
}
