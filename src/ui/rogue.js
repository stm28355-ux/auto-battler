import { BOARDS } from '../data/boards.js';
import { TRIBES } from '../data/tribes.js';
import { createCatalog } from '../core/catalog.js';
import { pieceCost } from '../core/cost.js';
import { validateTeam } from '../core/team.js';
import { runBattle } from '../engine/battle.js';
import { autoTeam } from '../rogue/auto.js';
import { BASE_LIFE, FRONT_FLOOR, KIND_NAMES, LIMITS, PERKS, piecePrice, PRICES, TOP_FLOOR, floorKind, gameOverPoints } from '../rogue/config.js';
import { allocCost, changeAlloc, lifeOf } from '../rogue/meta.js';
import {
  addBonus, battleTeam, continueRun, createRogueStore, enemyRules, finishRun, giveUp, loseFloor, recordFloor,
  reroll, runRules, shortcutFloors, stackRelics, startRun, takeReward, winFloor,
} from '../rogue/run.js';
import { renderBoard } from './boardView.js';
import { $, effectsText, escapeHtml, pieceSummary, tribeTag } from './format.js';

// 「ローグライト」：塔の1〜100層を登る（spec §15）。
//   go(view, mode): 画面を切り替える（'team' + 'rogue' で挑戦中の編成、'battle' + 'story' で対戦）
//   battle: 対戦タブ（playStory を使う）
//   storage: 引継ぎと挑戦中のデータの保存先
//   env / latest / switchToLatest: ローグライトは最新の環境でだけ遊ぶ
export function initRogue({ go, battle, storage, env, latest, switchToLatest }) {
  const catalog = createCatalog();
  const store = createRogueStore(storage, catalog);
  let meta = null;
  let run = null;
  let ending = null; // 終わった挑戦の結果（表示用）
  let board = 'square'; // 挑戦を始めるときに選ぶボード
  let picks = { pieces: null, relics: null }; // 報酬で選んでいるセット
  let resume = null; // 対戦から戻ったときに表示する画面
  const root = () => $('rogue-root');
  const piece = (id) => catalog.piece(id);
  const relic = (id) => catalog.relic(id);
  const sum = (obj) => Object.values(obj).reduce((s, n) => s + n, 0);
  const saveRun = () => store.saveRun(run);
  const saveMeta = () => store.saveMeta(meta);

  // 挑戦が終わった（ゲームオーバー・諦めた・100層クリア）：ポイントを足して、挑戦中のデータを消す
  function finish() {
    const done = finishRun(meta, run);
    meta = done.meta;
    ending = { phase: run.phase, floor: run.floor, points: done.points, total: meta.points };
    run = null;
    saveMeta();
    store.saveRun(null);
  }

  // 対戦の結果を反映する（勝ち・負け）。100層クリア・ゲームオーバーなら挑戦を終える
  function applyResult(winner) {
    if (winner === 'a') {
      const { bonus } = winFloor(run, catalog);
      if (bonus) ending = { bonus };
      meta = bonus ? addBonus(meta, run, bonus) : recordFloor(meta, run);
      saveMeta();
      picks = { pieces: null, relics: null };
    } else loseFloor(run);
    if (run.phase === 'over' || run.phase === 'final') finish();
    else saveRun();
  }

  // 結果が出る前にページを閉じた対戦は、開き直したときに同じシードで結果を出す
  function settlePending() {
    if (!run?.pending) return null;
    const r = runBattle(run.pending.team, run.enemy, catalog, { seed: run.pending.seed });
    applyResult(r.winner);
    return r.winner;
  }

  // ---- 共通の部品 ----
  const pieceChip = (id) => {
    const p = piece(id);
    return `<span class="rogue-chip" data-piece="${escapeHtml(id)}" title="${escapeHtml(pieceSummary(p).replace(/<[^>]*>/g, ' '))}">${escapeHtml(p.icon)} ${escapeHtml(p.name)} <span class="cost">${pieceCost(p)}</span>${p.kind === 'character' ? ` ${tribeTag(p.tribe)}` : ''}</span>`;
  };
  const relicChip = (id, n = 1) => {
    const r = relic(id);
    return `<span class="rogue-chip" data-relic="${escapeHtml(id)}" title="${escapeHtml(effectsText(r.effects).replace(/<[^>]*>/g, ' '))}">${escapeHtml(r.icon)} ${escapeHtml(r.name)}${n > 1 ? ` ×${n}` : ''}</span>`;
  };
  const relicList = (ids) => {
    const counts = new Map();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts].map(([id, n]) => relicChip(id, n)).join('') || '<span class="muted">なし</span>';
  };
  const hearts = () => `${'❤️'.repeat(run.life)}${'🖤'.repeat(Math.max(0, run.maxLife - run.life))}`;

  // ---- トップ（引継ぎ・挑戦の開始）----
  function renderTop() {
    resume = null;
    const used = allocCost(meta.alloc, catalog);
    const left = meta.points - used;
    const a = meta.alloc;
    const stepper = (label, value, max, attrs, price, extra = '', min = 0) => `<div class="rogue-row"><span class="rogue-row-name">${label}${extra}</span>`
      + `<span class="rogue-stepper"><button type="button" ${attrs} data-d="-1" ${value <= min ? 'disabled' : ''}>−</button>`
      + `<strong>${value}</strong><span class="muted">/${max}</span>`
      + `<button type="button" ${attrs} data-d="1" ${value >= max || left < price ? 'disabled' : ''}>＋</button></span>`
      + `<span class="muted rogue-price">${price}pt</span></div>`;
    const perks = Object.entries(PERKS).map(([k, p]) => `<label class="rogue-row rogue-perk"><input type="checkbox" data-perk="${k}" ${a.perks[k] ? 'checked' : ''} ${!a.perks[k] && left < p.price ? 'disabled' : ''}>`
      + `<span class="rogue-row-name"><strong>${escapeHtml(p.name)}</strong><small class="muted">${escapeHtml(p.text)}</small></span><span class="muted rogue-price">${p.price}pt</span></label>`).join('');
    const relicRows = catalog.relics().map((r) => stepper(`${escapeHtml(r.icon)} ${escapeHtml(r.name)}`, a.relics[r.id] ?? 0, LIMITS.relic, `data-group="relics" data-id="${r.id}"`, PRICES.relic,
      `<small class="muted">${effectsText(r.effects)}</small>`)).join('');
    const byCost = (x, y) => pieceCost(x) - pieceCost(y);
    const pieceRows = (list) => list.sort(byCost).map((p) => stepper(`${escapeHtml(p.icon)} ${escapeHtml(p.name)} <span class="cost">${pieceCost(p)}</span>`, a.pieces[p.id] ?? 0, LIMITS.piece,
      `data-group="pieces" data-id="${p.id}"`, piecePrice(pieceCost(p)))).join('');
    const pieces = catalog.pieces();
    const pieceGroups = [
      ...Object.entries(TRIBES).map(([id]) => [tribeTag(id), pieces.filter((p) => p.kind === 'character' && p.tribe === id)]),
      ['道具', pieces.filter((p) => p.kind === 'item')],
    ].map(([label, list]) => `<details class="rogue-group"><summary>${label} <span class="muted">${list.reduce((s, p) => s + (a.pieces[p.id] ?? 0), 0)}個</span></summary>${pieceRows(list)}</details>`).join('');
    const starts = shortcutFloors(meta);
    const resumeCard = run
      ? `<section class="panel rogue-resume"><h3>挑戦中</h3><p>第${run.floor}層 ／ ${BOARDS[run.board].name} ／ ライフ ${hearts()}</p>`
        + '<div class="buttons"><button type="button" class="primary" data-continue>▶ 続きから</button></div>'
        + '<p class="muted">引継ぎの割り振りを変えると、次の挑戦から反映されます。</p></section>'
      : `<section class="panel"><h3>挑戦を始める</h3>
          <p class="muted">ボードは挑戦の途中で変えられません。コストの上限はなく、持っている駒を持っている数まで置けます。</p>
          <div class="rogue-boards">${Object.values(BOARDS).map((b) => `<label class="rogue-board${b.id === board ? ' selected' : ''}"><input type="radio" name="rogue-board" value="${b.id}" ${b.id === board ? 'checked' : ''}><strong>${b.name}</strong><span class="muted">${b.cells.length}マス</span></label>`).join('')}</div>
          ${starts.length ? `<label>開始する層 <select id="rogue-start"><option value="1">1層</option>${starts.map((f) => `<option value="${f}">${f}層（ショートカット）</option>`).join('')}</select></label>` : ''}
          <p>ライフ ${lifeOf(a)} ／ リロール ${a.reroll}回 ／ 持ち込み 駒${sum(a.pieces)}個・遺物${sum(a.relics)}個</p>
          <div class="buttons"><button type="button" class="primary" data-start ${sum(a.pieces) ? '' : 'disabled'}>🗼 挑戦開始</button></div>
          ${sum(a.pieces) ? '' : '<p class="message message--error">駒を1つ以上持ち込んでください。</p>'}
        </section>`;
    root().innerHTML = `
      <section class="panel rogue-head">
        <div><h2>🗼 試練の塔</h2><p class="muted">1〜${FRONT_FLOOR}層で表クリア、${TOP_FLOOR}層で裏クリア。ゲームオーバーになると、層 ÷ 5 のポイントが手に入ります。</p></div>
        <div class="story-stats">
          <div><span class="muted">使えるポイント</span><strong>${left} / ${meta.points}</strong></div>
          <div><span class="muted">最高到達</span><strong>${meta.best ? `${meta.best}層` : '—'}</strong></div>
          <div><span class="muted">表クリア</span><strong>${meta.clears.front}回</strong></div>
          <div><span class="muted">裏クリア</span><strong>${meta.clears.top}回</strong></div>
          <div><span class="muted">挑戦</span><strong>${meta.runs}回</strong></div>
        </div>
      </section>
      ${resumeCard}
      <section class="panel rogue-alloc">
        <h3>引継ぎ <span class="muted">（ポイントの割り振りは、いつでも無料でやり直せます）</span></h3>
        ${stepper('🎲 リロール回数', a.reroll, LIMITS.reroll, 'data-alloc="reroll"', PRICES.reroll, '<small class="muted">報酬の候補を引き直せる回数。一の位が1の層で戻る</small>')}
        ${stepper('❤️ ライフ', lifeOf(a), LIMITS.life, 'data-alloc="life"', PRICES.life, '<small class="muted">負けると1減り、0でゲームオーバー</small>', BASE_LIFE)}
        <h4>解放</h4>${perks}
        <h4>駒の持ち込み <span class="muted">（1個あたり コスト3以下 1pt・4〜8 2pt・9以上 3pt）</span></h4>${pieceGroups}
        <h4>遺物の持ち込み</h4><details class="rogue-group"><summary>遺物 <span class="muted">${sum(a.relics)}個</span></summary>${relicRows}</details>
      </section>`;
  }

  // ---- 層（敵と戦う）----
  function renderFloor() {
    resume = null;
    const kind = floorKind(run.floor);
    const team = battleTeam(run);
    const errors = validateTeam(team, catalog, runRules(run));
    root().innerHTML = `
      <section class="panel rogue-floor-head">
        <h2>第${run.floor}層 <span class="rogue-kind rogue-kind--${kind}">${KIND_NAMES[kind]}</span></h2>
        <div class="story-stats">
          <div><span class="muted">ライフ</span><strong>${hearts()}</strong></div>
          <div><span class="muted">リロール</span><strong>${run.rerolls} / ${run.maxRerolls}</strong></div>
          <div><span class="muted">駒</span><strong>${sum(run.pieces)}個</strong></div>
          <div><span class="muted">遺物</span><strong>${sum(run.relics)}個</strong></div>
        </div>
      </section>
      <div class="rogue-vs">
        <section class="panel">
          <h3>相手：${escapeHtml(run.enemy.name)}</h3>
          <p class="muted">${BOARDS[run.enemy.board].name}</p>
          <div id="rogue-enemy" class="board-wrap story-foe-board"></div>
          <p>遺物：${relicList(run.enemy.relics)}</p>
        </section>
        <section class="panel">
          <h3>あなたのチーム</h3>
          <p class="muted">${BOARDS[run.board].name}</p>
          <div id="rogue-mine" class="board-wrap story-foe-board"></div>
          <p>遺物（自動）：${relicList(team.relics)}</p>
          ${errors.length ? `<ul class="errors">${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>` : ''}
        </section>
      </div>
      <div class="buttons buttons--wrap">
        <button type="button" class="primary" data-fight ${errors.length ? 'disabled' : ''}>⚔️ 対戦する</button>
        <button type="button" data-edit>🧩 編成する</button>
        <button type="button" data-auto>🪄 おまかせで組む</button>
        <button type="button" data-giveup>🏳️ 諦める</button>
        <button type="button" data-top>トップへ</button>
      </div>
      <details class="panel rogue-owned"><summary>持っている駒・遺物</summary>
        <p>${Object.entries(run.pieces).sort(([x], [y]) => pieceCost(piece(x)) - pieceCost(piece(y))).map(([id, n]) => `${pieceChip(id)}<span class="muted">×${n}</span>`).join(' ')}</p>
        <p>${relicList(stackRelics(run.relics))}</p>
      </details>`;
    $('rogue-enemy').replaceChildren(renderBoard(BOARDS[run.enemy.board], { team: run.enemy, catalog }));
    $('rogue-mine').replaceChildren(renderBoard(BOARDS[run.board], { team, catalog }));
  }

  function fight() {
    const floor = run.floor;
    let seed = null;
    battle.playStory({
      teams: { a: battleTeam(run), b: run.enemy },
      rules: runRules(run),
      rulesB: enemyRules,
      icon: '🗼',
      title: `第${floor}層：vs ${run.enemy.name}`,
      backLabel: '🗼 塔に戻る',
      canRetry: () => run?.phase === 'floor' && run.floor === floor,
      // 始めた時点で保存しておく（結果が出る前にページを閉じても、開き直したときに同じ結果になる）
      onStart: (s) => {
        if (run?.phase !== 'floor' || run.floor !== floor) return;
        seed = s;
        run.pending = { seed: s, team: battleTeam(run) };
        saveRun();
      },
      onFinish: (r) => {
        if (run?.pending?.seed !== seed || r.seed !== seed) return;
        applyResult(r.winner);
      },
      onBack: () => {
        resume = () => afterBattle();
        go('rogue');
      },
    });
    go('battle', 'story');
  }

  function afterBattle() {
    resume = null;
    settlePending();
    render();
  }

  // ---- 報酬 ----
  // 候補の詳細：駒・遺物にマウスを乗せるとその1つ、セットを選ぶとセットの中身を出す（チーム編成の駒の詳細と同じ表示）
  const detailHint = '駒・遺物にマウスを乗せるか、セットを選ぶと詳細を表示します。';
  const relicDetail = (id) => {
    const r = relic(id);
    return `<strong>${escapeHtml(r.icon)} ${escapeHtml(r.name)}</strong>（遺物）<br>${effectsText(r.effects)}`;
  };
  const detailOf = (el) => (el.dataset.piece ? pieceSummary(piece(el.dataset.piece)) : relicDetail(el.dataset.relic));
  const showDetail = (key, html) => {
    const box = root().querySelector(`[data-detail="${key}"]`);
    if (box) box.innerHTML = html;
  };
  const setDetail = (key) => (picks[key] === null ? detailHint
    : run.offer[key][picks[key]].map((id) => (key === 'pieces' ? pieceSummary(piece(id)) : relicDetail(id))).join('<hr>'));

  function renderReward() {
    const { offer } = run;
    const group = (key, title, chip) => {
      if (!offer[key]) return '';
      const cards = offer[key].map((set, i) => `<button type="button" class="rogue-set${picks[key] === i ? ' selected' : ''}" data-pick="${key}" data-i="${i}">${set.map(chip).join('')}</button>`).join('');
      return `<h3>${title}</h3><div class="rogue-sets">${cards}</div>`
        + `<div class="panel hover-info rogue-detail" data-detail="${key}">${detailHint}</div>`
        + `<div class="buttons"><button type="button" data-reroll="${key}" ${run.rerolls > 0 ? '' : 'disabled'}>🎲 引き直す（残り${run.rerolls}回）</button></div>`;
    };
    const kind = floorKind(run.floor);
    const rare = kind === 'boss' || (kind === 'strong' && run.perks.strongRare);
    const ready = picks.pieces !== null && (!offer.relics || picks.relics !== null);
    root().innerHTML = `
      <section class="panel rogue-reward">
        <h2>🎁 第${run.floor}層 突破！</h2>
        ${ending?.bonus ? `<p class="message message--ok">クリアボーナス ${ending.bonus}ポイントを手に入れました</p>` : ''}
        <p class="muted">セットを1つずつ選んで受け取ってください。</p>
        ${group('pieces', rare ? 'レア駒（2個）' : '駒（2個）', (id) => pieceChip(id))}
        ${group('relics', `遺物（${offer.relics?.[0]?.length ?? 0}個）`, (id) => relicChip(id))}
        <div class="buttons"><button type="button" class="primary" data-take ${ready ? '' : 'disabled'}>受け取って第${run.floor + 1}層へ</button></div>
      </section>`;
    for (const key of ['pieces', 'relics']) if (offer[key]) showDetail(key, setDetail(key));
  }

  // ---- リザルト ----
  function renderFront() {
    root().innerHTML = `
      <section class="panel rogue-result">
        <h2>🏆 表クリア！</h2>
        <p>第${FRONT_FLOOR}層を突破しました。ここから先は裏の塔（〜${TOP_FLOOR}層）です。</p>
        <p>ライフ ${hearts()} ／ 駒 ${sum(run.pieces)}個 ／ 遺物 ${sum(run.relics)}個</p>
        <p class="muted">クリアボーナスの5ポイントは、もう引継ぎに加えてあります。ここで終えると、さらに ${gameOverPoints(run.floor)} ポイントが手に入ります。</p>
        <div class="buttons"><button type="button" class="primary" data-continue-front>▶ 裏の塔へ（第${run.floor}層）</button><button type="button" data-giveup>ここで終える</button></div>
      </section>`;
  }

  function renderEnding() {
    const e = ending;
    ending = null;
    const title = e.phase === 'final' ? '👑 裏クリア！ 塔を制覇しました' : e.phase === 'over' ? '💀 ゲームオーバー' : '🏳️ 挑戦を終えました';
    root().innerHTML = `
      <section class="panel rogue-result">
        <h2>${title}</h2>
        <p>到達：第${e.floor}層</p>
        <p>獲得ポイント：<strong>${e.points}</strong>${e.phase === 'final' ? '（クリアボーナス10ポイントは別に加えてあります）' : ''} ／ 合計 ${e.total}ポイント</p>
        <p class="muted">ポイントを割り振って、次の挑戦に備えましょう。</p>
        <div class="buttons"><button type="button" class="primary" data-top>トップへ</button></div>
      </section>`;
  }

  function render() {
    if (ending?.phase) renderEnding();
    else if (!run) renderTop();
    else if (run.phase === 'reward') renderReward();
    else if (run.phase === 'front') renderFront();
    else renderFloor();
  }

  // ---- 操作（画面を描き直しても効くように、外側で受ける）----
  $('rogue-root').addEventListener('click', (ev) => {
    if (!meta) return;
    const t = ev.target;
    const on = (sel) => t.closest(sel);
    if (on('[data-switch-env]')) switchToLatest();
    else if (on('[data-alloc]') || on('[data-group]')) {
      const btn = on('[data-alloc]') ?? on('[data-group]');
      const what = btn.dataset.alloc ?? [btn.dataset.group, btn.dataset.id];
      const next = changeAlloc(meta, what, Number(btn.dataset.d), catalog);
      if (!next) return;
      const open = [...root().querySelectorAll('.rogue-group')].map((d) => d.open);
      meta = next;
      saveMeta();
      renderTop();
      root().querySelectorAll('.rogue-group').forEach((d, i) => { d.open = open[i]; });
    } else if (on('[data-start]')) {
      const startFloor = Number($('rogue-start')?.value ?? 1);
      run = startRun(meta, { board, startFloor, seed: Math.floor(Math.random() * 2 ** 32) }, catalog);
      saveRun();
      render();
    } else if (on('[data-continue]')) render();
    else if (on('[data-top]')) renderTop();
    else if (on('[data-fight]')) fight();
    else if (on('[data-edit]')) go('team', 'rogue');
    else if (on('[data-auto]')) {
      if (!window.confirm('持っている駒から、おまかせでチームを組み直しますか？（今の配置は消えます）')) return;
      run.team = autoTeam(run.board, run.pieces, catalog, run.team?.name ?? 'わたしのチーム');
      saveRun();
      renderFloor();
    } else if (on('[data-giveup]')) {
      if (!window.confirm(`挑戦を諦めますか？\n第${run.floor}層までのポイント（${gameOverPoints(run.floor)}）を受け取り、駒と遺物は失います。`)) return;
      giveUp(run);
      finish();
      render();
    } else if (on('[data-pick]')) {
      const btn = on('[data-pick]');
      picks[btn.dataset.pick] = Number(btn.dataset.i);
      renderReward();
    } else if (on('[data-reroll]')) {
      const key = on('[data-reroll]').dataset.reroll;
      if (reroll(run, key, catalog)) {
        picks[key] = null;
        saveRun();
        renderReward();
      }
    } else if (on('[data-take]')) {
      if (!takeReward(run, picks, catalog)) return;
      ending = null;
      picks = { pieces: null, relics: null };
      meta = recordFloor(meta, run);
      saveMeta();
      saveRun();
      render();
    } else if (on('[data-continue-front]')) {
      continueRun(run);
      saveRun();
      render();
    }
  });
  // 報酬の候補：マウスを乗せた駒・遺物の詳細。離れたら選んでいるセットの詳細に戻す
  $('rogue-root').addEventListener('mouseover', (ev) => {
    const chip = ev.target.closest('.rogue-set [data-piece], .rogue-set [data-relic]');
    if (chip) showDetail(chip.closest('[data-pick]').dataset.pick, detailOf(chip));
  });
  $('rogue-root').addEventListener('mouseout', (ev) => {
    const set = ev.target.closest('[data-pick]');
    if (set && !set.contains(ev.relatedTarget) && run?.phase === 'reward') showDetail(set.dataset.pick, setDetail(set.dataset.pick));
  });
  $('rogue-root').addEventListener('change', (ev) => {
    const perk = ev.target.closest('[data-perk]');
    const radio = ev.target.closest('[name="rogue-board"]');
    if (radio) {
      board = radio.value;
      renderTop();
    } else if (perk) {
      const next = changeAlloc(meta, ['perks', perk.dataset.perk], perk.checked ? 1 : -1, catalog);
      if (next) {
        meta = next;
        saveMeta();
      }
      renderTop();
    }
  });

  // 挑戦中のチームを、チーム編成タブから読み書きするための保存先（1スロット）
  const teamStore = {
    load: () => [run?.team ?? null],
    save: (_, team) => {
      if (!run) return false;
      run.team = { name: team.name, board: run.board, slots: structuredClone(team.slots), relics: [] };
      return saveRun();
    },
    remove: () => {
      if (!run) return;
      run.team = { ...run.team, slots: [] };
      saveRun();
    },
  };

  return {
    // ローグライトのタブを開いたとき
    show() {
      if (env.id !== latest.id) {
        root().innerHTML = `<section class="panel"><h2>🗼 ローグライト</h2><p>ローグライトは最新の環境（${escapeHtml(latest.name)}）で遊びます。いまは${escapeHtml(env.name)}を選んでいます。</p>`
          + `<div class="buttons"><button type="button" class="primary" data-switch-env>${escapeHtml(latest.name)}に切り替えて始める</button></div></section>`;
        meta = meta ?? store.loadMeta();
        return;
      }
      if (!meta) {
        meta = store.loadMeta();
        run = store.loadRun();
      }
      if (resume) resume();
      else {
        settlePending();
        render();
      }
    },
    // 挑戦中の編成（チーム編成タブの setContext に渡す）
    editorContext() {
      if (!run || env.id !== latest.id) return null;
      return {
        icon: '🗼',
        label: `ローグライトの編成（第${run.floor}層）`,
        note: '持っている駒を、持っている数まで置けます。コストの上限はありません。遺物は持っているものが全部、自動で効きます',
        paletteNote: '持っている駒だけを表示しています。右の数字は「まだ置ける数 / 持っている数」',
        backLabel: '🗼 塔に戻る',
        store: teamStore,
        rules: () => runRules(run),
        board: run.board,
        fixedRelics: () => stackRelics(run.relics),
        onBack: () => go('rogue'),
      };
    },
  };
}
