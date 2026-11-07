import { BOARDS, posKey } from '../data/boards.js';
import { PRESET_TEAMS } from '../data/presetTeams.js';
import { describeEffect } from '../data/effects.js';
import { createCatalog } from '../core/catalog.js';
import { createRecord, pickOpponent } from '../core/randomMatch.js';
import { validateTeam } from '../core/team.js';
import { createBattle, DT, MAX_STEPS } from '../engine/battle.js';
import { battleStatsHtml } from './battleStats.js';
import { renderBoard } from './boardView.js';
import { $, escapeHtml, pieceSummary, tribeTag } from './format.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIDES = ['a', 'b'];
const other = (key) => (key === 'a' ? 'b' : 'a');
// 前線（列が小さい側）が中央を向くように、左のチームだけ反転する。
const MIRROR = { a: true, b: false };
const REASONS = {
  ko: 'HPが0になった',
  simultaneous: '同時にHPが0以下（HP割合の比較）',
  timeout: '時間切れ（HP割合の比較）',
};
const DEFAULT_INFO = 'マスにマウスを乗せると、この対戦での実効ステータスを表示します。';
const MAX_LOG = 300;
const MAX_FRAME_SECONDS = 0.1; // タブが裏に回ったあとに一気に進まないようにする

// 同じアニメーションを最初から再生し直す。
function pulse(el, cls) {
  el.classList.remove(cls);
  void el.getBoundingClientRect();
  el.classList.add(cls);
}

function floater(svg, cell, text, cls) {
  const label = cell.querySelector('text');
  const el = document.createElementNS(SVG_NS, 'text');
  el.setAttribute('x', label.getAttribute('x'));
  el.setAttribute('y', label.getAttribute('y'));
  el.setAttribute('class', `floater ${cls}`);
  el.textContent = text;
  el.addEventListener('animationend', () => el.remove());
  svg.append(el);
}

// 「対戦」タブ：2チームを選び、戦闘エンジンの進行をそのまま再生する。
//   getTeams: 選べるチームの一覧 [{ id, label, team }] を返す（保存チームが増減するたびに呼び直す）
export function initBattleScreen({ getTeams }) {
  let entries = getTeams();
  let game = null;
  let mode = 'custom'; // 'custom'（カスタム対戦）/ 'random'（ランダムマッチ）/ 'story'（ストーリーモード）
  let opponent = null; // ランダムマッチで引いた相手
  // ストーリーモードの対戦：{ teams: { a, b }, rules, title, onFinish(result), onBack() }（src/ui/story.js）
  //   ローグライト（src/ui/rogue.js）も同じ仕組みで使う。追加で
  //   rulesB: 相手のチームの制限、icon / backLabel: 上の帯の表示、canRetry(): 負けたときに「もう一度戦う」を出すか、
  //   onStart(seed): 対戦を始めたとき（結果が出る前にページを閉じたときのため）
  let storyMatch = null;
  const record = createRecord();

  const entryOf = (key) => entries.find((e) => e.id === $(`team-${key}`).value);

  // 選択を保ったまま、選択肢を作り直す。消えたチームを選んでいたら先頭に戻す。
  function fillSelects() {
    const previous = Object.fromEntries(SIDES.map((k) => [k, $(`team-${k}`).value]));
    const defaults = { a: entries[0].id, b: entries[Math.min(1, entries.length - 1)].id };
    for (const key of SIDES) {
      const select = $(`team-${key}`);
      select.innerHTML = entries.map((e) => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.label)}</option>`).join('');
      select.value = entries.some((e) => e.id === previous[key]) ? previous[key] : defaults[key];
    }
  }
  fillSelects();

  const speed = () => Number($('speed').value);
  const seed = () => {
    const n = Number.parseInt($('seed').value, 10);
    return Number.isNaN(n) ? 1 : n;
  };

  function setButtons() {
    const live = !!game && game.running && !game.battle.state.done;
    $('start').disabled = !game;
    $('pause').disabled = !live;
    $('skip').disabled = !live;
    $('pause').textContent = game?.paused ? '再開' : '一時停止';
  }

  function stop() {
    if (!game) return;
    cancelAnimationFrame(game.raf);
    game.running = false;
  }

  // 選択中の2チームで戦闘を作り、盤面を描く（まだ再生はしない）。
  function prepare() {
    stop();
    game = null;
    const picked = mode === 'story' ? storyMatch.teams : { a: entryOf('a').team, b: entryOf('b').team };
    const catalog = createCatalog(SIDES.flatMap((k) => picked[k].customPieces ?? []));
    const rulesOf = (k) => (mode !== 'story' ? null : k === 'a' ? storyMatch.rules : storyMatch.rulesB ?? null);
    const errors = SIDES.flatMap((k) => validateTeam(picked[k], catalog, rulesOf(k)).map((e) => `チーム${k.toUpperCase()}: ${e}`));
    $('setup-errors').innerHTML = errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('');
    if (errors.length) {
      setButtons();
      return false;
    }

    const battle = createBattle(picked.a, picked.b, catalog, { seed: seed(), log: true });
    game = { battle, catalog, teams: picked, views: {}, mode, recorded: false, running: false, paused: false, acc: 0, last: 0, raf: 0, logged: 0 };
    $('result').hidden = true;
    $('battle-stats').hidden = true;
    $('log').replaceChildren();
    for (const key of SIDES) game.views[key] = buildSide(key);
    applySpeed();
    refresh();
    setButtons();
    return true;
  }

  function buildSide(key) {
    const team = game.teams[key];
    const side = game.battle.sides[key];
    const info = $(`info-${key}`);
    const svg = renderBoard(BOARDS[team.board], {
      team,
      catalog: game.catalog,
      mirror: MIRROR[key],
      onHover: (pos, piece) => {
        info.innerHTML = pos ? hoverText(key, pos, piece) : DEFAULT_INFO;
      },
    });
    $(`board-${key}`).replaceChildren(svg);
    info.textContent = DEFAULT_INFO;
    $(`name-${key}`).textContent = `${key.toUpperCase()}: ${team.name}`;
    return {
      svg,
      cells: new Map([...svg.querySelectorAll('.cell')].map((g) => [g.dataset.pos, g])),
      names: new Map(side.units.map((s) => [posKey(s.unit.pos), `${s.unit.piece.icon}${s.unit.piece.name}`])),
    };
  }

  function hoverText(key, pos, piece) {
    const state = game.battle.sides[key].units.find((s) => posKey(s.unit.pos) === posKey(pos));
    if (!state) return piece ? pieceSummary(piece) : '空きマス';
    const u = state.unit;
    const n = (x) => Math.round(x * 10) / 10;
    return `<strong>${escapeHtml(u.piece.icon)} ${escapeHtml(u.piece.name)}</strong> ${tribeTag(u.tribe)}${state.paraSteps > 0 ? ' ❄麻痺中' : ''}<br>`
      + `HP ${n(u.hp)} ／ 攻撃 ${n(u.atk)}${u.atkMult === 1 ? '' : `×${n(u.atkMult)}`} ／ 防御 ${n(u.def)} ／ 攻撃速度 ${n(u.spd)}`
      + (u.pierce ? ` ／ 防御貫通 ${Math.round(u.pierce * 100)}%` : '')
      + (u.onHit.length ? `<br>${u.onHit.map((e) => escapeHtml(describeEffect(e))).join('<br>')}` : '');
  }

  function applySpeed() {
    // 倍速のときは演出も短くする
    $('arena').style.setProperty('--anim', String(Math.min(2, Math.max(0.2, 1 / speed()))));
  }

  function refresh() {
    const { battle } = game;
    for (const key of SIDES) {
      const side = battle.sides[key];
      const ratio = Math.max(0, side.hp / side.maxHp);
      $(`hp-fill-${key}`).style.width = `${ratio * 100}%`;
      $(`hp-text-${key}`).textContent = `${Math.max(0, Math.round(side.hp))} / ${Math.round(side.maxHp)}（${(ratio * 100).toFixed(1)}%）`;
      $(`status-${key}`).textContent = [
        side.poison > 0 ? `☠ 毒 ${side.poison}（0.1秒ごと）` : '',
        side.curseSteps > 0 ? `🕯 呪い 残り${(side.curseSteps * DT).toFixed(1)}秒` : '',
      ].filter(Boolean).join('　');
      for (const s of side.units) {
        game.views[key].cells.get(posKey(s.unit.pos))?.classList.toggle('cell--para', s.paraSteps > 0);
      }
    }
    const t = battle.state.step * DT;
    $('clock-text').textContent = `${t.toFixed(2)} / ${(MAX_STEPS * DT).toFixed(2)} 秒`;
    $('clock').value = t;
  }

  const tag = (key) => `<span class="tag tag--${key}">${key.toUpperCase()}</span>`;

  function logLine(key, html) {
    const li = document.createElement('li');
    li.className = `log--${key}`;
    li.innerHTML = html;
    const list = $('log');
    list.append(li);
    while (list.childElementCount > MAX_LOG) list.firstElementChild.remove();
  }

  // silent: スキップ時など、ログだけ残して演出は出さない。
  function handle(e, silent) {
    const { views } = game;
    switch (e.type) {
      case 'attack': {
        const foe = other(e.side);
        logLine(e.side, `${e.t.toFixed(2)}s ${tag(e.side)} ${escapeHtml(views[e.side].names.get(posKey(e.from)))} → `
          + `${tag(foe)} ${escapeHtml(views[foe].names.get(posKey(e.to)))} <strong>${Math.round(e.dmg)}</strong>`);
        if (silent) return;
        pulse(views[e.side].cells.get(posKey(e.from)), 'cell--attack');
        const target = views[foe].cells.get(posKey(e.to));
        pulse(target, 'cell--hit');
        floater(views[foe].svg, target, String(Math.round(e.dmg)), 'floater--dmg');
        break;
      }
      case 'poison':
        logLine(e.side, `${e.t.toFixed(2)}s ${tag(e.side)} ☠ 毒+${e.stacks}（${tag(other(e.side))}の蓄積 ${e.total}）`);
        if (!silent) pulse($(`status-${other(e.side)}`), 'status--flash');
        break;
      case 'paralyze': {
        const foe = other(e.side);
        const targets = e.targets ?? [e.target];
        const names = targets.map((p) => escapeHtml(views[foe].names.get(posKey(p)))).join('・');
        logLine(e.side, `${e.t.toFixed(2)}s ${tag(e.side)} ❄ 麻痺${e.seconds}秒 → ${tag(foe)} ${names}`);
        if (!silent) for (const p of targets) floater(views[foe].svg, views[foe].cells.get(posKey(p)), '❄', 'floater--para');
        break;
      }
      case 'curse':
        logLine(e.side, `${e.t.toFixed(2)}s ${tag(e.side)} 🕯 呪い${e.seconds}秒 → ${tag(other(e.side))}`);
        if (!silent) pulse($(`status-${other(e.side)}`), 'status--flash');
        break;
      case 'heal':
        logLine(e.side, `${e.t.toFixed(2)}s ${tag(e.side)} 💚 回復 +${e.amount}`);
        if (!silent) pulse($(`hpbar-${e.side}`), 'hpbar--heal');
        break;
      case 'cure': {
        const freed = e.unparalyzed ? `・${escapeHtml(views[e.side].names.get(posKey(e.unparalyzed)))}の麻痺を解く` : '';
        if (e.poison > 0 || freed) logLine(e.side, `${e.t.toFixed(2)}s ${tag(e.side)} ✚ 手当て 毒-${e.poison}${freed}`);
        break;
      }
      default:
        break; // poisonTick は多いのでログに出さない
    }
  }

  function flushEvents(silent) {
    const { events } = game.battle;
    for (; game.logged < events.length; game.logged += 1) handle(events[game.logged], silent);
    $('log').scrollTop = $('log').scrollHeight;
  }

  function showResult() {
    const r = game.battle.state.result;
    // はみ出した分（負の割合）は、同時KOの判定に使うときだけ見せる
    const pct = (x) => `${((r.reason === 'simultaneous' ? x : Math.max(0, x)) * 100).toFixed(1)}%`;
    const title = r.winner === 'draw'
      ? '引き分け'
      : `勝者: ${escapeHtml(game.teams[r.winner].name)}（${r.winner.toUpperCase()}）`;
    // ランダムマッチは自分（A）から見た結果を大きく出す
    const verdict = game.mode !== 'random' && game.mode !== 'story' ? ''
      : r.winner === 'a' ? '<div class="verdict verdict--win">WIN</div>'
        : r.winner === 'b' ? '<div class="verdict verdict--lose">LOSE</div>'
          : '<div class="verdict">DRAW</div>';
    $('result').innerHTML = `${verdict}<strong>${title}</strong><br>${REASONS[r.reason]} ／ ${r.time}秒 ／ `
      + `HP割合 A ${pct(r.ratio.a)} : B ${pct(r.ratio.b)} ／ 与ダメージ A ${Math.round(r.dealt.a)} : B ${Math.round(r.dealt.b)} ／ シード ${r.seed}`;
    $('result').hidden = false;
    $('battle-stats').innerHTML = battleStatsHtml(r, game.teams, game.catalog);
    $('battle-stats').hidden = !r.stats;
  }

  function updateRecord() {
    $('record').textContent = record.total ? `戦績 ${record.win}勝 ${record.loss}敗 ${record.draw}分` : '';
  }

  function finish() {
    stop();
    showResult();
    if (game.mode === 'story' && !game.recorded) {
      game.recorded = true;
      storyMatch.onFinish(game.battle.state.result);
      const retry = game.battle.state.result.winner !== 'a' && (storyMatch.canRetry?.() ?? true);
      $('result').insertAdjacentHTML('beforeend', `<div class="buttons story-after"><button type="button" class="primary" data-story-back>${escapeHtml(storyMatch.backLabel ?? '📜 ストーリーに戻る')}</button>`
        + (retry ? '<button type="button" data-story-retry>もう一度戦う</button>' : '') + '</div>');
    }
    if (game.mode === 'random' && !game.recorded) {
      game.recorded = true;
      record.add(game.battle.state.result.winner);
      updateRecord();
    }
    setButtons();
  }

  // ---- ランダムマッチ ----
  // 相手になるのはゲーム側のプリセットだけ（保存したチームは出ない）
  const randomPool = () => entries.filter((e) => e.id.startsWith('preset:'));

  function drawOpponent() {
    // 自分と同じチームは避ける（同じチーム同士は毎回引き分けになる）。ほかに候補がなければ許す
    const others = randomPool().filter((e) => e.id !== $('team-a').value);
    const next = pickOpponent(others, $('tier').value, Math.random, opponent?.id)
      ?? pickOpponent(randomPool(), $('tier').value, Math.random, opponent?.id);
    if (!next) return;
    opponent = next;
    $('team-b').value = next.id;
    prepare();
  }

  function setMode(next) {
    mode = next;
    $('view-battle').dataset.mode = next;
    $('team-b').disabled = next === 'random';
    if (next === 'story') {
      $('story-bar-title').textContent = `${storyMatch.icon ?? '📜'} ${storyMatch.title}`;
      $('story-back').textContent = storyMatch.backLabel ?? '📜 ストーリーに戻る';
      prepare();
      return;
    }
    storyMatch = null;
    if (next === 'random') drawOpponent();
    else prepare();
  }

  function tick(now) {
    game.raf = requestAnimationFrame(tick);
    if (game.paused) {
      game.last = now;
      return;
    }
    game.acc += Math.min(MAX_FRAME_SECONDS, (now - game.last) / 1000) * speed();
    game.last = now;
    let steps = Math.floor(game.acc / DT + 1e-9);
    game.acc -= steps * DT;
    while (steps-- > 0 && !game.battle.state.done) game.battle.advance();
    flushEvents(false);
    refresh();
    if (game.battle.state.done) finish();
  }

  function play() {
    game.running = true;
    game.paused = false;
    game.last = performance.now();
    game.raf = requestAnimationFrame(tick);
    setButtons();
  }

  $('start').addEventListener('click', () => {
    // ランダムマッチは、戦うたびに新しいシード（同じ相手でも毎回違う展開になる）
    if (mode === 'random' || mode === 'story') $('seed').value = String(Math.floor(Math.random() * 1e6));
    if (!prepare()) return;
    if (mode === 'story') storyMatch.onStart?.(seed());
    play();
  });
  for (const radio of document.querySelectorAll('input[name="mode"]')) {
    radio.addEventListener('change', () => radio.checked && setMode(radio.value));
  }
  $('opponent-draw').addEventListener('click', drawOpponent);
  $('team-a').addEventListener('change', () => {
    if (mode === 'random' && opponent && $('team-a').value === opponent.id) drawOpponent(); // 自分と同じチームが相手にならないように
  });
  $('tier').addEventListener('change', drawOpponent);
  // その環境のプリセットにない強さ（Ver.2 の「やさしい」など）は選べないようにする
  for (const opt of $('tier').options) {
    if (opt.value !== 'any') opt.hidden = !PRESET_TEAMS.some((t) => t.tier === opt.value);
  }
  $('pause').addEventListener('click', () => {
    game.paused = !game.paused;
    setButtons();
  });
  $('skip').addEventListener('click', () => {
    while (!game.battle.state.done) game.battle.advance();
    flushEvents(true);
    refresh();
    finish();
  });
  $('speed').addEventListener('change', () => game && applySpeed());
  $('seed-random').addEventListener('click', () => {
    $('seed').value = String(Math.floor(Math.random() * 1e6));
    prepare();
  });
  for (const id of ['team-a', 'team-b', 'seed']) $(id).addEventListener('change', prepare);
  // ストーリーモード：戻る（再生中なら止める）・もう一度
  const storyBack = () => {
    stop();
    setButtons();
    storyMatch?.onBack();
  };
  $('story-back').addEventListener('click', storyBack);
  $('result').addEventListener('click', (ev) => {
    if (ev.target.closest('[data-story-back]')) storyBack();
    else if (ev.target.closest('[data-story-retry]')) $('start').click();
  });

  prepare();

  return {
    record,
    isRunning: () => !!game?.running && !game.battle.state.done,
    // ストーリーの対戦を用意する（このあと対戦タブを開く）
    playStory(match) {
      stop();
      storyMatch = match;
      setMode('story');
    },
    // ホームから、モードを決めて対戦タブを開く。再生中は切り替えない。
    // モードを指定せずに開いたときは、ストーリーの対戦をやめてカスタム対戦に戻る
    openMode(next) {
      if (game?.running && !game.battle.state.done) return;
      if (!next && mode === 'story') next = 'custom';
      if (!next || next === mode || next === 'story') return;
      for (const radio of document.querySelectorAll('input[name="mode"]')) radio.checked = radio.value === next;
      setMode(next);
    },
    // 「チーム編成」で保存したチームを選択肢に反映する。再生中は触らない。
    refreshTeams() {
      if (game?.running && !game.battle.state.done) return;
      entries = getTeams();
      fillSelects();
      if (mode === 'story') return; // ストーリーの対戦は、選択肢と関係なく決まっている
      const same = game && SIDES.every((k) => JSON.stringify(game.teams[k]) === JSON.stringify(entryOf(k).team));
      if (!same) prepare();
    },
  };
}
