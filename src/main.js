import { createTeamStore, listBattleTeams } from './storage/teamStore.js';
import { initBattleScreen } from './ui/battleScreen.js';
import { initDataView } from './ui/dataView.js';
import { initTeamEditor } from './ui/teamEditor.js';

const store = createTeamStore();

const battle = initBattleScreen({ getTeams: () => listBattleTeams(store) });
initTeamEditor({ store });
initDataView();

const tabs = [...document.querySelectorAll('.tab')];

function showView(name) {
  const view = tabs.some((t) => t.dataset.view === name) ? name : 'battle';
  for (const tab of tabs) {
    const active = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(active));
    document.getElementById(`view-${tab.dataset.view}`).hidden = !active;
  }
  if (view === 'battle') battle.refreshTeams(); // 編成で保存したチームを反映
}

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    showView(tab.dataset.view);
    history.replaceState(null, '', `#${tab.dataset.view}`);
  });
}
showView(location.hash.slice(1));
