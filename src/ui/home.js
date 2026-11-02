import { BOARDS } from '../data/boards.js';
import { TIERS } from '../data/presetTeams.js';
import { createCatalog } from '../core/catalog.js';
import { teamCost } from '../core/team.js';
import { renderBoard } from './boardView.js';
import { $, escapeHtml } from './format.js';

// 「ホーム」：主なモードへの入口と、チームの飾り棚。
//   getTeams: 対戦で選べるチームの一覧 [{ id, label, team }]（保存したチームが先、プリセットが後）
//   getStats: { teams, pieces, record } … 保存チーム数・自作駒数・戦績
//   go(view, mode): 画面を切り替える（mode は対戦タブのモード）
//   env: いまの対戦環境（バージョン）
//   notice: ホームに一度だけ出すお知らせ（空なら出さない）
export function initHome({ getTeams, getStats, go, env, notice = '' }) {
  $('home-notice').textContent = notice;
  $('home-notice').hidden = !notice;
  let entries = getTeams();
  let index = 0;

  function renderShowcase() {
    if (!entries.length) return;
    index = (index + entries.length) % entries.length;
    const { id, team } = entries[index];
    const catalog = createCatalog(team.customPieces ?? []);
    const board = BOARDS[team.board];
    $('home-board').replaceChildren(renderBoard(board, { team, catalog }));
    const kind = id.startsWith('preset:') ? `プリセット・${TIERS[team.tier]?.name ?? ''}` : 'あなたのチーム';
    $('home-team').innerHTML = `<span class="home-team-kind">${escapeHtml(kind)}</span>`
      + `<strong>${escapeHtml(team.name)}</strong>`
      + `<span class="muted">${board.name} ／ コスト ${teamCost(team, catalog)} / ${board.costCap}</span>`;
    $('home-count').textContent = `${index + 1} / ${entries.length}`;
  }

  function renderStats() {
    const { teams, pieces, record } = getStats();
    const rec = record.total ? `${record.win}勝 ${record.loss}敗 ${record.draw}分` : 'まだ対戦していません';
    $('home-stats').innerHTML = `
      <div><span class="muted">対戦環境</span><strong>${escapeHtml(env.name)}（${escapeHtml(env.status)}）</strong></div>
      <div><span class="muted">保存したチーム</span><strong>${teams} / 9</strong></div>
      <div><span class="muted">自作の駒</span><strong>${pieces}</strong></div>
      <div><span class="muted">ランダムマッチ戦績</span><strong>${rec}</strong></div>`;
  }

  $('home-prev').addEventListener('click', () => {
    index -= 1;
    renderShowcase();
  });
  $('home-next').addEventListener('click', () => {
    index += 1;
    renderShowcase();
  });
  for (const btn of document.querySelectorAll('#view-home [data-go]')) {
    btn.addEventListener('click', () => go(btn.dataset.go, btn.dataset.mode));
  }

  return {
    refresh() {
      const current = entries[index]?.id;
      entries = getTeams();
      const keep = entries.findIndex((e) => e.id === current);
      index = keep >= 0 ? keep : 0;
      renderShowcase();
      renderStats();
    },
  };
}
