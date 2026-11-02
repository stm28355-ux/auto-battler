import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, ITEMS } from '../src/data/pieces.js';
import { RELICS } from '../src/data/relics.js';
import { PRESET_TEAMS } from '../src/data/presetTeams.js';
import { createCatalog } from '../src/core/catalog.js';
import { pieceCost } from '../src/core/cost.js';
import { validatePiece } from '../src/core/piece.js';
import { activeSynergies, frontLiners, teamCost, validateTeam } from '../src/core/team.js';

const catalog = createCatalog();
const team = (board, slots, relics = []) => ({ name: 't', board, slots, relics });

test('初期の駒はすべて仕様の範囲内', () => {
  for (const p of [...CHARACTERS, ...ITEMS]) assert.deepEqual(validatePiece(p), [], p.id);
  const ids = [...CHARACTERS, ...ITEMS, ...RELICS].map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'IDの重複');
});

test('コスト計算', () => {
  assert.equal(pieceCost(catalog.piece('c_squire')), 2); // 0.55 + 0.625 + 0.4
  assert.equal(pieceCost(catalog.piece('c_knight')), 3); // 1.125 + 0.5 + 1.2
  assert.equal(pieceCost(catalog.piece('i_spear')), 1); // 0.5 + 0.4
  assert.equal(pieceCost({ kind: 'item', atk: 0, def: 0, effects: [{ type: 'adjAtkMult', mult: 0.2 }] }), 1);
  assert.equal(pieceCost({ kind: 'item', atk: 0, def: 0, effects: [] }), 1); // 最低1
});

test('プリセットチームはすべて対戦に出せる', () => {
  for (const t of PRESET_TEAMS) assert.deepEqual(validateTeam(t, catalog), [], t.id);
});

test('前線は各行で列がいちばん小さいキャラ。道具は前線にならない', () => {
  const t = team('square', [
    { pos: [1, 1], pieceId: 'i_sword' },
    { pos: [1, 3], pieceId: 'c_wolf' },
    { pos: [1, 2], pieceId: 'c_bear' },
    { pos: [3, 3], pieceId: 'c_drone' },
  ]);
  assert.deepEqual([...frontLiners(t, catalog)], [[1, [1, 2]], [3, [3, 3]]]);
});

test('ペンタグラムの前線', () => {
  const t = PRESET_TEAMS.find((p) => p.board === 'pentagram');
  assert.deepEqual([...frontLiners(t, catalog)], [[1, [1, 3]], [2, [2, 1]], [3, [3, 1]]]);
});

test('チーム検証', () => {
  assert.deepEqual(validateTeam(team('square', [{ pos: [1, 1], pieceId: 'i_sword' }]), catalog),
    ['キャラクターを1体以上配置してください']);
  assert.match(validateTeam(team('square', [{ pos: [4, 1], pieceId: 'c_wolf' }]), catalog)[0], /マスではありません/);
  assert.match(validateTeam(team('honeycomb', [{ pos: [1, 1], pieceId: 'c_wolf' }]), catalog)[0], /マスではありません/);
  const heavy = team('pentagram', ['2,1', '2,2', '2,3', '2,4', '2,5', '3,1', '3,2', '3,3'].map((k) => ({ pos: k.split(',').map(Number), pieceId: 'c_golem' })));
  assert.equal(teamCost(heavy, catalog), 24);
  assert.match(validateTeam(heavy, catalog).join(), /コストが上限を超えています/);
  const relics = team('square', [{ pos: [1, 1], pieceId: 'c_wolf' }], ['r_heart', 'r_amulet', 'r_totem', 'r_spring']);
  assert.match(validateTeam(relics, catalog).join(), /遺物は3つまで/);
});

test('種族シナジーは満たした最大の段階だけ', () => {
  const t = PRESET_TEAMS.find((p) => p.id === 'p_square_knights');
  const [warrior] = activeSynergies(t, catalog);
  assert.equal(warrior.tribe, 'warrior');
  assert.equal(warrior.count, 4);
  assert.equal(warrior.tier, 3);
});
