import { BOARDS } from '../data/boards.js';
import { PRESET_TEAMS } from '../data/presetTeams.js';
import { defaultStorage, memoryStorage } from './local.js';
import { normalizeTeam, sanitizeTeam } from './teamJson.js';

export const SLOT_COUNT = 9;
const KEY = 'auto-battler.teams.v1';

export { memoryStorage };

// 保存スロットが SLOT_COUNT 個あるチーム保存庫。壊れたデータは空きスロットとして扱う。
export function createTeamStore(storage = defaultStorage(KEY)) {
  const read = () => {
    let raw = [];
    try {
      const parsed = JSON.parse(storage.getItem(KEY) ?? '[]');
      if (Array.isArray(parsed)) raw = parsed;
    } catch {
      // 壊れた保存データは無視する
    }
    return Array.from({ length: SLOT_COUNT }, (_, i) => sanitizeTeam(raw[i]).team);
  };
  const write = (slots) => {
    try {
      storage.setItem(KEY, JSON.stringify(slots));
      return true;
    } catch {
      return false; // 容量超過など
    }
  };
  const validIndex = (i) => Number.isInteger(i) && i >= 0 && i < SLOT_COUNT;

  return {
    load: read,
    // 保存できたら true
    save(index, team) {
      if (!validIndex(index)) return false;
      const slots = read();
      slots[index] = normalizeTeam(team);
      return write(slots);
    },
    remove(index) {
      if (!validIndex(index)) return false;
      const slots = read();
      slots[index] = null;
      return write(slots);
    },
  };
}

// 対戦で選べるチーム一覧（プリセット + 保存スロット）。
export function listBattleTeams(store) {
  const presets = PRESET_TEAMS.map((team) => ({
    id: `preset:${team.id}`,
    label: `[プリセット] ${team.name}（${BOARDS[team.board].name}）`,
    team,
  }));
  const saved = store.load().flatMap((team, i) => (team
    ? [{ id: `slot:${i}`, label: `スロット${i + 1}: ${team.name}（${BOARDS[team.board].name}）`, team }]
    : []));
  return [...presets, ...saved];
}
