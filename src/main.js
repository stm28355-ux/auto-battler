import { createPieceStore } from './storage/pieceStore.js';
import { createTeamStore, listBattleTeams } from './storage/teamStore.js';
import { initBattleScreen } from './ui/battleScreen.js';
import { initDataView } from './ui/dataView.js';
import { initPieceEditor } from './ui/pieceEditor.js';
import { initTeamEditor } from './ui/teamEditor.js';

const store = createTeamStore();
const pieceStore = createPieceStore();

const battle = initBattleScreen({ getTeams: () => listBattleTeams(store) });
const teamEditor = initTeamEditor({ store, pieceStore });
const pieceEditor = initPieceEditor({ store: pieceStore });
initDataView();

const tabs = [...document.querySelectorAll('.tab')];
const onShow = {
  battle: () => battle.refreshTeams(), // 編成で保存したチームを反映
  team: () => teamEditor.refresh(), // 駒作成で作った駒を反映
  piece: () => pieceEditor.refresh(),
};

function showView(name) {
  const view = tabs.some((t) => t.dataset.view === name) ? name : 'battle';
  for (const tab of tabs) {
    const active = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(active));
    document.getElementById(`view-${tab.dataset.view}`).hidden = !active;
  }
  onShow[view]?.();
}

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    showView(tab.dataset.view);
    history.replaceState(null, '', `#${tab.dataset.view}`);
  });
}
showView(location.hash.slice(1));
