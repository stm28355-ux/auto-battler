import { BOARDS, isCell, posKey } from '../data/boards.js';
import { activeEnvironment, findEnvironment } from '../data/environment.js';
import { RELICS } from '../data/relics.js';
import { createCatalog } from '../core/catalog.js';
import { pieceCost } from '../core/cost.js';
import { MAX_RELICS, teamCost, validateTeam } from '../core/team.js';
import { BUILTIN_IDS, exportTeamJson, MAX_JSON_CHARS, MAX_NAME, parseTeamJson } from '../storage/teamJson.js';
import { renderBoard } from './boardView.js';
import { TRIBES } from '../data/tribes.js';
import { $, effectsText, escapeHtml, pieceSummary, tribeTag } from './format.js';
import { teamInfoHtml } from './teamInfo.js';

const ERASER = '__erase__';
const HOVER_HINT = 'マスにマウスを乗せると隣接マスと駒の詳細を表示します。';
const DIRTY_CONFIRM = '未保存の変更があります。破棄しますか？';

const blankTeam = () => ({ name: '新しいチーム', board: 'square', slots: [], relics: [] });

// 「チーム編成」タブ：駒を選んでマスに置き、9つのスロットに保存する。JSONの入出力にも対応。
// setContext で「ストーリー用の編成」に切り替えられる（保存先・コスト上限・使える駒と遺物が変わり、自作駒とJSONは使わない）。
//   context: { label, store, rules(): validateTeam の制限, onBack(): 戻る, onSaved(slot): 保存したとき }。null なら通常の編成
export function initTeamEditor({ store, pieceStore }) {
  let context = null;
  const activeStore = () => context?.store ?? store;
  const rules = () => context?.rules() ?? null;
  let draft = blankTeam();
  let slot = 0; // 保存先のスロット
  let loadedSlot = null; // 今の編集内容を読み込んだスロット
  let baseline = JSON.stringify(draft); // 保存・読み込み直後の内容（未保存の変更の判定用）
  let tool = null; // 選択中の駒のID、または ERASER
  let saved = store.load();
  let myPieces = pieceStore.load(); // 「駒作成」で作った駒

  // 自作駒は、置いた時点の内容をチームにコピーして持たせる（draft.customPieces）。
  // 駒作成で後から直しても、保存済みのチームは勝手に変わらない。
  const pool = () => {
    if (context) return []; // ストーリーでは自作駒を使わない
    const byId = new Map(myPieces.map((p) => [p.id, p]));
    for (const p of draft.customPieces ?? []) byId.set(p.id, p);
    return [...byId.values()];
  };
  const catalog = () => createCatalog(pool());
  const isCustom = (id) => !BUILTIN_IDS.has(id);
  const outdated = () => (draft.customPieces ?? []).filter((p) => {
    const latest = myPieces.find((m) => m.id === p.id);
    return latest && JSON.stringify(latest) !== JSON.stringify(p);
  });
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

  const capOf = (boardId) => rules()?.costCap(boardId) ?? BOARDS[boardId].costCap;

  function renderHead() {
    const cap = capOf(draft.board);
    const cost = teamCost(draft, catalog());
    if (document.activeElement !== $('team-name')) $('team-name').value = draft.name;
    $('team-board').innerHTML = Object.values(BOARDS)
      .map((b) => `<option value="${b.id}">${b.name}（${b.cells.length}マス・上限${capOf(b.id)}）</option>`).join('');
    $('team-board').value = draft.board;
    $('cost-text').textContent = `コスト ${cost} / ${cap}`;
    $('cost-text').classList.toggle('over', cost > cap);
    $('cost-bar').max = cap;
    $('cost-bar').value = Math.min(cost, cap);
    $('cost-bar').classList.toggle('over', cost > cap);
    $('team-dirty').hidden = !dirty();
  }

  // ストーリー用の編成のときだけ、上に案内と、いまの条件で使えるかを出す
  function renderContext() {
    $('team-context').hidden = !context;
    $('team-json-panel').hidden = !!context;
    if (!context) return;
    const errors = draft.slots.length ? validateTeam(draft, catalog(), rules()) : [];
    $('team-context').innerHTML = `<div><strong>📜 ${escapeHtml(context.label)}</strong>`
      + `<span class="muted">（通常の編成とは別に保存されます。使えるのは、ストーリーで手に入れた駒・遺物だけです）</span></div>`
      + (errors.length ? `<ul class="errors">${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>` : '')
      + '<button type="button" id="team-context-back">📜 ストーリーに戻る</button>';
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
    if (tool !== ERASER) {
      draft.slots.push({ pos, pieceId: tool });
      const mine = myPieces.find((p) => p.id === tool);
      if (isCustom(tool) && mine && !(draft.customPieces ?? []).some((p) => p.id === tool)) {
        (draft.customPieces ??= []).push(structuredClone(mine));
      }
    }
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
    const plain = (s) => s.replace(/<[^>]*>/g, ' ').replace(/&#\d+;/g, '');
    const button = (p) => `<button type="button" class="piece-btn${tool === p.id ? ' selected' : ''}${isCustom(p.id) ? ' piece-btn--custom' : ''}" data-id="${escapeHtml(p.id)}"`
      + ` title="${escapeHtml(plain(pieceSummary(p)))}">`
      + `${escapeHtml(p.icon)} ${escapeHtml(p.name)} <span class="cost">${pieceCost(p)}</span></button>`;
    // データ一覧と同じ並び：種族 → コスト → HP（道具はコスト順）
    const byCost = (a, b) => pieceCost(a) - pieceCost(b) || (a.hp ?? 0) - (b.hp ?? 0);
    const allowed = rules()?.pieces;
    const all = cat.pieces().filter((p) => !allowed || allowed.has(p.id));
    const tribeRows = Object.entries(TRIBES).map(([id, t]) => {
      const list = all.filter((p) => p.kind === 'character' && p.tribe === id).sort(byCost);
      const tiers = Object.keys(t.bonuses).join('/');
      return list.length ? `<div class="palette-row"><span class="palette-label">${tribeTag(id)}<small class="muted">${tiers}体</small></span>${list.map(button).join('')}</div>` : '';
    }).join('');
    const row = (label, kind) => `<div class="palette-row"><span class="palette-label">${label}</span>`
      + `${all.filter((p) => p.kind === kind).sort(byCost).map(button).join('')}</div>`;
    const picked = tool && tool !== ERASER ? cat.piece(tool) : null;
    $('tool-note').innerHTML = tool === ERASER ? '🧹 <strong>消す</strong>：マスをクリックすると駒を外します'
      : picked ? `選択中：<strong>${escapeHtml(picked.icon)} ${escapeHtml(picked.name)}</strong>（コスト${pieceCost(picked)}）→ マスをクリックで配置`
        : '<span class="muted">「駒」の一覧から選んで、マスをクリックで配置</span>';
    $('tool-note').classList.toggle('tool-note--active', !!tool);
    const stale = outdated();
    const note = stale.length
      ? `<div class="palette-note">⚠ 自作駒 ${stale.map((p) => `「${escapeHtml(p.name)}」`).join('')}に、駒作成で更新された新しい版があります。`
        + ' <button type="button" data-update>最新版に更新</button></div>'
      : '';
    const lockedNote = allowed
      ? `<div class="palette-note">ストーリーで手に入れた駒だけを表示しています（${all.length} / ${cat.pieces().length}）</div>`
      : '';
    $('palette').innerHTML = lockedNote + note + tribeRows + row('道具', 'item')
      + `<div class="palette-row"><span class="palette-label">その他</span>`
      + `<button type="button" class="piece-btn${tool === ERASER ? ' selected' : ''}" data-id="${ERASER}">🧹 消す</button>`
      + '<span class="muted">マスの右クリックでも消せます</span></div>';
  }

  function renderRelics() {
    const full = draft.relics.length >= MAX_RELICS;
    $('relic-count').textContent = `${draft.relics.length} / ${MAX_RELICS}`;
    const allowed = rules()?.relics;
    $('relic-picker').innerHTML = RELICS.filter((r) => !allowed || allowed.has(r.id)).map((r) => {
      const on = draft.relics.includes(r.id);
      return `<button type="button" class="relic-btn${on ? ' selected' : ''}" data-id="${r.id}"${full && !on ? ' disabled' : ''}>`
        + `<strong>${r.icon} ${escapeHtml(r.name)}</strong><span class="muted">${effectsText(r.effects)}</span></button>`;
    }).join('');
  }

  function render() {
    renderContext();
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
    if (ev.target.closest('[data-update]')) {
      draft.customPieces = draft.customPieces.map((p) => structuredClone(myPieces.find((m) => m.id === p.id) ?? p));
      render();
      setMessage('ok', '自作駒を最新版に更新しました（保存するまでスロットには反映されません）');
      return;
    }
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
    renderContext();
  });

  $('team-name').addEventListener('input', () => {
    draft.name = $('team-name').value;
    $('team-dirty').hidden = !dirty();
  });

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
    if (!activeStore().save(slot, draft)) {
      setMessage('error', '保存できませんでした（ブラウザの保存領域がいっぱいか、使えない設定です）');
      return;
    }
    saved = activeStore().load();
    loadedSlot = slot;
    baseline = JSON.stringify(draft);
    context?.onSaved?.(slot);
    render();
    setMessage('ok', `スロット${slot + 1}に保存しました`);
  });

  $('team-delete').addEventListener('click', () => {
    if (!saved[slot] || !window.confirm(`スロット${slot + 1}「${saved[slot].name}」を削除しますか？`)) return;
    activeStore().remove(slot);
    saved = activeStore().load();
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
    setTimeout(() => URL.revokeObjectURL(url), 1000); // すぐ消すとダウンロードが始まらないブラウザがある
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
    const { team, errors, env } = parseTeamJson(text);
    if (errors.length) {
      setMessage('error', ['読み込めませんでした', ...errors]);
      return;
    }
    if (!confirmDiscard()) return;
    const current = activeEnvironment();
    const other = env && env !== current.id ? findEnvironment(env) : null;
    loadDraft(team, { message: ['ok', [
      `「${team.name}」を読み込みました。保存するにはスロットを選んで「保存」を押してください`,
      ...(other ? [`このチームは${other.name}で作られたものです。今の環境（${current.name}）のルール・コストで扱います`] : []),
    ]] });
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

  $('team-context').addEventListener('click', (ev) => {
    if (ev.target.closest('#team-context-back')) context?.onBack();
  });

  render();
  setMessage('info', '');

  return {
    isDirty: dirty,
    // 通常の編成とストーリー用の編成を切り替える。未保存の変更を破棄しないと決めたら false
    setContext(next) {
      if (next?.store === context?.store) {
        if (next) context = next;
        render();
        return true;
      }
      if (!confirmDiscard()) return false;
      context = next;
      saved = activeStore().load();
      const first = saved.findIndex(Boolean);
      if (first >= 0) loadDraft(saved[first], { fromSlot: first });
      else {
        slot = 0;
        loadDraft(blankTeam());
        baseline = JSON.stringify(draft);
        render();
      }
      return true;
    },
    // 他のタブから戻ったときに、自作駒を読み直す
    refresh() {
      myPieces = pieceStore.load();
      render();
    },
  };
}
