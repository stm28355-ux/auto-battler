import { BOARDS } from '../data/boards.js';
import { CHARACTERS, ITEMS } from '../data/pieces.js';
import { RELICS } from '../data/relics.js';
import { createCatalog } from '../core/catalog.js';
import { teamCost, validateTeam } from '../core/team.js';
import { createStoryStore, rewardDiff, storyCap, storyRules, storyStatus, STORY_SLOT_KEY } from '../story/progress.js';
import { renderBoard } from './boardView.js';
import { $, escapeHtml, tribeTag } from './format.js';

// 「ストーリー」：イベントの一覧 → 会話 → 対戦前 → 対戦（対戦タブ）→ 会話 → 報酬、の流れ（spec §14）。
//   go(view, mode): 画面を切り替える（'team' + 'story' でストーリー用の編成、'battle' + 'story' で対戦）
//   battle: 対戦タブ（playStory を使う）
//   teamStore: ストーリー用の編成（通常の保存チームとは別）
//   storage: 進行状況の保存先
//   env / latest: いまの環境と最新の環境。ストーリーは最新の環境でだけ遊ぶ
//   switchToLatest(): 最新の環境に切り替えて、ストーリーを開き直す
export function initStory({ go, battle, teamStore, storage, env, latest, switchToLatest }) {
  let mod = null; // シナリオ（開いたときに読み込む）
  let store = null;
  let resume = null; // 編成・対戦から戻ったときに表示する画面
  const root = () => $('story-root');
  // 対戦前に選んでおくスロット。最後に選んだ・編成で保存したスロットを覚える
  const preferredSlot = () => {
    try {
      return Number(storage.getItem(STORY_SLOT_KEY)) || 0;
    } catch {
      return 0;
    }
  };
  const rememberSlot = (i) => {
    try {
      storage.setItem(STORY_SLOT_KEY, String(i));
    } catch {
      // 覚えられなくても、選び直せば遊べる
    }
  };
  const cleared = () => store.load().cleared;
  const status = () => storyStatus(mod.STORY, cleared());
  const pieceName = (id) => {
    const p = [...CHARACTERS, ...ITEMS].find((x) => x.id === id);
    return p ? `${p.icon} ${p.name}` : id;
  };
  const relicName = (id) => {
    const r = RELICS.find((x) => x.id === id);
    return r ? `${r.icon} ${r.name}` : id;
  };

  async function load() {
    if (mod) return;
    mod = await import('../story/script.js');
    store = createStoryStore(storage, mod.STORY);
  }

  // ---- 一覧 ----
  function renderList() {
    resume = null;
    const st = status();
    const mains = st.events.filter((e) => e.kind !== 'side');
    const sides = st.events.filter((e) => e.kind === 'side');
    const allMains = mod.STORY.events.filter((e) => e.kind !== 'side');
    const doneMains = allMains.filter((e) => cleared().includes(e.id)).length;
    const card = (e) => {
      const b = e.battle ? mod.BATTLERS[e.battle.opponent] : null;
      const badge = e.cleared ? '<span class="story-badge story-badge--done">クリア済み</span>' : '<span class="story-badge story-badge--new">NEW</span>';
      const foe = b ? `<span class="muted">vs ${escapeHtml(b.icon)} ${escapeHtml(b.name)}（${escapeHtml(b.title)}）${tribeTag(b.tribe)} 強さ：${mod.STRENGTH[b.strength]}</span>` : '<span class="muted">会話のみ</span>';
      const chapter = e.chapter ? `<span class="muted">第${e.chapter}章</span> ` : '';
      return `<button type="button" class="story-card${e.cleared ? ' story-card--done' : ''}" data-event="${escapeHtml(e.id)}">`
        + `<span class="story-card-head">${chapter}<strong>${escapeHtml(e.title)}</strong>${badge}</span>`
        + `<span>${escapeHtml(e.summary ?? '')}</span>${foe}</button>`;
    };
    const rematch = st.finished
      ? `<h3>再戦（クリア後）</h3><p class="muted">強化された学園のバトラーたちと戦えます。</p><div class="story-cards">${
        Object.entries(mod.BATTLERS).filter(([, b]) => !b.noRematch).map(([id, b]) => `<button type="button" class="story-card" data-rematch="${escapeHtml(id)}">`
          + `<span class="story-card-head"><strong>${escapeHtml(b.icon)} ${escapeHtml(b.name)}</strong><span class="muted">${escapeHtml(b.title)}</span></span>`
          + `<span class="muted">${escapeHtml((b.rematch ?? b.team).name)} ${tribeTag(b.tribe)}</span></button>`).join('')}</div>`
      : '';
    const pieceTotal = CHARACTERS.length + ITEMS.length;
    root().innerHTML = `
      <section class="panel story-head">
        <div>
          <h2>バトラー養成学校</h2>
          <div class="story-progress"><progress max="${allMains.length}" value="${doneMains}"></progress> <span class="muted">メイン ${doneMains} / ${allMains.length}</span></div>
        </div>
        <div class="story-stats">
          <div><span class="muted">使えるコスト</span><strong>${Math.round(st.costRatio * 100)}%</strong><small class="muted">${Object.values(BOARDS).map((b) => `${b.name} ${storyCap(b.id, st.costRatio)}`).join('・')}</small></div>
          <div><span class="muted">駒</span><strong>${st.pieces.size} / ${pieceTotal}</strong></div>
          <div><span class="muted">遺物</span><strong>${st.relics.size} / ${RELICS.length}</strong></div>
        </div>
        <div class="buttons buttons--wrap">
          <button type="button" class="primary" data-story-team>🧩 ストーリー用の編成</button>
          <button type="button" data-story-reset>最初からやり直す</button>
        </div>
      </section>
      <h3>メイン</h3>
      <div class="story-cards">${mains.map(card).join('')}</div>
      ${st.finished ? '' : '<p class="muted">メインのイベントをクリアすると、次のイベントと、使えるコストが増えます。</p>'}
      ${sides.length ? `<h3>サイドイベント</h3><p class="muted">勝つと新しい駒・遺物が手に入ります。</p><div class="story-cards">${sides.map(card).join('')}</div>` : ''}
      ${rematch}`;
  }

  // ---- 会話 ----
  function playScene(lines, done, { title = '' } = {}) {
    if (!lines?.length) {
      done();
      return;
    }
    let i = 0;
    const speaker = (key) => (key ? mod.CAST[key] : null);
    const draw = () => {
      const [key, text] = lines[i];
      const who = speaker(key);
      const past = lines.slice(0, i).map(([k, t]) => `<li><strong>${escapeHtml(speaker(k)?.name ?? '')}</strong> ${escapeHtml(t)}</li>`).join('');
      root().innerHTML = `
        <section class="story-scene">
          ${title ? `<h2 class="story-scene-title">${escapeHtml(title)}</h2>` : ''}
          ${past ? `<details class="story-log"><summary>これまでの会話</summary><ol>${past}</ol></details>` : ''}
          <button type="button" class="story-box${who ? '' : ' story-box--narration'}" data-next aria-label="次へ">
            ${who ? `<span class="story-speaker"><span class="story-face">${escapeHtml(who.icon)}</span>${escapeHtml(who.name)}${who.note ? `<small class="muted">（${escapeHtml(who.note)}）</small>` : ''}</span>` : ''}
            <span class="story-text">${escapeHtml(text)}</span>
            <span class="story-more muted">${i + 1} / ${lines.length}　▼ クリックで次へ</span>
          </button>
          <div class="buttons"><button type="button" data-skip>スキップ</button></div>
        </section>`;
      root().querySelector('[data-next]').focus();
    };
    const next = () => {
      i += 1;
      if (i >= lines.length) finish();
      else draw();
    };
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      root().removeEventListener('click', onClick);
      done();
    };
    const onClick = (ev) => {
      if (ev.target.closest('[data-skip]')) finish();
      else if (ev.target.closest('[data-next]')) next();
    };
    root().addEventListener('click', onClick);
    draw();
  }

  // ---- 対戦前 ----
  // event: 対戦するイベント（クリア後の再戦なら null）。battlerId: 相手
  function renderPrebattle(event, battlerId) {
    resume = () => renderPrebattle(event, battlerId);
    const b = mod.BATTLERS[battlerId];
    const foe = event ? b.team : (b.rematch ?? b.team);
    const st = status();
    const rules = storyRules(st);
    const catalog = createCatalog();
    const teams = teamStore.load();
    const options = teams.map((t, i) => {
      if (!t) return `<option value="${i}" disabled>スロット${i + 1}（空き）</option>`;
      const errors = validateTeam(t, catalog, rules);
      return `<option value="${i}"${errors.length ? ' disabled' : ''}>スロット${i + 1}: ${escapeHtml(t.name)}（${BOARDS[t.board].name}・コスト${teamCost(t, catalog)}）${errors.length ? ' ×条件外' : ''}</option>`;
    }).join('');
    const usable = teams.map((t, i) => (t && !validateTeam(t, catalog, rules).length ? i : -1)).filter((i) => i >= 0);
    root().innerHTML = `
      <section class="panel story-pre">
        <h2>${event ? escapeHtml(event.title) : '再戦'}</h2>
        <div class="story-foe">
          <div>
            <p class="story-foe-name"><span class="story-face">${escapeHtml(b.icon)}</span><strong>${escapeHtml(b.name)}</strong> <span class="muted">${escapeHtml(b.title)}</span></p>
            <p>${escapeHtml(foe.name)}　${tribeTag(b.tribe)}　強さ：${mod.STRENGTH[event ? b.strength : 'strong']}</p>
            <p class="muted">${BOARDS[foe.board].name} ／ コスト ${teamCost(foe, catalog)}</p>
          </div>
          <div id="story-foe-board" class="board-wrap story-foe-board"></div>
        </div>
        <h3>あなたのチーム</h3>
        <p class="muted">使えるコスト ${Math.round(st.costRatio * 100)}%（${Object.values(BOARDS).map((bd) => `${bd.name} ${storyCap(bd.id, st.costRatio)}`).join('・')}）。ストーリーで手に入れた駒・遺物だけが使えます。</p>
        ${usable.length ? `<label>チーム <select id="story-team">${options}</select></label>` : '<p class="message message--error">条件に合うチームがありません。「編成する」でストーリー用のチームを作ってください。</p>'}
        <div class="buttons buttons--wrap">
          <button type="button" class="primary" data-fight${usable.length ? '' : ' disabled'}>⚔️ 対戦開始</button>
          <button type="button" data-story-team>🧩 編成する</button>
          <button type="button" data-back>戻る</button>
        </div>
      </section>`;
    $('story-foe-board').replaceChildren(renderBoard(BOARDS[foe.board], { team: foe, catalog }));
    if (usable.length) {
      $('story-team').value = String(usable.includes(preferredSlot()) ? preferredSlot() : usable[0]);
      $('story-team').addEventListener('change', () => rememberSlot(Number($('story-team').value)));
    }

    root().querySelector('[data-fight]').addEventListener('click', () => {
      const mine = teams[Number($('story-team').value)];
      let result = null;
      battle.playStory({
        teams: { a: mine, b: foe },
        rules,
        title: `${event ? event.title : '再戦'}：vs ${b.name}`,
        onFinish: (r) => {
          result = r;
        },
        // ストーリーのタブを開いたときに（show から）続きを出す
        onBack: () => {
          resume = () => afterBattle(event, battlerId, result);
          go('story');
        },
      });
      go('battle', 'story');
    });
    root().querySelector('[data-back]').addEventListener('click', renderList);
  }

  // 対戦タブから戻ったとき：勝てば会話と報酬、負ければ会話のあと対戦前に戻る
  function afterBattle(event, battlerId, result) {
    resume = null;
    if (!result) {
      renderPrebattle(event, battlerId);
      return;
    }
    const won = result.winner === 'a';
    if (!event) {
      renderPrebattle(null, battlerId);
      return;
    }
    if (!won) {
      playScene(event.lose, () => renderPrebattle(event, battlerId));
      return;
    }
    const before = status();
    const first = store.clear(event.id);
    playScene(event.win, () => (first ? renderReward(rewardDiff(before, status())) : renderList()));
  }

  // ---- 報酬 ----
  function renderReward(diff) {
    const items = [
      diff.costRatio ? `<li>使えるコストが <strong>${Math.round(diff.costRatio * 100)}%</strong> になった</li>` : '',
      ...diff.pieces.map((id) => `<li>駒「${escapeHtml(pieceName(id))}」を手に入れた</li>`),
      ...diff.relics.map((id) => `<li>遺物「${escapeHtml(relicName(id))}」を手に入れた</li>`),
      diff.finished ? '<li>クリア！ すべての駒・遺物とコスト100%で遊べるようになり、再戦ができるようになった</li>' : '',
    ].filter(Boolean);
    if (!items.length) {
      renderList();
      return;
    }
    root().innerHTML = `<section class="panel story-reward"><h2>🎁 手に入れたもの</h2><ul>${items.join('')}</ul>`
      + '<div class="buttons"><button type="button" class="primary" data-continue>続ける</button></div></section>';
    root().querySelector('[data-continue]').addEventListener('click', renderList);
  }

  function openEvent(id) {
    const event = status().events.find((e) => e.id === id);
    if (!event) return;
    playScene(event.before, () => {
      if (event.battle) {
        renderPrebattle(event, event.battle.opponent);
        return;
      }
      // 会話だけのイベント
      const before = status();
      const first = store.clear(event.id);
      if (first) renderReward(rewardDiff(before, status()));
      else renderList();
    }, { title: event.title });
  }

  // 一覧・対戦前のボタン（画面を描き直しても効くように、外側で受ける）
  $('story-root').addEventListener('click', (ev) => {
    if (!mod) return;
    const t = ev.target;
    const event = t.closest('[data-event]');
    if (event) openEvent(event.dataset.event);
    else if (t.closest('[data-rematch]')) renderPrebattle(null, t.closest('[data-rematch]').dataset.rematch);
    else if (t.closest('[data-story-team]')) go('team', 'story');
    else if (t.closest('[data-story-reset]')) {
      if (window.confirm('ストーリーを最初からやり直しますか？\n（クリアの記録・手に入れた駒が消えます。ストーリー用の編成は残ります）')) {
        store.reset();
        renderList();
      }
    } else if (t.closest('[data-switch-env]')) switchToLatest();
  });

  return {
    // ストーリーのタブを開いたとき
    async show() {
      if (env.id !== latest.id) {
        root().innerHTML = `<section class="panel"><h2>📜 ストーリー</h2><p>ストーリーは最新の環境（${escapeHtml(latest.name)}）で遊びます。いまは${escapeHtml(env.name)}を選んでいます。</p>`
          + `<div class="buttons"><button type="button" class="primary" data-switch-env>${escapeHtml(latest.name)}に切り替えて始める</button></div></section>`;
        return;
      }
      await load();
      if (resume) resume();
      else renderList();
    },
    // ストーリー用の編成（チーム編成タブの setContext に渡す）
    editorContext() {
      if (!mod || env.id !== latest.id) return null;
      return {
        label: 'ストーリー用の編成',
        store: teamStore,
        rules: () => storyRules(status()),
        onBack: () => go('story'),
        onSaved: rememberSlot,
      };
    },
  };
}
