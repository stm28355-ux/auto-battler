import { createPieceStore } from './storage/pieceStore.js';
import { createTeamStore, listBattleTeams } from './storage/teamStore.js';
import { initBattleScreen } from './ui/battleScreen.js';
import { initDataView } from './ui/dataView.js';
import { initHome } from './ui/home.js';
import { initPieceEditor } from './ui/pieceEditor.js';
import { initTeamEditor } from './ui/teamEditor.js';

const store = createTeamStore();
const pieceStore = createPieceStore();
const battleTeams = () => listBattleTeams(store);

const battle = initBattleScreen({ getTeams: battleTeams });
const teamEditor = initTeamEditor({ store, pieceStore });
const pieceEditor = initPieceEditor({ store: pieceStore });
initDataView();
const home = initHome({
  getTeams: battleTeams,
  getStats: () => ({
    teams: store.load().filter(Boolean).length,
    pieces: pieceStore.load().length,
    record: battle.record,
  }),
  go: (view, mode) => go(view, mode),
});

const TITLES = { home: '', battle: '対戦', team: 'チーム編成', piece: '駒作成', data: '図鑑' };
const tabs = [...document.querySelectorAll('.tab')];
const onShow = {
  home: () => home.refresh(), // 保存したチーム・戦績を反映
  battle: () => battle.refreshTeams(), // 編成で保存したチームを反映
  team: () => teamEditor.refresh(), // 駒作成で作った駒を反映
  piece: () => pieceEditor.refresh(),
};

function showView(name) {
  const view = Object.hasOwn(TITLES, name) ? name : 'home';
  for (const tab of tabs) tab.setAttribute('aria-selected', String(tab.dataset.view === view));
  for (const id of Object.keys(TITLES)) document.getElementById(`view-${id}`).hidden = id !== view;
  document.getElementById('view-title').textContent = TITLES[view];
  document.body.dataset.view = view;
  onShow[view]?.();
  return view;
}

function go(name, mode) {
  const view = showView(name);
  if (view === 'battle') battle.openMode(mode);
  history.replaceState(null, '', `#${view}`);
  window.scrollTo(0, 0);
}

for (const tab of tabs) tab.addEventListener('click', () => go(tab.dataset.view));
for (const link of document.querySelectorAll('[data-view-link]')) link.addEventListener('click', () => go(link.dataset.viewLink));
showView(location.hash.slice(1));
