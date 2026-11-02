import { BOARDS, posKey } from '../data/boards.js';
import { describeEffect } from '../data/effects.js';
import { activeSynergies, frontLiners, teamCost, validateTeam } from '../core/team.js';
import { effectsText, escapeHtml, tribeTag } from './format.js';

// チームの概要（コスト・ルール違反・前線・シナジー・遺物）をHTMLで返す。
export function teamInfoHtml(team, catalog, { heading = true } = {}) {
  const board = BOARDS[team.board];
  const cost = teamCost(team, catalog);
  const errors = validateTeam(team, catalog);
  const byPos = new Map(team.slots.map((s) => [posKey(s.pos), catalog.piece(s.pieceId)]));
  const fronts = [...frontLiners(team, catalog)]
    .map(([row, pos]) => `<li>${row}行目: (${pos.join(',')}) ${escapeHtml(byPos.get(posKey(pos)).name)}</li>`)
    .join('') || '<li>なし</li>';
  const synergies = activeSynergies(team, catalog)
    .map((s) => `<li>${tribeTag(s.tribe)} ${s.count}体 → ${s.effects.map(describeEffect).join('、')}</li>`)
    .join('') || '<li>なし</li>';
  const relics = (team.relics ?? []).map((id) => catalog.relic(id)).filter(Boolean)
    .map((r) => `<li>${r.icon} ${escapeHtml(r.name)}: ${effectsText(r.effects)}</li>`).join('') || '<li>なし</li>';

  return `
    ${heading ? `<h3>${escapeHtml(team.name)}</h3>` : ''}
    <p>${board.name} ／ コスト <strong class="${cost > board.costCap ? 'over' : ''}">${cost} / ${board.costCap}</strong></p>
    ${errors.length ? `<ul class="errors">${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>` : '<p class="ok">対戦に使えます</p>'}
    <h4>前線</h4><ul>${fronts}</ul>
    <h4>種族シナジー</h4><ul>${synergies}</ul>
    <h4>遺物</h4><ul>${relics}</ul>`;
}
