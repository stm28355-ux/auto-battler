import { BOARDS } from '../data/boards.js';
import { CHARACTERS, ITEMS } from '../data/pieces.js';
import { RELICS } from '../data/relics.js';

// ストーリーモードの進行（spec §14）。シナリオ（src/story/script.js）は、ここではデータとして受け取るだけ。
//
// 保存するのは「クリアしたイベントのID」だけ。使えるコスト・駒・遺物は、シナリオの報酬から毎回計算する。
// こうしておくと、シナリオの報酬を直したときも、保存データを直さずに済む。

export const STORY_KEY = 'auto-battler.story.v1';
export const STORY_TEAMS_KEY = 'auto-battler.story.teams.v1';
export const STORY_SLOTS = 3;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// 保存データを読む。壊れていたら最初から。シナリオにないIDは捨てる。
export function createStoryStore(storage, script) {
  const known = new Set(script.events.map((e) => e.id));
  const read = () => {
    let data = null;
    try {
      data = JSON.parse(storage.getItem(STORY_KEY) ?? 'null');
    } catch {
      // 壊れた保存データは無視する
    }
    const cleared = isObj(data) && Array.isArray(data.cleared)
      ? [...new Set(data.cleared.filter((id) => typeof id === 'string' && known.has(id)))]
      : [];
    return { cleared };
  };
  const write = (state) => {
    try {
      storage.setItem(STORY_KEY, JSON.stringify({ version: 1, cleared: state.cleared }));
      return true;
    } catch {
      return false;
    }
  };
  return {
    load: read,
    // クリアを記録する。初めてのクリアなら true
    clear(id) {
      const state = read();
      if (!known.has(id) || state.cleared.includes(id)) return false;
      state.cleared.push(id);
      write(state);
      return true;
    },
    reset() {
      try {
        storage.removeItem(STORY_KEY);
      } catch {
        // 消せなくても、次に読むときに困らない
      }
    },
  };
}

const ALL_PIECES = () => [...CHARACTERS, ...ITEMS].map((p) => p.id);
const ALL_RELICS = () => RELICS.map((r) => r.id);

// いまの状態：使えるコストの割合・駒・遺物、出てくるイベント、エンディングを見たか。
export function storyStatus(script, cleared) {
  const done = new Set(cleared);
  let costRatio = script.start.costRatio;
  const pieces = new Set(script.start.pieces);
  const relics = new Set(script.start.relics);
  for (const e of script.events) {
    if (!done.has(e.id) || !e.reward) continue;
    if (e.reward.costRatio) costRatio = Math.max(costRatio, e.reward.costRatio);
    for (const id of e.reward.pieces ?? []) pieces.add(id);
    for (const id of e.reward.relics ?? []) relics.add(id);
  }
  const finished = script.events.some((e) => e.kind === 'ending' && done.has(e.id));
  // クリア後は、すべての駒・遺物とコスト100%で遊べる
  if (finished) {
    costRatio = 1;
    for (const id of ALL_PIECES()) pieces.add(id);
    for (const id of ALL_RELICS()) relics.add(id);
  }
  const unlocked = (e) => (e.requires ?? []).every((id) => done.has(id));
  return {
    costRatio,
    pieces,
    relics,
    finished,
    events: script.events.filter(unlocked).map((e) => ({ ...e, cleared: done.has(e.id) })),
  };
}

// ボードごとのコスト上限（割合を掛けて切り捨て）
export const storyCap = (boardId, costRatio) => Math.floor(BOARDS[boardId].costCap * costRatio);

// validateTeam に渡す制限（src/core/team.js）
export function storyRules(status) {
  return {
    costCap: (boardId) => storyCap(boardId, status.costRatio),
    pieces: status.pieces,
    relics: status.relics,
  };
}

// クリア前後の差（報酬の表示用）
export function rewardDiff(before, after) {
  return {
    costRatio: after.costRatio > before.costRatio ? after.costRatio : null,
    pieces: [...after.pieces].filter((id) => !before.pieces.has(id)),
    relics: [...after.relics].filter((id) => !before.relics.has(id)),
    finished: after.finished && !before.finished,
  };
}
