import { AMP_STATS, BUFF_MODES, BUFF_TYPES, EFFECT_TYPES, PARALYZE_TARGETS, PULSE_STATUS, RALLY_STATS, STAT_NAMES } from '../data/effects.js';
import { TRIBES } from '../data/tribes.js';
import { CHARACTERS, ITEMS } from '../data/pieces.js';
import { costBreakdown, pieceCost } from '../core/cost.js';
import { EFFECT_MAX, MAX_EFFECTS, SPD_ADD_RANGE, STAT_RANGES, effectAllowed, lifestealAllowed, spdAddAllowed, validatePiece } from '../core/piece.js';
import { BOARDS } from '../data/boards.js';
import { MAX_NAME, MAX_JSON_CHARS, exportPieceJson, exportPiecesJson, parsePieceJson, sanitizePiece } from '../storage/pieceJson.js';
import { newPieceId } from '../storage/pieceStore.js';
import { $, escapeHtml, pieceSummary } from './format.js';

const DIRTY_CONFIRM = '未保存の変更があります。破棄しますか？';
// アイコンの候補。標準の駒のアイコン（いまの環境）に、種族らしいものを足して、種族ごとに並べる。
const ICON_EXTRAS = {
  warrior: ['⚔️', '🛡️', '🏹', '🔰', '🎖️', '🏇', '🐎', '🪃', '🏰', '🦸'],
  mage: ['🪄', '❄️', '🌙', '✨', '📜', '🕯️', '☄️', '🌀', '🔯', '🧿', '🌪️', '💫'],
  beast: ['🦊', '🐯', '🦂', '🕷️', '🦇', '🐊', '🦈', '🦉', '🦍', '🦬', '🐘', '🦏', '🐝', '🦖'],
  machine: ['🤖', '⚙️', '🚀', '💣', '🔩', '🛰️', '🦾', '🚁', '🛡️', '🔦', '🧲', '🚂'],
  neutral: ['🧜', '🧚', '👻', '🧟', '😈', '🦄', '🧞', '👺', '🗿', '🥷', '🧌', '👼'],
  item: ['🏹', '🍖', '💍', '📿', '🧿', '🗝️', '💊', '🪓', '🔨', '🪤', '🧨', '🏮', '📯', '🪬', '⏳', '🪨'],
};

function iconGroups() {
  const uniq = (list) => [...new Set(list)];
  const tribes = Object.entries(TRIBES).map(([id, t]) => ({
    label: t.name,
    icons: uniq([...CHARACTERS.filter((c) => c.tribe === id).map((c) => c.icon), ...(ICON_EXTRAS[id] ?? [])]),
  }));
  return [...tribes, { label: '道具', icons: uniq([...ITEMS.map((i) => i.icon), ...ICON_EXTRAS.item]) }];
}

const STAT_FIELDS = {
  character: [
    { k: 'hp', label: 'HP', step: 10 },
    { k: 'atk', label: '攻撃', step: 1 },
    { k: 'def', label: '防御', step: 1 },
    { k: 'spd', label: '攻撃速度（回/秒）', step: 0.1 },
  ],
  item: [
    { k: 'atk', label: '攻撃（隣接キャラへ加算）', step: 1 },
    { k: 'def', label: '防御（隣接キャラへ加算）', step: 1 },
  ],
};
const NEW_PIECE = {
  character: { kind: 'character', name: '新しいキャラ', icon: '🗡️', tribe: 'warrior', hp: 300, atk: 30, def: 20, spd: 1, effects: [] },
  item: { kind: 'item', name: '新しい道具', icon: '⚙️', atk: 10, def: 10, effects: [] },
};

// 能力値を上げる効果（隣接・行・全体）の入力欄。値の単位は、割合なら%、固定値ならそのまま
const buffFields = (target) => [
  { k: 'stat', label: '対象の値', options: STAT_NAMES },
  { k: 'mode', label: '種類', options: BUFF_MODES },
  { k: 'value', label: `${target}に加算`,
    min: (e) => (spdAdd(e) ? SPD_ADD_RANGE[0] : 1),
    max: (e) => (spdAdd(e) ? SPD_ADD_RANGE[1] : e.mode === 'pct' ? EFFECT_MAX.buffPct * 100 : e.stat === 'hp' ? EFFECT_MAX.buffAddHp : EFFECT_MAX.buffAdd),
    step: (e) => (spdAdd(e) ? 0.05 : 1),
    scale: (e) => (e.mode === 'pct' ? 100 : 1) },
];
const buff = (type, stat, mode, value) => () => ({ type, stat, mode, value });
// 攻撃速度の固定値（Ver.3〜。回/秒をそのまま入力する）
const spdAdd = (e) => e.stat === 'spd' && e.mode === 'add';

// 効果ごとの初期値と、入力欄。scale: 画面では%で入力する値。min/max/scale は効果によって変わるなら関数にする。
// hint: 効く範囲（隣接が必要かどうか）。legacy: 過去の環境の効果。新しく選ぶことはできない。
const EFFECTS = {
  poison: {
    name: '毒',
    hint: '攻撃時（道具なら隣のキャラの攻撃に付く）',
    make: () => ({ type: 'poison', stacks: 1, chance: 1 }),
    fields: [
      { k: 'stacks', label: '付与量', min: 1, max: EFFECT_MAX.stacks, step: 1 },
      { k: 'chance', label: '確率(%)', min: 0, max: 100, step: 1, scale: 100 },
    ],
  },
  paralyze: {
    name: '麻痺',
    hint: '攻撃時（道具なら隣のキャラの攻撃に付く）',
    make: () => ({ type: 'paralyze', target: 'front', duration: 2, chance: 0.3 }),
    fields: [
      { k: 'target', label: '対象', options: PARALYZE_TARGETS },
      { k: 'duration', label: '秒数', min: 0.1, max: 30, step: 0.1 },
      { k: 'chance', label: '確率(%)', min: 0, max: 100, step: 1, scale: 100 },
    ],
  },
  curse: {
    name: '呪い',
    hint: '攻撃時（道具なら隣のキャラの攻撃に付く）',
    make: () => ({ type: 'curse', duration: 3, chance: 0.5 }),
    fields: [
      { k: 'duration', label: '秒数', min: 0.5, max: EFFECT_MAX.seconds, step: 0.5 },
      { k: 'chance', label: '確率(%)', min: 0, max: 100, step: 1, scale: 100 },
    ],
  },
  pierce: {
    name: '防御貫通',
    hint: '自分の攻撃（道具なら隣のキャラの攻撃）',
    make: () => ({ type: 'pierce', value: 0.3 }),
    fields: [{ k: 'value', label: '貫通(%)', min: 5, max: 100, step: 5, scale: 100 }],
  },
  adjBuff: { name: '隣接効果', hint: '隣のマスのキャラ', make: buff('adjBuff', 'atk', 'add', 10), fields: buffFields('隣のキャラ') },
  rowBuff: { name: '行効果', hint: '同じ行のキャラ（キャラなら自分も）', make: buff('rowBuff', 'atk', 'add', 10), fields: buffFields('同じ行のキャラ') },
  teamBuff: { name: '全体効果', hint: 'どこに置いても、味方のキャラ全員', make: buff('teamBuff', 'def', 'add', 5), fields: buffFields('味方全員') },
  heal: {
    name: '回復',
    hint: 'どこに置いても（チームHP）',
    make: () => ({ type: 'heal', amount: 10, interval: 1 }),
    fields: [
      { k: 'amount', label: '回復量', min: 1, max: 1000, step: 1 },
      { k: 'interval', label: '間隔(秒)', min: 0.1, max: 30, step: 0.1 },
    ],
  },
  pulse: {
    name: '定期付与',
    hint: 'どこに置いても、一定時間ごとに相手へ',
    make: () => ({ type: 'pulse', status: 'poison', amount: 1, interval: 2 }),
    fields: [
      { k: 'status', label: '状態異常', options: PULSE_STATUS },
      { k: 'amount', label: (e) => (e.status === 'curse' ? '秒数' : '付与量'), min: (e) => (e.status === 'curse' ? 0.5 : 1), max: (e) => (e.status === 'curse' ? EFFECT_MAX.seconds : EFFECT_MAX.stacks), step: (e) => (e.status === 'curse' ? 0.5 : 1) },
      { k: 'interval', label: '間隔(秒)', min: 0.1, max: 30, step: 0.05 },
    ],
  },
  lifesteal: {
    name: '吸血',
    hint: '自分の攻撃（与えたダメージの割合だけチームHPを回復）',
    when: lifestealAllowed, // Ver.3〜
    make: () => ({ type: 'lifesteal', value: 0.3 }),
    fields: [{ k: 'value', label: '吸血(%)', min: 5, max: 100, step: 5, scale: 100 }],
  },
  // Ver.3〜の効果（その環境の査定があるときだけ選べる）
  rally: {
    name: '号令',
    hint: 'どこに置いても、開始から決まった秒数だけ味方全員',
    when: () => effectAllowed('rally'),
    make: () => ({ type: 'rally', stat: 'spd', value: 0.2, duration: 5 }),
    fields: [
      { k: 'stat', label: '対象の値', options: RALLY_STATS },
      { k: 'value', label: '上げる(%)', min: 5, max: EFFECT_MAX.buffPct * 100, step: 5, scale: 100 },
      { k: 'duration', label: '秒数', min: 0.5, max: EFFECT_MAX.seconds, step: 0.5 },
    ],
  },
  cure: {
    name: '手当て',
    hint: 'どこに置いても、一定時間ごとに味方の毒を減らし、麻痺のいちばん長い1体を解く',
    when: () => effectAllowed('cure'),
    make: () => ({ type: 'cure', poison: 2, interval: 2 }),
    fields: [
      { k: 'poison', label: '減らす毒', min: 0, max: EFFECT_MAX.stacks, step: 1 },
      { k: 'interval', label: '間隔(秒)', min: 0.5, max: 30, step: 0.5 },
    ],
  },
  lifestealAura: {
    name: '吸血を配る',
    hint: '隣のマスのキャラに吸血を付ける',
    when: () => effectAllowed('lifestealAura'),
    make: () => ({ type: 'lifestealAura', value: 0.2 }),
    fields: [{ k: 'value', label: '吸血(%)', min: 5, max: 100, step: 5, scale: 100 }],
  },
  venomAtk: {
    name: '毒で攻撃+',
    hint: '自分の攻撃（相手の毒の蓄積1ごとに上がる）',
    when: () => effectAllowed('venomAtk'),
    make: () => ({ type: 'venomAtk', value: 1 }),
    fields: [{ k: 'value', label: '蓄積1ごとの攻撃', min: 0.1, max: 10, step: 0.1 }],
  },
  itemAmp: {
    name: '道具を磨く',
    hint: '隣のマスの道具の攻撃・防御（その道具の隣のキャラ全員に効く）',
    when: () => effectAllowed('itemAmp'),
    make: () => ({ type: 'itemAmp', stat: 'atk', value: 0.3 }),
    fields: [
      { k: 'stat', label: '対象の値', options: AMP_STATS },
      { k: 'value', label: '上げる(%)', min: 5, max: 200, step: 5, scale: 100 },
    ],
  },
  adjAtkMult: {
    name: '隣接攻撃倍率（Ver.1）',
    legacy: true,
    hint: '隣のマスのキャラ',
    make: () => ({ type: 'adjAtkMult', mult: 0.2 }),
    fields: [{ k: 'mult', label: '隣接キャラの攻撃+%', min: 0, max: 500, step: 5, scale: 100 }],
  },
};

// 「駒作成」タブ：キャラクター・道具を作り、保存庫に保存する。
export function initPieceEditor({ store }) {
  let form = null; // 編集中の駒（null なら何も開いていない）
  let baseline = '';
  let saved = store.load();

  const dirty = () => !!form && JSON.stringify(form) !== baseline;
  const isSaved = () => !!form && saved.some((p) => p.id === form.id);
  const confirmDiscard = () => !dirty() || window.confirm(DIRTY_CONFIRM);
  const clone = (p) => structuredClone(p);

  function setMessage(kind, lines) {
    const list = [].concat(lines);
    $('piece-message').className = `message message--${kind}`;
    $('piece-message').innerHTML = list.length > 1
      ? `<ul>${list.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
      : escapeHtml(list[0] ?? '');
  }

  function open(piece, { isNew = false } = {}) {
    form = clone(piece);
    baseline = isNew ? '' : JSON.stringify(form);
    renderAll();
  }

  // ---- 描画 ----
  function renderList() {
    const row = (p) => {
      const cost = costBreakdown(p).total;
      return `<button type="button" class="slot-btn${form?.id === p.id ? ' selected' : ''}" data-open="${escapeHtml(p.id)}">`
        + `<span class="slot-no">${escapeHtml(p.icon)}</span><span class="slot-name">${escapeHtml(p.name)}</span>`
        + `<span class="muted">${p.kind === 'character' ? TRIBES[p.tribe].name : '道具'} ・${cost}</span></button>`;
    };
    $('piece-list').innerHTML = saved.length
      ? saved.map(row).join('')
      : '<p class="muted">まだありません。「＋」から作成してください。</p>';
  }

  const statRow = (f) => {
    const [min, max] = STAT_RANGES[form.kind][f.k];
    const attrs = `data-f="${f.k}" min="${min}" max="${max}" step="${f.step}" value="${form[f.k]}"`;
    return `<div class="stat-row"><span class="stat-label">${f.label}</span>`
      + `<input type="range" ${attrs}><input type="number" ${attrs}>`
      + `<span class="muted range-note">${min}〜${max}</span></div>`;
  };

  const effectRow = (e, i) => {
    const def = EFFECTS[e.type];
    // この駒の種類に付けられる効果だけを選べる（過去の環境の効果は、すでに付いているときだけ出す）
    const choices = Object.entries(EFFECTS)
      .filter(([id, d]) => id === e.type || (!d.legacy && (d.when?.() ?? true) && EFFECT_TYPES[id].on.includes(form.kind)));
    const typeSelect = `<select data-e="${i}" data-k="type">${choices
      .map(([id, d]) => `<option value="${id}"${id === e.type ? ' selected' : ''}>${d.name}</option>`).join('')}</select>`;
    const of = (x) => (typeof x === 'function' ? x(e) : x);
    const fields = def.fields.map((f) => {
      if (f.options) {
        return `<label>${of(f.label)} <select data-e="${i}" data-k="${f.k}">${Object.entries(f.options)
          .map(([id, name]) => `<option value="${id}"${id === e[f.k] ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></label>`;
      }
      const scale = of(f.scale);
      const shown = scale ? Math.round(e[f.k] * scale) : e[f.k];
      return `<label>${of(f.label)} <input type="number" data-e="${i}" data-k="${f.k}"${scale ? ` data-scale="${scale}"` : ''}`
        + ` min="${of(f.min)}" max="${of(f.max)}" step="${of(f.step)}" value="${shown}"></label>`;
    }).join('');
    return `<div class="effect-row">${typeSelect}${fields}<button type="button" data-remove-effect="${i}" title="この効果を外す">✕</button>`
      + `<span class="muted effect-hint">効く範囲：${escapeHtml(def.hint)}</span></div>`;
  };

  function renderForm() {
    const root = $('piece-form');
    if (!form) {
      root.innerHTML = '<div class="panel muted">左の一覧から駒を選ぶか、「＋」で新しく作成してください。</div>';
      return;
    }
    const tribe = form.kind === 'character'
      ? `<label>種族 <select data-f="tribe">${Object.entries(TRIBES)
        .map(([id, t]) => `<option value="${id}"${id === form.tribe ? ' selected' : ''}>${t.name}</option>`).join('')}</select></label>`
      : '';
    root.innerHTML = `
      <div class="panel form-panel">
        <h3>${form.kind === 'character' ? 'キャラクター' : '道具'}${isSaved() ? '' : ' （新規）'} <span id="piece-dirty" class="dirty" hidden>● 未保存</span></h3>
        <div class="form-row">
          <label>名前 <input type="text" data-f="name" maxlength="${MAX_NAME}" value="${escapeHtml(form.name)}"></label>
          <label>アイコン <input type="text" data-f="icon" class="icon-input" value="${escapeHtml(form.icon)}"></label>
          ${tribe}
        </div>
        <div class="icon-pick">${iconGroups().map((g) => `<div class="icon-group"><span class="muted icon-group-label">${escapeHtml(g.label)}</span>`
          + g.icons.map((ic) => `<button type="button" data-icon="${escapeHtml(ic)}"${ic === form.icon ? ' class="selected"' : ''}>${escapeHtml(ic)}</button>`).join('')
          + '</div>').join('')}</div>
        <h4>ステータス</h4>
        ${STAT_FIELDS[form.kind].map(statRow).join('')}
        <h4>特殊効果 <span class="muted">（${MAX_EFFECTS}個まで）</span></h4>
        <div id="effect-list">${form.effects.map(effectRow).join('')}</div>
        <div class="buttons buttons--wrap"><button id="effect-add" type="button">＋ 効果を追加</button></div>
      </div>
      <div class="editor-body piece-result">
        <div class="panel" id="piece-cost"></div>
        <div class="panel" id="piece-preview"></div>
      </div>
      <ul id="piece-errors" class="errors"></ul>
      <div class="buttons buttons--wrap">
        <button id="piece-save" type="button" class="primary">保存</button>
        <button id="piece-copy" type="button">複製して新規作成</button>
        <button id="piece-delete" type="button">削除</button>
      </div>`;
    $('effect-add').disabled = form.effects.length >= MAX_EFFECTS;
    renderDerived();
  }

  // 入力のたびに変わる部分（コスト・プレビュー・エラー）だけ更新する。入力欄は作り直さない。
  function renderDerived() {
    if (!form) return;
    const errors = validatePiece(form);
    $('piece-errors').innerHTML = errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('');
    $('piece-save').disabled = errors.length > 0;
    $('piece-delete').disabled = !isSaved();
    $('piece-dirty').hidden = !dirty();
    $('effect-add').disabled = form.effects.length >= MAX_EFFECTS;
    if (errors.length) {
      $('piece-cost').innerHTML = '<h4>コスト</h4><p class="muted">入力を直すと表示されます</p>';
      $('piece-preview').innerHTML = '<h4>プレビュー</h4><p class="muted">—</p>';
      return;
    }
    const b = costBreakdown(form);
    // どのボードに置けるか（コスト上限を超える駒は、そのボードには置けない）
    const fits = Object.values(BOARDS).filter((bd) => b.total <= bd.costCap).map((bd) => bd.name);
    const fitNote = fits.length === Object.keys(BOARDS).length ? ''
      : fits.length ? `<p class="muted">${fits.join('・')}にだけ置けます（ほかのボードのコスト上限を超えています）</p>`
        : '<p class="message message--error">コストが高すぎて、どのボードにも置けません</p>';
    $('piece-cost').innerHTML = `<h4>コスト</h4><p class="cost-total">${b.total}</p>${fitNote}`
      + `<table class="breakdown">${b.parts.map((p) => `<tr><td>${escapeHtml(p.label)}</td><td>${p.value.toFixed(2)}</td></tr>`).join('')}`
      + `<tr><td>実力の合計</td><td>${b.raw.toFixed(2)}</td></tr>`
      + `<tr><td>コスト（高い駒ほど割高）</td><td>${b.total}</td></tr></table>`;
    // 比べやすいように、コストの近い標準の駒を並べる
    const near = [...CHARACTERS, ...ITEMS]
      .filter((p) => p.kind === form.kind && Math.abs(pieceCost(p) - b.total) <= 1)
      .sort((x, y) => pieceCost(x) - pieceCost(y));
    const ref = near.length
      ? `<h4>コストの近い標準の駒</h4><ul class="ref-list">${near.map((p) => `<li>${pieceSummary(p)}</li>`).join('')}</ul>`
      : '';
    $('piece-preview').innerHTML = `<h4>プレビュー</h4>${pieceSummary(form)}${ref}`;
  }

  function renderAll() {
    renderList();
    renderForm();
  }

  // ---- 入力 ----
  const number = (el) => (el.value === '' ? Number.NaN : el.valueAsNumber);

  $('piece-form').addEventListener('input', (ev) => {
    const el = ev.target;
    if (!form) return;
    if (el.dataset.f) {
      form[el.dataset.f] = el.type === 'range' || el.type === 'number' ? number(el) : el.value;
      // スライダーと数値欄を同期する
      for (const other of $('piece-form').querySelectorAll(`[data-f="${el.dataset.f}"]`)) {
        if (other !== el && other.value !== el.value) other.value = el.value;
      }
    } else if (el.dataset.e !== undefined && el.dataset.k !== 'type') {
      const effect = form.effects[Number(el.dataset.e)];
      if (!effect) return;
      const scale = Number(el.dataset.scale) || 1;
      effect[el.dataset.k] = el.tagName === 'SELECT' ? el.value : Math.round((number(el) / scale) * 10000) / 10000;
    } else {
      return;
    }
    renderDerived();
    if (el.dataset.f === 'name' || el.dataset.f === 'icon') renderList();
  });

  $('piece-form').addEventListener('change', (ev) => {
    const el = ev.target;
    if (form && el.dataset.e !== undefined && el.dataset.k === 'type') {
      form.effects[Number(el.dataset.e)] = EFFECTS[el.value].make();
      renderForm(); // 効果の種類を変えると入力欄が変わる
    } else if (form && el.dataset.e !== undefined && ['mode', 'stat', 'status'].includes(el.dataset.k)) {
      // 能力値を上げる効果の種類・対象を変えたら、値の単位が変わるので入れ直す（攻撃速度は割合のみ）
      const effect = form.effects[Number(el.dataset.e)];
      if (BUFF_TYPES.has(effect?.type)) {
        if (effect.stat === 'spd' && !spdAddAllowed()) effect.mode = 'pct';
        effect.value = effect.mode === 'pct' || spdAdd(effect) ? 0.1 : effect.stat === 'hp' ? 50 : 10;
      } else if (effect?.type === 'pulse') {
        effect.amount = effect.status === 'curse' ? 3 : 1; // 毒なら付与量、呪いなら秒数
      } else {
        return;
      }
      renderForm();
      renderDerived();
    }
  });

  $('piece-form').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn || !form) return;
    if (btn.dataset.icon) {
      form.icon = btn.dataset.icon;
      renderForm();
      renderList();
    } else if (btn.dataset.removeEffect !== undefined) {
      form.effects.splice(Number(btn.dataset.removeEffect), 1);
      renderForm();
    } else if (btn.id === 'effect-add' && form.effects.length < MAX_EFFECTS) {
      form.effects.push(EFFECTS.poison.make());
      renderForm();
    } else if (btn.id === 'piece-save') {
      save();
    } else if (btn.id === 'piece-copy') {
      const copy = clone(form);
      copy.id = newPieceId();
      copy.name = `${copy.name}（コピー）`.slice(0, MAX_NAME);
      open(copy, { isNew: true });
      setMessage('info', '複製しました。保存するまでは一覧に追加されません');
    } else if (btn.id === 'piece-delete') {
      remove();
    }
  });

  function save() {
    const errors = validatePiece(form);
    const { piece } = sanitizePiece(form);
    if (errors.length || !piece) {
      setMessage('error', errors);
      return;
    }
    form.name = form.name.trim();
    if (!store.save(form)) {
      setMessage('error', '保存できませんでした（保存できる数の上限か、ブラウザの保存領域がいっぱいです）');
      return;
    }
    saved = store.load();
    baseline = JSON.stringify(form);
    renderAll();
    setMessage('ok', `「${form.name}」を保存しました。チーム編成の駒パレットに出ます`);
  }

  function remove() {
    if (!isSaved() || !window.confirm(`「${form.name}」を削除しますか？\n（すでにチームに入れた駒は、チーム側のコピーが残ります）`)) return;
    store.remove(form.id);
    saved = store.load();
    form = null;
    baseline = '';
    renderAll();
    setMessage('info', '削除しました');
  }

  $('piece-list').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-open]');
    if (!btn || btn.dataset.open === form?.id) return;
    const piece = saved.find((p) => p.id === btn.dataset.open);
    if (piece && confirmDiscard()) {
      open(piece);
      setMessage('info', '');
    }
  });

  for (const kind of ['character', 'item']) {
    $(`piece-new-${kind}`).addEventListener('click', () => {
      if (!confirmDiscard()) return;
      open({ id: newPieceId(), ...NEW_PIECE[kind] }, { isNew: true });
      setMessage('info', '');
    });
  }

  // ---- JSON ----
  const download = (text, name) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // すぐ消すとダウンロードが始まらないブラウザがある
    setMessage('ok', `${name} をダウンロードしました`);
  };
  const safeName = (s) => s.trim().replace(/[\\/:*?"<>|]/g, '_') || 'piece';

  // 書き出せるのは、ルールを満たしている駒だけ
  const exportable = () => {
    if (!form) {
      setMessage('error', '書き出す駒を開いてください');
      return null;
    }
    const errors = validatePiece(form);
    if (errors.length) {
      setMessage('error', ['入力に問題があるため書き出せません', ...errors]);
      return null;
    }
    return exportPieceJson(form);
  };

  $('piece-json-download').addEventListener('click', () => {
    const text = exportable();
    if (text) download(text, `${safeName(form.name)}.piece.json`);
  });

  $('piece-json-copy').addEventListener('click', async () => {
    const text = exportable();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setMessage('ok', 'JSONをクリップボードにコピーしました');
    } catch {
      $('piece-json-paste').hidden = false;
      $('piece-json-text').value = text;
      $('piece-json-text').select();
      setMessage('info', 'コピーできなかったため、下のテキストを手動でコピーしてください');
    }
  });

  $('piece-json-all').addEventListener('click', () => {
    if (!saved.length) {
      setMessage('error', '保存済みの駒がありません');
      return;
    }
    download(exportPiecesJson(saved), 'my-pieces.pieces.json');
  });

  function importText(text) {
    const { pieces, errors } = parsePieceJson(text);
    if (errors.length) {
      setMessage('error', ['読み込めませんでした', ...errors]);
      return;
    }
    if (!confirmDiscard()) return;
    let added = 0;
    let replaced = 0;
    let skipped = 0;
    const toSave = [];
    for (const piece of pieces) {
      const existing = saved.find((p) => p.id === piece.id);
      if (!existing) {
        toSave.push(piece);
        added += 1;
      } else if (JSON.stringify(existing) === JSON.stringify(piece)) {
        skipped += 1;
      } else if (window.confirm(`同じIDの駒「${existing.name}」があります。「${piece.name}」で上書きしますか？\n（キャンセルすると、別の駒として追加します）`)) {
        toSave.push(piece);
        replaced += 1;
      } else {
        toSave.push({ ...piece, id: newPieceId() });
        added += 1;
      }
    }
    if (toSave.length && !store.saveMany(toSave)) {
      setMessage('error', '保存できませんでした（保存できる数の上限か、ブラウザの保存領域がいっぱいです）');
      return;
    }
    saved = store.load();
    const last = toSave.at(-1) ?? pieces.at(-1);
    open(saved.find((p) => p.id === last.id) ?? last);
    setMessage('ok', `読み込みました（追加${added}・上書き${replaced}・変更なし${skipped}）`);
  }

  $('piece-json-file').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    if (file.size > MAX_JSON_CHARS) {
      setMessage('error', 'ファイルが大きすぎます');
      return;
    }
    importText(await file.text());
  });
  $('piece-json-open').addEventListener('click', () => $('piece-json-file').click());
  $('piece-json-paste-toggle').addEventListener('click', () => {
    $('piece-json-paste').hidden = !$('piece-json-paste').hidden;
    if (!$('piece-json-paste').hidden) $('piece-json-text').focus();
  });
  $('piece-json-apply').addEventListener('click', () => {
    importText($('piece-json-text').value);
    $('piece-json-text').value = '';
  });

  renderAll();
  return {
    isDirty: dirty,
    // 他のタブから戻ったときに、保存庫の内容を読み直す
    refresh() {
      saved = store.load();
      renderList();
    },
  };
}
