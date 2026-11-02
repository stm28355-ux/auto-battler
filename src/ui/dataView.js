import { BOARDS } from '../data/boards.js';
import { PRESET_TEAMS } from '../data/presetTeams.js';
import { createCatalog } from '../core/catalog.js';
import { pieceCost } from '../core/cost.js';
import { renderBoard } from './boardView.js';
import { $, effectsText, escapeHtml, pieceSummary, tribeTag } from './format.js';
import { teamInfoHtml } from './teamInfo.js';

// 「データ一覧」タブ：プリセットチームの盤面と、駒・遺物の一覧表。
export function initDataView() {
  const catalog = createCatalog();

  function showHover(pos, piece) {
    if (!pos) return;
    $('hover-info').innerHTML = `<span class="muted">(${pos.join(',')})</span> ` + (piece ? pieceSummary(piece) : '空きマス');
  }

  function renderViewer() {
    const team = PRESET_TEAMS[Number($('team-select').value)];
    const svg = renderBoard(BOARDS[team.board], { team, catalog, mirror: $('mirror').checked, onHover: showHover });
    $('board-wrap').replaceChildren(svg);
    $('team-info').innerHTML = teamInfoHtml(team, catalog);
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
}
