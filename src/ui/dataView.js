import { BOARDS } from '../data/boards.js';
import { PRESET_TEAMS, TIERS } from '../data/presetTeams.js';
import { TRIBES } from '../data/tribes.js';
import { describeEffect } from '../data/effects.js';
import { createCatalog } from '../core/catalog.js';
import { pieceCost } from '../core/cost.js';
import { renderBoard } from './boardView.js';
import { $, effectsText, escapeHtml, pieceSummary, tribeTag } from './format.js';
import { teamInfoHtml } from './teamInfo.js';

// 「データ一覧」タブ：プリセットチームの盤面と、駒・遺物の一覧表。
export function initDataView() {
  const catalog = createCatalog();
  let tribeFilter = 'all';

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
    const tribeOrder = Object.keys(TRIBES);
    const byTribeCostHp = (a, b) => tribeOrder.indexOf(a.tribe) - tribeOrder.indexOf(b.tribe) || pieceCost(a) - pieceCost(b) || a.hp - b.hp;
    const byCost = (a, b) => pieceCost(a) - pieceCost(b);
    const tiers = [...new Set(Object.values(TRIBES).flatMap((t) => Object.keys(t.bonuses).map(Number)))].sort((a, b) => a - b);
    $('synergy-table').innerHTML = `<tr><th>種族</th>${tiers.map((n) => `<th>${n}体以上</th>`).join('')}</tr>`
      + Object.entries(TRIBES).map(([id, t]) => `<tr><td>${tribeTag(id)}</td>${tiers.map((n) => `<td>${t.bonuses[n] ? t.bonuses[n].map(describeEffect).join('<br>') : '—'}</td>`).join('')}</tr>`).join('');
    const shown = pieces.filter((p) => p.kind === 'character' && (tribeFilter === 'all' || p.tribe === tribeFilter));
    $('tribe-filter').innerHTML = [['all', 'すべて'], ...Object.entries(TRIBES).map(([id, t]) => [id, t.name])]
      .map(([id, name]) => `<button type="button" class="chip${id === tribeFilter ? ' selected' : ''}" data-tribe="${id}"${id === 'all' ? '' : ` style="--tribe:${TRIBES[id].color}"`}>${name}</button>`).join('');
    $('character-table').innerHTML = `
      <tr><th></th><th>名前</th><th>種族</th><th>コスト</th><th>HP</th><th>攻撃</th><th>防御</th><th>攻撃速度</th><th>特殊効果</th></tr>
      ${shown.sort(byTribeCostHp).map((p) => `
        <tr><td>${escapeHtml(p.icon)}</td><td>${escapeHtml(p.name)}</td><td>${tribeTag(p.tribe)}</td><td>${pieceCost(p)}</td>
        <td>${p.hp}</td><td>${p.atk}</td><td>${p.def}</td><td>${p.spd}</td><td>${effectsText(p.effects)}</td></tr>`).join('')}`;
    $('item-table').innerHTML = `
      <tr><th></th><th>名前</th><th>コスト</th><th>攻撃</th><th>防御</th><th>特殊効果</th></tr>
      ${pieces.filter((p) => p.kind === 'item').sort(byCost).map((p) => `
        <tr><td>${escapeHtml(p.icon)}</td><td>${escapeHtml(p.name)}</td><td>${pieceCost(p)}</td>
        <td>${p.atk}</td><td>${p.def}</td><td>${effectsText(p.effects)}</td></tr>`).join('')}`;
    $('relic-table').innerHTML = `
      <tr><th></th><th>名前</th><th>特殊効果</th></tr>
      ${catalog.relics().map((r) => `<tr><td>${r.icon}</td><td>${escapeHtml(r.name)}</td><td>${effectsText(r.effects)}</td></tr>`).join('')}`;
  }

  $('team-select').innerHTML = PRESET_TEAMS
    .map((t, i) => `<option value="${i}">${escapeHtml(t.name)}（${BOARDS[t.board].name}・${TIERS[t.tier].name}）</option>`).join('');
  $('tribe-filter').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-tribe]');
    if (!btn) return;
    tribeFilter = btn.dataset.tribe;
    renderTables();
  });
  // 目次はページ内の移動だけ（URLのハッシュはタブの切り替えに使っているので変えない）
  for (const a of document.querySelectorAll('#view-data [data-jump]')) {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  $('team-select').addEventListener('change', renderViewer);
  $('mirror').addEventListener('change', renderViewer);
  renderViewer();
  renderTables();
}
