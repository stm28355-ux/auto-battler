import { ENVIRONMENTS, MODE_ENV, applyEnvironment } from './data/environment.js';
import { STORY_KEY, STORY_SLOTS, STORY_TEAMS_KEY } from './story/progress.js';
import { ROGUE_META_KEY } from './rogue/config.js';
import { defaultStorage } from './storage/local.js';
import { createPieceStore, pieceKey } from './storage/pieceStore.js';
import { copyTeamsOnce, createTeamStore, listBattleTeams, teamKey } from './storage/teamStore.js';
import { initBattleScreen } from './ui/battleScreen.js';
import { initDataView } from './ui/dataView.js';
import { initHome } from './ui/home.js';
import { initPieceEditor } from './ui/pieceEditor.js';
import { initRogue } from './ui/rogue.js';
import { initRules } from './ui/rules.js';
import { initStory } from './ui/story.js';
import { initTeamEditor } from './ui/teamEditor.js';

// 対戦環境（バージョン）。データを使う前に切り替える。選んだ環境はブラウザに覚えておく
const ENV_KEY = 'auto-battler.env';
const envStorage = defaultStorage(ENV_KEY);
const env = applyEnvironment(envStorage.getItem(ENV_KEY));

// 初めて開いた環境には、1つ前の環境の保存チームをコピーしておく（前の環境で作ったチームをすぐ使えるように）
const teamStorage = defaultStorage(teamKey(env.id));
const previous = ENVIRONMENTS[ENVIRONMENTS.indexOf(env) - 1];
const copied = copyTeamsOnce(teamStorage, previous?.id, env.id);

const store = createTeamStore(teamStorage);
// 自作駒も環境ごと（Ver.1・Ver.2 は共通、Ver.3 からは別。src/storage/pieceStore.js）
const pieceStore = createPieceStore(defaultStorage(pieceKey(env.id)), pieceKey(env.id));
const battleTeams = () => listBattleTeams(store);

const battle = initBattleScreen({ getTeams: battleTeams });
const teamEditor = initTeamEditor({ store, pieceStore });
const pieceEditor = initPieceEditor({ store: pieceStore });
initDataView();
// ストーリー・ローグライトは決まった環境（MODE_ENV）で遊ぶ。その環境に切り替えて、そのモードを開き直す
const switchToLatest = (hash) => () => {
  if (teamEditor.isDirty() && !window.confirm('編集中の内容は失われます。よろしいですか？')) return;
  envStorage.setItem(ENV_KEY, MODE_ENV.id);
  location.hash = hash;
  location.reload();
};
// ストーリーモード。編成は通常の保存チームとは別（spec §14）
const storyTeams = createTeamStore(defaultStorage(STORY_TEAMS_KEY), env.id, { key: STORY_TEAMS_KEY, slots: STORY_SLOTS });
const story = initStory({
  go: (view, mode) => go(view, mode),
  battle,
  teamStore: storyTeams,
  storage: defaultStorage(STORY_KEY),
  env,
  latest: MODE_ENV,
  switchToLatest: switchToLatest('#story'),
});
// ローグライト。編成は挑戦ごと（spec §15）
const rogue = initRogue({
  go: (view, mode) => go(view, mode),
  battle,
  storage: defaultStorage(ROGUE_META_KEY),
  env,
  latest: MODE_ENV,
  switchToLatest: switchToLatest('#rogue'),
});
initRules({ go: (view) => go(view) });
const home = initHome({
  getTeams: battleTeams,
  env,
  notice: copied ? `${previous.name}の保存チーム${copied}個を、${env.name}にコピーしました（${previous.name}のチームはそのまま残っています）` : '',
  getStats: () => ({
    teams: store.load().filter(Boolean).length,
    pieces: pieceStore.load().length,
    record: battle.record,
  }),
  go: (view, mode) => go(view, mode),
});

const TITLES = { home: '', story: 'ストーリー', rogue: 'ローグライト', battle: '対戦', team: 'チーム編成', piece: '駒作成', data: '図鑑', rules: 'ルール' };
const tabs = [...document.querySelectorAll('.tab')];
const onShow = {
  home: () => home.refresh(), // 保存したチーム・戦績を反映
  battle: () => battle.refreshTeams(), // 編成で保存したチームを反映
  team: () => teamEditor.refresh(), // 駒作成で作った駒を反映
  piece: () => pieceEditor.refresh(),
  story: () => story.show(),
  rogue: () => rogue.show(),
};

function showView(name, mode) {
  const view = Object.hasOwn(TITLES, name) ? name : 'home';
  // チーム編成は、ストーリー・ローグライトから開いたときだけその編成にする（未保存の変更を残すと決めたら開かない）
  const context = mode === 'story' ? story.editorContext() : mode === 'rogue' ? rogue.editorContext() : null;
  if (view === 'team' && !teamEditor.setContext(context)) return null;
  for (const tab of tabs) tab.setAttribute('aria-selected', String(tab.dataset.view === view));
  for (const id of Object.keys(TITLES)) document.getElementById(`view-${id}`).hidden = id !== view;
  document.getElementById('view-title').textContent = TITLES[view];
  document.body.dataset.view = view;
  onShow[view]?.();
  return view;
}

function go(name, mode) {
  const view = showView(name, mode);
  if (!view) return;
  if (view === 'battle') battle.openMode(mode);
  history.replaceState(null, '', `#${view}`);
  window.scrollTo(0, 0);
}

for (const tab of tabs) tab.addEventListener('click', () => go(tab.dataset.view));
for (const link of document.querySelectorAll('[data-view-link]')) link.addEventListener('click', () => go(link.dataset.viewLink));
// 環境の切り替え：描画済みの画面を作り直すため、ページを読み込み直す
const envSelect = document.getElementById('env-select');
envSelect.innerHTML = ENVIRONMENTS.slice().reverse()
  .map((e) => `<option value="${e.id}"${e.id === env.id ? ' selected' : ''}>${e.name}（${e.status}）</option>`).join('');
envSelect.addEventListener('change', () => {
  const next = ENVIRONMENTS.find((e) => e.id === envSelect.value);
  const unsaved = teamEditor.isDirty() || pieceEditor.isDirty() || battle.isRunning();
  const ask = `環境を${next.name}に切り替えます。${unsaved ? '\n編集中・対戦中の内容は失われます。' : ''}\n保存したチームは環境ごとに別です。よろしいですか？`;
  if (!window.confirm(ask)) {
    envSelect.value = env.id;
    return;
  }
  envStorage.setItem(ENV_KEY, next.id);
  location.reload();
});

showView(location.hash.slice(1));
