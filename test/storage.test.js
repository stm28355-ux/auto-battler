import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_TEAMS } from '../src/data/presetTeams.js';
import { createCatalog } from '../src/core/catalog.js';
import { validateTeam } from '../src/core/team.js';
import { exportTeamJson, normalizeTeam, parseTeamJson, sanitizeTeam } from '../src/storage/teamJson.js';
import { createTeamStore, listBattleTeams, memoryStorage, SLOT_COUNT } from '../src/storage/teamStore.js';

const custom = (o = {}) => ({
  id: 'u_test', kind: 'character', name: '試作機', icon: '🤖', tribe: 'machine',
  hp: 300, atk: 30, def: 20, spd: 1, effects: [{ type: 'poison', stacks: 1, chance: 0.5 }], ...o,
});
const teamWith = (pieces) => ({
  name: '自作入り',
  board: 'square',
  slots: [{ pos: [1, 1], pieceId: 'u_test' }, { pos: [1, 2], pieceId: 'i_sword' }],
  relics: ['r_amulet'],
  customPieces: pieces,
});
const wrap = (team) => JSON.stringify({ format: 'auto-battler/team', version: 1, team });
const errorsOf = (team) => parseTeamJson(wrap(team)).errors.join('\n');

test('書き出して読み込むと同じチームになる（プリセット）', () => {
  for (const preset of PRESET_TEAMS) {
    const { team, errors } = parseTeamJson(exportTeamJson(preset));
    assert.deepEqual(errors, []);
    assert.deepEqual(team, normalizeTeam(preset));
  }
});

test('自作駒は使っているものだけ同梱され、読み込み後は対戦に使える', () => {
  const unused = custom({ id: 'u_unused', name: '未使用' });
  const json = exportTeamJson(teamWith([custom(), unused]));
  const { team, errors } = parseTeamJson(json);
  assert.deepEqual(errors, []);
  assert.deepEqual(team.customPieces.map((p) => p.id), ['u_test']);
  assert.deepEqual(validateTeam(team, createCatalog(team.customPieces)), []);
});

test('不正なJSONは理由つきで拒否する', () => {
  assert.match(parseTeamJson('').errors[0], /空/);
  assert.match(parseTeamJson('{oops').errors[0], /JSONとして読み込めません/);
  assert.match(parseTeamJson('[]').errors[0], /チームのJSONではありません/);
  assert.match(parseTeamJson(JSON.stringify({ format: 'auto-battler/piece', version: 1 })).errors[0], /チームのJSONではありません/);
  assert.match(parseTeamJson(JSON.stringify({ format: 'auto-battler/team', version: 2, team: {} })).errors[0], /バージョン/);
  assert.match(parseTeamJson('x'.repeat(1_000_001)).errors[0], /大きすぎ/);
});

test('チームの中身の不正を検出する', () => {
  const ok = { name: 't', board: 'square', slots: [{ pos: [1, 1], pieceId: 'c_wolf' }], relics: [] };
  assert.equal(errorsOf(ok), '');
  assert.match(errorsOf({ ...ok, name: '  ' }), /チーム名/);
  assert.match(errorsOf({ ...ok, name: 'x'.repeat(31) }), /チーム名/);
  assert.match(errorsOf({ ...ok, board: 'circle' }), /ボードが不正/);
  assert.match(errorsOf({ ...ok, board: '__proto__' }), /ボードが不正/);
  assert.match(errorsOf({ ...ok, slots: 'x' }), /slots/);
  assert.match(errorsOf({ ...ok, slots: [{ pos: [4, 4], pieceId: 'c_wolf' }] }), /マスではありません/);
  assert.match(errorsOf({ ...ok, slots: [{ pos: [1.5, 1], pieceId: 'c_wolf' }] }), /slots\[0\]/);
  assert.match(errorsOf({ ...ok, slots: [{ pos: [1, 1], pieceId: 'a' }, { pos: [1, 1], pieceId: 'b' }] }), /重複/);
  assert.match(errorsOf({ ...ok, relics: [1] }), /relics/);
});

test('自作駒の不正を検出する（範囲外・標準IDとの衝突・重複・危険なキー）', () => {
  const base = { name: 't', board: 'square', slots: [], relics: [] };
  assert.match(errorsOf({ ...base, customPieces: [custom({ hp: 99999 })] }), /hp/);
  assert.match(errorsOf({ ...base, customPieces: [custom({ id: 'c_wolf' })] }), /標準の駒と重複/);
  assert.match(errorsOf({ ...base, customPieces: [custom(), custom()] }), /重複/);
  assert.match(errorsOf({ ...base, customPieces: [custom({ tribe: '__proto__' })] }), /種族/);
  assert.match(errorsOf({ ...base, customPieces: [custom({ effects: [{ type: 'constructor' }] })] }), /不明な効果/);
  assert.match(errorsOf({ ...base, customPieces: [custom({ effects: [{ type: 'statBuff', stat: 'atk', value: 1, mode: 'add', scope: 'team' }] })] }), /付けられません/);
  assert.match(errorsOf({ ...base, customPieces: [custom({ name: '' })] }), /名前/);
});

test('未知の項目は取り込まない', () => {
  const { team } = sanitizeTeam({ name: 't', board: 'square', slots: [], relics: [], evil: 1, __proto__: { x: 1 } });
  assert.deepEqual(Object.keys(team).sort(), ['board', 'name', 'relics', 'slots']);
});

test('コスト超過などのルール違反は読み込めて、validateTeam が指摘する', () => {
  const slots = ['2,1', '2,2', '2,3', '2,4', '2,5', '3,1', '3,2', '3,3']
    .map((k) => ({ pos: k.split(',').map(Number), pieceId: 'c_golem' }));
  const { team, errors } = parseTeamJson(wrap({ name: '重すぎ', board: 'pentagram', slots, relics: [] }));
  assert.deepEqual(errors, []);
  assert.match(validateTeam(team, createCatalog()).join(), /コストが上限を超えています/);
});

test('保存スロット：保存・読み込み・削除', () => {
  const storage = memoryStorage();
  const store = createTeamStore(storage);
  assert.equal(store.load().length, SLOT_COUNT);
  assert.ok(store.load().every((t) => t === null));

  assert.equal(store.save(2, PRESET_TEAMS[0]), true);
  assert.equal(store.save(8, teamWith([custom()])), true);
  const slots = store.load();
  assert.equal(slots[2].name, PRESET_TEAMS[0].name);
  assert.equal(slots[8].customPieces[0].id, 'u_test');
  assert.equal(slots[0], null);

  // 作り直しても残っている
  assert.equal(createTeamStore(storage).load()[2].name, PRESET_TEAMS[0].name);

  assert.equal(store.remove(2), true);
  assert.equal(store.load()[2], null);
  assert.equal(store.save(9, PRESET_TEAMS[0]), false);
  assert.equal(store.save(-1, PRESET_TEAMS[0]), false);
});

test('保存データが壊れていても落ちない。壊れたスロットだけ空になる', () => {
  const storage = memoryStorage();
  storage.setItem('auto-battler.teams.v1', '{oops');
  assert.ok(createTeamStore(storage).load().every((t) => t === null));

  const good = normalizeTeam(PRESET_TEAMS[0]);
  storage.setItem('auto-battler.teams.v1', JSON.stringify([good, { name: 'x', board: 'nope' }, 5, null]));
  const slots = createTeamStore(storage).load();
  assert.equal(slots[0].name, good.name);
  assert.deepEqual(slots.slice(1), Array(SLOT_COUNT - 1).fill(null));
});

test('容量超過などで書き込めないときは false を返す', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.equal(createTeamStore(full).save(0, PRESET_TEAMS[0]), false);
});

test('対戦で選べるチーム = プリセット + 保存済みスロット', () => {
  const store = createTeamStore(memoryStorage());
  assert.equal(listBattleTeams(store).length, PRESET_TEAMS.length);
  store.save(3, PRESET_TEAMS[1]);
  const list = listBattleTeams(store);
  assert.equal(list.at(-1).id, 'slot:3');
  assert.match(list.at(-1).label, /スロット4/);
});
