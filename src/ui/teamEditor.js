import { BOARDS, isCell, posKey } from '../data/boards.js';
import { RELICS } from '../data/relics.js';
import { createCatalog } from '../core/catalog.js';
import { pieceCost } from '../core/cost.js';
import { MAX_RELICS, teamCost } from '../core/team.js';
import { exportTeamJson, MAX_JSON_CHARS, MAX_NAME, parseTeamJson } from '../storage/teamJson.js';
import { SLOT_COUNT } from '../storage/teamStore.js';
import { renderBoard } from './boardView.js';
import { $, effectsText, escapeHtml, pieceSummary } from './format.js';
import { teamInfoHtml } from './teamInfo.js';

const ERASER = '__erase__';
const HOVER_HINT = 'マスにマウスを乗せると隣接マスと駒の詳細を表示します。';
const DIRTY_CONFIRM = '未保存の変更があります。破棄しますか？';

const blankTeam = () => ({ name: '新しいチーム', board: 'square', slots: [], relics: [] });

// 「チーム編成」タブ：駒を選んでマスに置き、9つのスロットに保存する。JSONの入出力にも対応。
export function initTeamEditor({ store }) {
  let draft = blankTeam();
  let slot = 0; // 保存先のスロット
  let loadedSlot = null; // 今の編集内容を読み込んだスロット
  let baseline = JSON.stringify(draft); // 保存・読み込み直後の内容（未保存の変更の判定用）
  let tool = null; // 選択中の駒のID、または ERASER
  let saved = store.load();

  const catalog = () => createCatalog(draft.customPieces ?? []);
  const dirty = () => JSON.stringify(draft) !== baseline;
  const confirmDiscard = () => !dirty() || window.confirm(DIRTY_CONFIRM);

  function setMessage(kind, lines) {
    const list = [].concat(lines);
    $('team-message').className = `message message--${kind}`;
    $('team-message').innerHTML = list.length > 1
      ? `<ul>${list.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
      : escapeHtml(list[0] ?? '');
  }

  function loadDraft(team, { fromSlot = null, message = null } = {}) {
    draft = structuredClone(team);
    loadedSlot = fromSlot;
    baseline = fromSlot === null ? '' : JSON.stringify(draft);
    if (fromSlot !== null) slot = fromSlot;
    tool = null;
    if (message) setMessage(...message);
    else setMessage('info', '');
    render();
  }

  // ---- 描画 ----
  function renderSlots() {
    $('slot-list').innerHTML = saved.map((team, i) => {
      const cls = ['slot-btn', i === slot && 'selected', i === loadedSlot && 'loaded'].filter(Boolean).join(' ');
      const body = team
        ? `<span class="slot-name">${escapeHtml(team.name)}</span><span class="muted">${BOARDS[team.board].name}</span>`
        : '<span class="muted">（空き）</span>';
      return `<button type="button" class="${cls}" data-slot="${i}"><span class="slot-no">${i + 1}</span>${body}</button>`;
    }).join('');
    $('team-delete').disabled = !saved[slot];
  }

  function renderHead() {
    const board = BOARDS[draft.board];
    const cost = teamCost(draft, catalog());
    if (document.activeElement !== $('team-name')) $('team-name').value = draft.name;
    $('team-board').value = draft.board;
    $('cost-text').textContent = `コスト ${cost} / ${board.costCap}`;
    $('cost-text').classList.toggle('over', cost > board.costCap);
    $('cost-bar').max = board.costCap;
    $('cost-bar').value = Math.min(cost, board.costCap);
    $('cost-bar').classList.toggle('over', cost > board.costCap);
    $('team-dirty').hidden = !dirty();
  }

  function showHover(pos, piece) {
    $('edit-hover').innerHTML = pos
      ? `<span class="muted">(${pos.join(',')})</span> ${piece ? pieceSummary(piece) : '空きマス'}`
      : HOVER_HINT;
  }

  function placePiece(pos) {
    if (!tool) return;
    const key = posKey(pos);
    draft.slots = draft.slots.filter((s) => posKey(s.pos) !== key);
    if (tool !== ERASER) draft.slots.push({ pos, pieceId: tool });
    render();
  }

  function removePiece(pos) {
    draft.slots = draft.slots.filter((s) => posKey(s.pos) !== posKey(pos));
    render();
  }

  function renderBoardArea() {
    const svg = renderBoard(BOARDS[draft.board], {
      team: draft,
      catalog: catalog(),
      onHover: showHover,
      onClick: placePiece,
      onContext: removePiece,
    });
    $('edit-board').replaceChildren(svg);
    $('edit-info').innerHTML = teamInfoHtml(draft, catalog(), { heading: false });
  }

  function renderPalette() {
    const cat = catalog();
    const button = (p) => `<button type="button" class="piece-btn${tool === p.id ? ' selected' : ''}" data-id="${escapeHtml(p.id)}">`
      + `${p.icon} ${escapeHtml(p.name)} <span class="cost">${pieceCost(p)}</span></button>`;
    const row = (label, kind) => `<div class="palette-row"><span class="palette-label">${label}</span>`
      + `${cat.pieces().filter((p) => p.kind === kind).map(button).join('')}</div>`;
    $('palette').innerHTML = row('キャラクター', 'character') + row('道具', 'item')
      + `<div class="palette-row"><span class="palette-label">その他</span>`
      + `<button type="button" class="piece-btn${tool === ERASER ? ' selected' : ''}" data-id="${ERASER}">🧹 消す</button>`
      + '<span class="muted">マスの右クリックでも消せます</span></div>';
  }

  function renderRelics() {
    const full = draft.relics.length >= MAX_RELICS;
    $('relic-count').textContent = `${draft.relics.length} / ${MAX_RELICS}`;
    $('relic-picker').innerHTML = RELICS.map((r) => {
      const on = draft.relics.includes(r.id);
      return `<button type="button" class="relic-btn${on ? ' selected' : ''}" data-id="${r.id}"${full && !on ? ' disabled' : ''}>`
        + `<strong>${r.icon} ${escapeHtml(r.name)}</strong><span class="muted">${effectsText(r.effects)}</span></button>`;
    }).join('');
  }

  function render() {
    renderSlots();
    renderHead();
    renderBoardArea();
    renderPalette();
    renderRelics();
    showHover(null);
  }

  // ---- 操作 ----
  $('slot-list').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-slot]');
    if (!btn) return;
    const i = Number(btn.dataset.slot);
    if (saved[i] && i !== loadedSlot) {
      if (!confirmDiscard()) return;
      loadDraft(saved[i], { fromSlot: i, message: ['info', `スロット${i + 1}「${saved[i].name}」を開きました`] });
    } else {
      slot = i; // 空きスロットは「保存先を選ぶ」だけ
      render();
    }
  });

  $('palette').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-id]');
    if (!btn) return;
    tool = tool === btn.dataset.id ? null : btn.dataset.id;
    renderPalette();
  });
  $('palette').addEventListener('mouseover', (ev) => {
    const piece = catalog().piece(ev.target.closest('[data-id]')?.dataset.id);
    if (piece) $('edit-hover').innerHTML = pieceSummary(piece);
  });
  $('palette').addEventListener('mouseleave', () => showHover(null));

  $('relic-picker').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-id]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (draft.relics.includes(id)) draft.relics = draft.relics.filter((r) => r !== id);
    else if (draft.relics.length < MAX_RELICS) draft.relics.push(id);
    renderRelics();
    renderBoardArea();
    renderHead();
  });

  $('team-name').addEventListener('input', () => {
    draft.name = $('team-name').value;
    $('team-dirty').hidden = !dirty();
  });

  $('team-board').innerHTML = Object.values(BOARDS)
    .map((b) => `<option value="${b.id}">${b.name}（${b.cells.length}マス・上限${b.costCap}）</option>`).join('');
  $('team-board').addEventListener('change', () => {
    const next = $('team-board').value;
    const kept = draft.slots.filter((s) => isCell(next, s.pos));
    const dropped = draft.slots.length - kept.length;
    draft.board = next;
    draft.slots = kept;
    render();
    setMessage('info', dropped ? `${BOARDS[next].name}にないマスの駒を${dropped}個外しました` : '');
  });

  $('team-new').addEventListener('click', () => {
    if (!confirmDiscard()) return;
    loadDraft(blankTeam(), { message: ['info', '新しいチームを作りました'] });
  });

  $('team-save').addEventListener('click', () => {
    draft.name = draft.name.trim().slice(0, MAX_NAME) || '名無しのチーム';
    if (saved[slot] && slot !== loadedSlot
      && !window.confirm(`スロット${slot + 1}「${saved[slot].name}」を上書きしますか？`)) return;
    if (!store.save(slot, draft)) {
      setMessage('error', '保存できませんでした（ブラウザの保存領域がいっぱいか、使えない設定です）');
      return;
    }
    saved = store.load();
    loadedSlot = slot;
    baseline = JSON.stringify(draft);
    render();
    setMessage('ok', `スロット${slot + 1}に保存しました`);
  });

  $('team-delete').addEventListener('click', () => {
    if (!saved[slot] || !window.confirm(`スロット${slot + 1}「${saved[slot].name}」を削除しますか？`)) return;
    store.remove(slot);
    saved = store.load();
    if (loadedSlot === slot) {
      loadedSlot = null;
      baseline = '';
    }
    render();
    setMessage('info', `スロット${slot + 1}を削除しました（編集中の内容は残っています）`);
  });

  // ---- JSON ----
  const fileName = () => `${draft.name.trim().replace(/[\\/:*?"<>|]/g, '_') || 'team'}.team.json`;

  $('json-download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([exportTeamJson(draft)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName() });
    a.click();
    URL.revokeObjectURL(url);
    setMessage('ok', `${fileName()} をダウンロードしました`);
  });

  $('json-copy').addEventListener('click', async () => {
    const text = exportTeamJson(draft);
    try {
      await navigator.clipboard.writeText(text);
      setMessage('ok', 'JSONをクリップボードにコピーしました');
    } catch {
      $('json-paste').hidden = false;
      $('json-text').value = text;
      $('json-text').select();
      setMessage('info', 'コピーできなかったため、下のテキストを手動でコピーしてください');
    }
  });

  function importText(text) {
    const { team, errors } = parseTeamJson(text);
    if (errors.length) {
      setMessage('error', ['読み込めませんでした', ...errors]);
      return;
    }
    if (!confirmDiscard()) return;
    loadDraft(team, { message: ['ok', `「${team.name}」を読み込みました。保存するにはスロットを選んで「保存」を押してください`] });
  }

  $('json-file').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    if (file.size > MAX_JSON_CHARS) {
      setMessage('error', 'ファイルが大きすぎます');
      return;
    }
    importText(await file.text());
  });
  $('json-open').addEventListener('click', () => $('json-file').click());
  $('json-paste-toggle').addEventListener('click', () => {
    $('json-paste').hidden = !$('json-paste').hidden;
    if (!$('json-paste').hidden) $('json-text').focus();
  });
  $('json-apply').addEventListener('click', () => {
    importText($('json-text').value);
    $('json-text').value = '';
  });

  render();
  setMessage('info', '');
}
