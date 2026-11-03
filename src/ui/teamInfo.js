import { BOARDS, posKey } from '../data/boards.js';
import { describeEffect } from '../data/effects.js';
import { activeSynergies, frontLiners, teamCost, validateTeam } from '../core/team.js';
import { rowStats } from '../core/rows.js';
import { resolveTeam } from '../engine/resolve.js';
import { effectsText, escapeHtml, tribeTag } from './format.js';

const num = (x) => (Math.round(x * 10) / 10).toString();

// 計算行ごとの秒間パラメータ（spec §2）。相手のボードによって行の数え方が変わるのは、ペンタグラムだけ。
function rowTable(units, boardId, foeBoardId, title) {
  const rows = rowStats(units, boardId, foeBoardId);
  const body = rows.map((r) => {
    const from = r.from.map((f) => (f.share === 1 ? `${f.row}行` : `${f.row}行×${f.share}`)).join(' + ') || '—';
    return `<tr><td>${r.row}行目</td><td class="muted">${from}</td><td>${num(r.atk)}</td><td>${r.def === null ? '—' : num(r.def)}</td></tr>`;
  }).join('');
  return `<h5>${title}</h5><table class="row-table"><tr><th>計算行</th><th>防御の元</th><th>攻撃/秒</th><th>防御</th></tr>${body}</table>`;
}

// チームの概要（コスト・ルール違反・前線・シナジー・遺物）をHTMLで返す。
// rules: validateTeam の制限（ストーリー・ローグライト）。コストの上限もここから取る
export function teamInfoHtml(team, catalog, { heading = true, rules = null } = {}) {
  const board = BOARDS[team.board];
  const cost = teamCost(team, catalog);
  const cap = rules?.costCap ? rules.costCap(board.id) : board.costCap;
  const errors = validateTeam(team, catalog, rules);
  const byPos = new Map(team.slots.map((s) => [posKey(s.pos), catalog.piece(s.pieceId)]));
  const fronts = [...frontLiners(team, catalog)]
    .map(([row, pos]) => `<li>${row}行目: (${pos.join(',')}) ${escapeHtml(byPos.get(posKey(pos)).name)}</li>`)
    .join('') || '<li>なし</li>';
  const synergies = activeSynergies(team, catalog)
    .map((s) => `<li>${tribeTag(s.tribe)} ${s.count}体 → ${s.effects.map(describeEffect).join('、')}</li>`)
    .join('') || '<li>なし</li>';
  // 同じ遺物を重ねたとき（ローグライト）は「×数」でまとめる
  const relicCounts = new Map();
  for (const id of team.relics ?? []) if (catalog.relic(id)) relicCounts.set(id, (relicCounts.get(id) ?? 0) + 1);
  const relics = [...relicCounts].map(([id, n]) => [catalog.relic(id), n])
    .map(([r, n]) => `<li>${r.icon} ${escapeHtml(r.name)}${n > 1 ? ` ×${n}` : ''}: ${effectsText(r.effects)}</li>`).join('') || '<li>なし</li>';

  const units = resolveTeam(team, catalog).units;
  const rowParams = team.board === 'pentagram'
    ? rowTable(units, 'pentagram', 'pentagram', 'ペンタグラムと対戦（4行）') + rowTable(units, 'pentagram', 'square', 'それ以外と対戦（4行を3行に換算）')
    : rowTable(units, team.board, team.board, '対戦相手を問わず（3行）');

  return `
    ${heading ? `<h3>${escapeHtml(team.name)}</h3>` : ''}
    <p>${board.name} ／ コスト <strong class="${cost > cap ? 'over' : ''}">${cost} / ${Number.isFinite(cap) ? cap : '上限なし'}</strong></p>
    ${errors.length ? `<ul class="errors">${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>` : '<p class="ok">対戦に使えます</p>'}
    <h4>前線</h4><ul>${fronts}</ul>
    <h4>行ごとの秒間パラメータ</h4>
    <p class="muted">攻撃/秒＝実効攻撃×攻撃倍率×攻撃速度の合計（防御を引く前）。防御＝その行を守る前線の防御。</p>
    ${rowParams}
    <h4>種族シナジー</h4><ul>${synergies}</ul>
    <h4>遺物</h4><ul>${relics}</ul>`;
}
