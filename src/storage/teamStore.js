import { BOARDS } from '../data/boards.js';
import { activeEnvironment } from '../data/environment.js';
import { PRESET_TEAMS, TIERS } from '../data/presetTeams.js';
import { defaultStorage, memoryStorage } from './local.js';
import { normalizeTeam, sanitizeTeam } from './teamJson.js';

export const SLOT_COUNT = 9;
const LEGACY_KEY = 'auto-battler.teams.v1'; // 環境を分ける前からの保存先。Ver.1 の環境で使う

// 保存チームは環境（バージョン）ごとに別の場所に置く。
export const teamKey = (envId) => (envId === 'v1' ? LEGACY_KEY : `auto-battler.teams.v1@${envId}`);

export { memoryStorage };

// 保存スロットが SLOT_COUNT 個あるチーム保存庫。壊れたデータは空きスロットとして扱う。
// key・slots を渡すと、別の保存先・スロット数にできる（ストーリー用の編成）
export function createTeamStore(storage = defaultStorage(LEGACY_KEY), envId = activeEnvironment().id, { key, slots = SLOT_COUNT } = {}) {
  const KEY = key ?? teamKey(envId);
  const SLOTS = slots;
  const read = () => {
    let raw = [];
    try {
      const parsed = JSON.parse(storage.getItem(KEY) ?? '[]');
      if (Array.isArray(parsed)) raw = parsed;
    } catch {
      // 壊れた保存データは無視する
    }
    return Array.from({ length: SLOTS }, (_, i) => sanitizeTeam(raw[i]).team);
  };
  const write = (slots) => {
    try {
      storage.setItem(KEY, JSON.stringify(slots));
      return true;
    } catch {
      return false; // 容量超過など
    }
  };
  const validIndex = (i) => Number.isInteger(i) && i >= 0 && i < SLOTS;

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

// 初めてその環境を開いたとき（保存先がまだ一度も作られていないとき）だけ、前の環境の保存チームをコピーする。
// 一度でも保存先ができたら（あとで全部消して空にしても）、二度とコピーしない。コピーしたチームの数を返す。
export function copyTeamsOnce(storage, fromEnvId, toEnvId) {
  const to = teamKey(toEnvId);
  if (!fromEnvId || fromEnvId === toEnvId || storage.getItem(to) !== null) return 0;
  const teams = createTeamStore(storage, fromEnvId).load();
  try {
    storage.setItem(to, JSON.stringify(teams));
  } catch {
    return 0;
  }
  return teams.filter(Boolean).length;
}

// 対戦で選べるチーム一覧（プリセット + 保存スロット）。
export function listBattleTeams(store) {
  const presets = PRESET_TEAMS.map((team) => ({
    id: `preset:${team.id}`,
    label: `[プリセット・${TIERS[team.tier].name}] ${team.name}（${BOARDS[team.board].name}）`,
    team,
  }));
  const saved = store.load().flatMap((team, i) => (team
    ? [{ id: `slot:${i}`, label: `スロット${i + 1}: ${team.name}（${BOARDS[team.board].name}）`, team }]
    : []));
  return [...presets, ...saved];
}
