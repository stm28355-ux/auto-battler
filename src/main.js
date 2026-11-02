import { initBattleScreen } from './ui/battleScreen.js';
import { initDataView } from './ui/dataView.js';

initBattleScreen();
initDataView();

const tabs = [...document.querySelectorAll('.tab')];

function showView(name) {
  const view = tabs.some((t) => t.dataset.view === name) ? name : 'battle';
  for (const tab of tabs) {
    const active = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(active));
    document.getElementById(`view-${tab.dataset.view}`).hidden = !active;
  }
}

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    showView(tab.dataset.view);
    history.replaceState(null, '', `#${tab.dataset.view}`);
  });
}
showView(location.hash.slice(1));
