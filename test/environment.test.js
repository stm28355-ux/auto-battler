import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, useBalance } from '../src/data/balance.js';
import { BOARDS } from '../src/data/boards.js';
import { ENVIRONMENTS, LATEST, activeEnvironment, applyEnvironment, captureEnvironment } from '../src/data/environment.js';
import { CHARACTERS } from '../src/data/pieces.js';
import { PRESET_TEAMS } from '../src/data/presetTeams.js';
import { TRIBES } from '../src/data/tribes.js';
import { createCatalog } from '../src/core/catalog.js';
import { validatePiece } from '../src/core/piece.js';
import { validateTeam } from '../src/core/team.js';
import { runBattle } from '../src/engine/battle.js';
import { BUILTIN_IDS, exportTeamJson, parseTeamJson } from '../src/storage/teamJson.js';
import { createTeamStore, memoryStorage, teamKey } from '../src/storage/teamStore.js';

const restore = () => applyEnvironment(LATEST.id);

test('環境の一覧：IDが重ならず、最後が最新', () => {
  const ids = ENVIRONMENTS.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ENVIRONMENTS.at(-1), LATEST);
  assert.ok(ids.includes('v1'));
});

test('どの環境も、駒・プリセットがその環境のルールで正しい', () => {
  try {
    for (const env of ENVIRONMENTS) {
      applyEnvironment(env.id);
      const catalog = createCatalog();
      for (const p of catalog.pieces()) assert.deepEqual(validatePiece(p), [], `${env.id} ${p.id}`);
      for (const t of PRESET_TEAMS) assert.deepEqual(validateTeam(t, catalog), [], `${env.id} ${t.id}`);
    }
  } finally {
    restore();
  }
});

test('切り替えると各データの中身が入れ替わり、最新に戻すと元どおり', () => {
  const before = captureEnvironment();
  try {
    const v1 = applyEnvironment('v1');
    assert.equal(activeEnvironment().id, 'v1');
    assert.deepEqual(CHARACTERS, v1.characters);
    assert.deepEqual(TRIBES, v1.tribes);
    assert.equal(BOARDS.square.costCap, v1.costCaps.square);
    assert.deepEqual(BALANCE, v1.balance);
    // 切り替えた先の値を書き換えても、固定した環境は変わらない
    CHARACTERS[0].hp = 1;
    assert.notEqual(v1.characters[0].hp, 1);
    // useBalance() は、いまの環境の値に戻す
    BALANCE.damageScale = 99;
    useBalance();
    assert.equal(BALANCE.damageScale, v1.balance.damageScale);
  } finally {
    restore();
  }
  assert.deepEqual(captureEnvironment(), before);
  assert.equal(activeEnvironment().id, LATEST.id);
});

test('知らない環境IDなら最新になる', () => {
  try {
    assert.equal(applyEnvironment('nope').id, LATEST.id);
  } finally {
    restore();
  }
});

test('標準の駒の判定は、いまの環境の駒を見る', () => {
  assert.equal(BUILTIN_IDS.has('c_knight'), true);
  assert.equal(BUILTIN_IDS.has('u_mine'), false);
});

test('同じ環境の対戦は、何度やっても同じ結果', () => {
  try {
    applyEnvironment('v1');
    const catalog = createCatalog();
    const [a, b] = PRESET_TEAMS;
    assert.deepEqual(runBattle(a, b, catalog, { seed: 3 }), runBattle(a, b, catalog, { seed: 3 }));
  } finally {
    restore();
  }
});

test('保存チームは環境ごとに分かれる（Ver.1 は以前からの保存先）', () => {
  assert.equal(teamKey('v1'), 'auto-battler.teams.v1');
  assert.notEqual(teamKey('v2'), teamKey('v1'));
  const storage = memoryStorage();
  const v1 = createTeamStore(storage, 'v1');
  const v2 = createTeamStore(storage, 'v2');
  assert.equal(v1.save(0, PRESET_TEAMS[0]), true);
  assert.equal(v1.load()[0].name, PRESET_TEAMS[0].name);
  assert.equal(v2.load()[0], null);
});

test('チームのJSONは作った環境を持ち、読み込むと分かる', () => {
  const text = exportTeamJson(PRESET_TEAMS[0], 'v1');
  assert.equal(JSON.parse(text).env, 'v1');
  assert.equal(parseTeamJson(text).env, 'v1');
  // 環境を分ける前のJSON・知らない環境は null（読み込み自体はできる）
  const old = JSON.stringify({ format: 'auto-battler/team', version: 1, team: PRESET_TEAMS[0] });
  assert.equal(parseTeamJson(old).env, null);
  assert.deepEqual(parseTeamJson(old).errors, []);
  const unknown = JSON.stringify({ format: 'auto-battler/team', version: 1, env: '__proto__', team: PRESET_TEAMS[0] });
  assert.equal(parseTeamJson(unknown).env, null);
});
