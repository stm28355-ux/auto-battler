import test from 'node:test';
import assert from 'node:assert/strict';
import { LATEST, applyEnvironment } from '../src/data/environment.js';
import { BOARDS } from '../src/data/boards.js';
import { CHARACTERS, ITEMS } from '../src/data/pieces.js';
import { RELICS } from '../src/data/relics.js';
import { useBalance } from '../src/data/balance.js';
import { createCatalog } from '../src/core/catalog.js';
import { teamCost, validateTeam } from '../src/core/team.js';
import { createStoryStore, rewardDiff, storyCap, storyRules, storyStatus, STORY_KEY } from '../src/story/progress.js';
import { BATTLERS, CAST, STORY } from '../src/story/script.js';
import { createTeamStore, memoryStorage } from '../src/storage/teamStore.js';
import { clearedBefore, measure } from '../tools/story.js';

// ストーリーは最新の環境で遊ぶ（spec §14）
applyEnvironment(LATEST.id);
useBalance();
const catalog = createCatalog();
const ids = (list) => list.map((x) => x.id);
const T = (board, cells) => ({ name: 't', board, slots: Object.entries(cells).map(([k, pieceId]) => ({ pos: k.split(',').map(Number), pieceId })), relics: [] });

test('シナリオ：ID・条件・話し手・相手・報酬が正しくつながっている', () => {
  const events = new Map(STORY.events.map((e) => [e.id, e]));
  assert.equal(events.size, STORY.events.length, 'イベントIDの重複');
  const pieceIds = new Set(ids([...CHARACTERS, ...ITEMS]));
  const relicIds = new Set(ids(RELICS));
  for (const e of STORY.events) {
    for (const r of e.requires ?? []) assert.ok(events.has(r), `${e.id} requires ${r}`);
    for (const [who] of [...(e.before ?? []), ...(e.win ?? []), ...(e.lose ?? [])]) assert.ok(who === null || CAST[who], `${e.id} ${who}`);
    if (e.battle) {
      assert.ok(BATTLERS[e.battle.opponent], e.id);
      assert.ok(e.win?.length && e.lose?.length, `${e.id} の勝ち負けの会話`);
    }
    for (const id of e.reward?.pieces ?? []) assert.ok(pieceIds.has(id), `${e.id} ${id}`);
    for (const id of e.reward?.relics ?? []) assert.ok(relicIds.has(id), `${e.id} ${id}`);
  }
  for (const id of [...STORY.start.pieces]) assert.ok(pieceIds.has(id), id);
  assert.equal(STORY.events.filter((e) => e.kind === 'ending').length, 1);
});

test('シナリオ：メインは入学 → トール → グレン → ミュレ → マキナ → チャンピオン（トール）→ 卒業 の順', () => {
  const mains = STORY.events.filter((e) => e.kind !== 'side');
  assert.deepEqual(mains.map((e) => e.battle?.opponent ?? null), [null, 'thor', 'glen', 'mule', 'machina', 'thorChamp', null]);
  assert.deepEqual(['thor', 'glen', 'mule', 'machina', 'thorChamp'].map((k) => BATTLERS[k].tribe), ['warrior', 'beast', 'mage', 'machine', 'warrior']);
  assert.deepEqual(['thor', 'glen', 'mule', 'machina', 'thorChamp'].map((k) => BATTLERS[k].strength), ['weak', 'weak', 'normal', 'normal', 'strong']);
  for (let i = 1; i < mains.length; i++) assert.deepEqual(mains[i].requires, [mains[i - 1].id]);
});

test('シナリオ：サイドイベントをすべてクリアすると、すべての駒・遺物が手に入る', () => {
  const sidesAndMains = STORY.events.filter((e) => e.kind !== 'ending').map((e) => e.id);
  const st = storyStatus(STORY, sidesAndMains);
  assert.equal(st.finished, false);
  assert.deepEqual([...st.pieces].sort(), ids([...CHARACTERS, ...ITEMS]).sort());
  assert.deepEqual([...st.relics].sort(), ids(RELICS).sort());
});

test('相手のチームは、ふつうのルールで正しく、そのイベントで自分が使えるコスト以内（強い相手は除く）', () => {
  for (const [id, b] of Object.entries(BATTLERS)) {
    assert.deepEqual(validateTeam(b.team, catalog), [], id);
    if (b.rematch) assert.deepEqual(validateTeam(b.rematch, catalog), [], `${id} rematch`);
  }
  for (const e of STORY.events.filter((x) => x.battle)) {
    const b = BATTLERS[e.battle.opponent];
    if (b.strength === 'strong') continue;
    const cap = storyCap(b.team.board, storyStatus(STORY, clearedBefore(STORY, e).min).costRatio);
    assert.ok(teamCost(b.team, catalog) <= cap, `${e.id} ${teamCost(b.team, catalog)} / ${cap}`);
  }
});

test('強さ：サイドは剣術部・購買部が弱い、ほかは普通。クリア後の再戦は、別の「本気」のチーム（コスト上限の85%以上）', () => {
  const sides = STORY.events.filter((e) => e.kind === 'side').map((e) => e.battle.opponent);
  assert.deepEqual(sides.map((k) => BATTLERS[k].strength), ['weak', 'weak', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal']);
  for (const [id, b] of Object.entries(BATTLERS)) {
    if (b.noRematch || b.strength === 'strong') continue;
    assert.ok(b.rematch, `${id} の本気のチーム`);
    assert.notDeepEqual(b.rematch.slots, b.team.slots, id);
    assert.ok(teamCost(b.rematch, catalog) >= BOARDS[b.rematch.board].costCap * 0.85, `${id} ${teamCost(b.rematch, catalog)}`);
  }
});

test('進行：コストは 50% → 60% → 75% → 90% → 100% と上がり、クリア後はすべて使える', () => {
  const mains = STORY.events.filter((e) => e.kind !== 'side').map((e) => e.id);
  const ratios = mains.map((_, i) => storyStatus(STORY, mains.slice(0, i)).costRatio);
  assert.deepEqual(ratios, [0.5, 0.5, 0.6, 0.75, 0.9, 1, 1]);
  const start = storyStatus(STORY, []);
  assert.deepEqual(start.events.map((e) => e.id), ['m0_enroll']);
  assert.equal(start.pieces.size, STORY.start.pieces.length);
  const end = storyStatus(STORY, mains);
  assert.equal(end.finished, true);
  assert.equal(end.pieces.size, CHARACTERS.length + ITEMS.length);
  assert.equal(end.relics.size, RELICS.length);
  // サイドは、条件のメインをクリアすると出てくる
  const afterM1 = storyStatus(STORY, ['m0_enroll', 'm1_intro']).events.map((e) => e.id);
  assert.ok(afterM1.includes('s1_kendo') && afterM1.includes('m2_rep') && !afterM1.includes('s3_zoo'));
  // 報酬の差
  const diff = rewardDiff(storyStatus(STORY, ['m0_enroll', 'm1_intro']), storyStatus(STORY, ['m0_enroll', 'm1_intro', 's1_kendo']));
  assert.deepEqual(diff.pieces, ['c_berserker', 'c_paladin', 'c_swordmaster']);
  assert.deepEqual(diff.relics, ['r_warhorn']);
  assert.equal(diff.costRatio, null);
});

test('ストーリーの制限：コスト上限・まだ使えない駒と遺物・自作駒を拒否する', () => {
  const rules = storyRules(storyStatus(STORY, []));
  assert.equal(rules.costCap('square'), Math.floor(BOARDS.square.costCap * 0.5));
  assert.deepEqual(validateTeam(T('square', { '1,1': 'c_knight', '2,1': 'c_squire' }), catalog, rules), []);
  assert.match(validateTeam(T('square', { '1,1': 'c_lion' }), catalog, rules).join(), /まだ使えない駒/);
  assert.match(validateTeam({ ...T('square', { '1,1': 'c_squire' }), relics: ['r_totem'] }, catalog, rules).join(), /まだ使えない遺物/);
  const heavy = T('square', { '1,1': 'c_knight', '2,1': 'c_knight', '3,1': 'c_knight', '1,2': 'c_knight' });
  assert.match(validateTeam(heavy, catalog, rules).join(), /コストが上限を超えています（28 \/ 26）/);
  const mine = { id: 'u_x', kind: 'character', name: 'x', icon: '?', tribe: 'warrior', hp: 100, atk: 10, def: 0, spd: 1, effects: [] };
  assert.match(validateTeam(T('square', { '1,1': 'u_x' }), createCatalog([mine]), rules).join(), /まだ使えない駒/);
  // 制限なしなら、ふつうのルール
  assert.deepEqual(validateTeam(heavy, catalog), []);
});

test('進行の保存：クリアしたIDだけを持ち、壊れたデータ・知らないIDは捨てる', () => {
  const storage = memoryStorage();
  const store = createStoryStore(storage, STORY);
  assert.deepEqual(store.load().cleared, []);
  assert.equal(store.clear('m0_enroll'), true);
  assert.equal(store.clear('m0_enroll'), false);
  assert.equal(store.clear('nope'), false);
  assert.deepEqual(store.load().cleared, ['m0_enroll']);
  storage.setItem(STORY_KEY, JSON.stringify({ version: 1, cleared: ['m1_intro', '__proto__', 3, 'm1_intro'] }));
  assert.deepEqual(store.load().cleared, ['m1_intro']);
  storage.setItem(STORY_KEY, '{壊れた');
  assert.deepEqual(store.load().cleared, []);
  store.reset();
  assert.equal(storage.getItem(STORY_KEY), null);
});

test('ストーリー用の編成は、通常とは別の保存先・3スロット', () => {
  const storage = memoryStorage();
  const story = createTeamStore(storage, 'v2', { key: 'story', slots: 3 });
  const normal = createTeamStore(storage, 'v2');
  assert.equal(story.load().length, 3);
  assert.equal(story.save(2, T('square', { '1,1': 'c_squire' })), true);
  assert.equal(story.save(3, T('square', { '1,1': 'c_squire' })), false);
  assert.equal(normal.load().filter(Boolean).length, 0);
});

test('難易度：どのメインも、そこまでのサイドを集めたうえでランダムに組んだ上位のチームなら勝てる', () => {
  for (const e of STORY.events.filter((x) => x.battle && x.kind === 'main')) {
    const { max } = clearedBefore(STORY, e);
    const r = measure(BATTLERS[e.battle.opponent].team, storyStatus(STORY, max), { teams: 60, seed: 2 });
    assert.ok(r.top >= 0.5, `${e.id} 上位の勝率 ${r.top}`);
  }
});
