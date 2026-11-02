import { BOARDS } from './data/boards.js';
import { describeEffect } from './data/effects.js';
import { PRESET_TEAMS } from './data/presetTeams.js';
import { TRIBES } from './data/tribes.js';
import { createCatalog } from './core/catalog.js';
import { pieceCost } from './core/cost.js';
import { activeSynergies, frontLiners, teamCost, validateTeam } from './core/team.js';
import { renderBoard } from './ui/boardView.js';

const catalog = createCatalog();
const $ = (id) => document.getElementById(id);

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const effectsText = (effects) => effects.map(describeEffect).map(escapeHtml).join('<br>') || '—';
const tribeTag = (tribe) => `<span class="tribe" style="--tribe:${TRIBES[tribe].color}">${TRIBES[tribe].name}</span>`;

function pieceSummary(piece) {
  const stats = piece.kind === 'character'
    ? `HP ${piece.hp} / 攻撃 ${piece.atk} / 防御 ${piece.def} / 攻撃速度 ${piece.spd}`
    : `攻撃 +${piece.atk} / 防御 +${piece.def}（隣接キャラへ）`;
  const tribe = piece.kind === 'character' ? ` ${tribeTag(piece.tribe)}` : '';
  return `<strong>${piece.icon} ${escapeHtml(piece.name)}</strong>${tribe} コスト${pieceCost(piece)}<br>${stats}<br>${effectsText(piece.effects)}`;
}

function renderTeamInfo(team) {
  const board = BOARDS[team.board];
  const cost = teamCost(team, catalog);
  const errors = validateTeam(team, catalog);
  const fronts = [...frontLiners(team, catalog)]
    .map(([row, pos]) => `<li>${row}行目: (${pos.join(',')}) ${catalog.piece(team.slots.find((s) => s.pos.join() === pos.join()).pieceId).name}</li>`)
    .join('');
  const synergies = activeSynergies(team, catalog)
    .map((s) => `<li>${tribeTag(s.tribe)} ${s.count}体 → ${s.effects.map(describeEffect).join('、')}</li>`)
    .join('') || '<li>なし</li>';
  const relics = team.relics.map((id) => catalog.relic(id))
    .map((r) => `<li>${r.icon} ${escapeHtml(r.name)}: ${effectsText(r.effects)}</li>`).join('') || '<li>なし</li>';

  $('team-info').innerHTML = `
    <h3>${escapeHtml(team.name)}</h3>
    <p>${board.name} ／ コスト <strong class="${cost > board.costCap ? 'over' : ''}">${cost} / ${board.costCap}</strong></p>
    ${errors.length ? `<ul class="errors">${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>` : ''}
    <h4>前線</h4><ul>${fronts}</ul>
    <h4>種族シナジー</h4><ul>${synergies}</ul>
    <h4>遺物</h4><ul>${relics}</ul>`;
}

function showHover(pos, piece) {
  if (!pos) return;
  $('hover-info').innerHTML = `<span class="muted">(${pos.join(',')})</span> ` + (piece ? pieceSummary(piece) : '空きマス');
}

function renderViewer() {
  const team = PRESET_TEAMS[Number($('team-select').value)];
  const svg = renderBoard(BOARDS[team.board], { team, catalog, mirror: $('mirror').checked, onHover: showHover });
  $('board-wrap').replaceChildren(svg);
  renderTeamInfo(team);
}

function renderTables() {
  const pieces = catalog.pieces();
  $('character-table').innerHTML = `
    <tr><th></th><th>名前</th><th>種族</th><th>コスト</th><th>HP</th><th>攻撃</th><th>防御</th><th>攻撃速度</th><th>特殊効果</th></tr>
    ${pieces.filter((p) => p.kind === 'character').map((p) => `
      <tr><td>${p.icon}</td><td>${escapeHtml(p.name)}</td><td>${tribeTag(p.tribe)}</td><td>${pieceCost(p)}</td>
      <td>${p.hp}</td><td>${p.atk}</td><td>${p.def}</td><td>${p.spd}</td><td>${effectsText(p.effects)}</td></tr>`).join('')}`;
  $('item-table').innerHTML = `
    <tr><th></th><th>名前</th><th>コスト</th><th>攻撃</th><th>防御</th><th>特殊効果</th></tr>
    ${pieces.filter((p) => p.kind === 'item').map((p) => `
      <tr><td>${p.icon}</td><td>${escapeHtml(p.name)}</td><td>${pieceCost(p)}</td>
      <td>${p.atk}</td><td>${p.def}</td><td>${effectsText(p.effects)}</td></tr>`).join('')}`;
  $('relic-table').innerHTML = `
    <tr><th></th><th>名前</th><th>特殊効果</th></tr>
    ${catalog.relics().map((r) => `<tr><td>${r.icon}</td><td>${escapeHtml(r.name)}</td><td>${effectsText(r.effects)}</td></tr>`).join('')}`;
}

$('team-select').innerHTML = PRESET_TEAMS
  .map((t, i) => `<option value="${i}">${escapeHtml(t.name)}（${BOARDS[t.board].name}）</option>`).join('');
$('team-select').addEventListener('change', renderViewer);
$('mirror').addEventListener('change', renderViewer);
renderViewer();
renderTables();
