import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, ITEMS } from '../src/data/pieces.js';
import { costBreakdown, pieceCost } from '../src/core/cost.js';
import { MAX_PIECES, exportPieceJson, exportPiecesJson, parsePieceJson, sanitizePiece } from '../src/storage/pieceJson.js';
import { MAX_STORED_PIECES, createPieceStore, newPieceId } from '../src/storage/pieceStore.js';
import { memoryStorage } from '../src/storage/local.js';
import { parseTeamJson } from '../src/storage/teamJson.js';

const chara = (o = {}) => ({
  id: 'u_a', kind: 'character', name: '試作機', icon: '🤖', tribe: 'machine',
  hp: 300, atk: 30, def: 20, spd: 1, effects: [{ type: 'poison', stacks: 1, chance: 0.5 }], ...o,
});
const thing = (o = {}) => ({ id: 'u_i', kind: 'item', name: '試作盾', icon: '🛡️', atk: 0, def: 30, effects: [], ...o });
const wrap = (piece) => JSON.stringify({ format: 'auto-battler/piece', version: 1, piece });
const errorsOf = (piece) => parsePieceJson(wrap(piece)).errors.join('\n');

test('駒を書き出して読み込むと同じ駒になる（キャラ・道具）', () => {
  for (const piece of [chara(), thing()]) {
    const { pieces, errors } = parsePieceJson(exportPieceJson(piece));
    assert.deepEqual(errors, []);
    assert.deepEqual(pieces, [piece]);
  }
});

test('標準の駒もそのまま書き出して読み込める形式（IDだけは自作駒として使えない）', () => {
  for (const p of [...CHARACTERS, ...ITEMS]) {
    assert.deepEqual(sanitizePiece({ ...p, id: `u_${p.id}` }).errors, [], p.id);
    assert.match(sanitizePiece(p).errors.join(), /標準の駒と重複/);
  }
});

test('まとめて書き出し・読み込み。1つでも不正なら全体を拒否する', () => {
  const ok = parsePieceJson(exportPiecesJson([chara(), thing()]));
  assert.deepEqual(ok.pieces.map((p) => p.id), ['u_a', 'u_i']);
  const json = (pieces) => JSON.stringify({ format: 'auto-battler/pieces', version: 1, pieces });
  const bad = parsePieceJson(json([chara(), chara({ id: 'u_b', hp: 5 })]));
  assert.deepEqual(bad.pieces, []);
  assert.match(bad.errors.join(), /2個目.*hp/);
  assert.match(parsePieceJson(json([chara(), chara()])).errors.join(), /重複/);
  assert.match(parsePieceJson(json([])).errors.join(), /1〜100個/);
  const many = Array.from({ length: MAX_PIECES + 1 }, (_, i) => chara({ id: `u_${i}` }));
  assert.match(parsePieceJson(json(many)).errors.join(), /1〜100個/);
});

test('JSONの種類・バージョン違い、壊れたJSONを理由つきで拒否する', () => {
  assert.match(parsePieceJson('').errors[0], /空/);
  assert.match(parsePieceJson('{oops').errors[0], /JSONとして読み込めません/);
  assert.match(parsePieceJson('[]').errors[0], /駒のJSONではありません/);
  assert.match(parsePieceJson(JSON.stringify({ format: 'auto-battler/piece', version: 9, piece: chara() })).errors[0], /バージョン/);
  assert.match(parsePieceJson(JSON.stringify({ format: 'auto-battler/team', version: 1 })).errors[0], /チームのJSON/);
  assert.match(parseTeamJson(wrap(chara())).errors[0], /駒のJSON/);
  assert.match(parsePieceJson('x'.repeat(1_000_001)).errors[0], /大きすぎ/);
});

test('数値：範囲外・文字列・無限大・小数の付与量を拒否する', () => {
  assert.match(errorsOf(chara({ hp: 99 })), /hp/);
  assert.match(errorsOf(chara({ atk: 201 })), /atk/);
  assert.match(errorsOf(chara({ spd: 0.1 })), /spd/);
  assert.match(errorsOf(chara({ hp: '300' })), /hp/);
  assert.match(errorsOf(chara({ hp: null })), /hp/);
  // JSONでは 1e999 が Infinity として読まれる
  const infinite = parsePieceJson('{"format":"auto-battler/piece","version":1,"piece":{"id":"u_a","kind":"character","name":"x","tribe":"beast","hp":1e999,"atk":10,"def":0,"spd":1,"effects":[]}}');
  assert.match(infinite.errors.join(), /hp/);
  assert.match(errorsOf(thing({ atk: -1 })), /atk/);
});

test('特殊効果：個数・数値の範囲・不明な種類・付けられない効果を拒否する', () => {
  const poison = { type: 'poison', stacks: 1, chance: 1 };
  assert.match(errorsOf(chara({ effects: [poison, poison, poison] })), /2個まで/);
  assert.match(errorsOf(chara({ effects: [{ ...poison, stacks: 11 }] })), /1〜10/);
  assert.match(errorsOf(chara({ effects: [{ ...poison, stacks: 1.5 }] })), /毒/);
  assert.match(errorsOf(chara({ effects: [{ ...poison, chance: 2 }] })), /確率/);
  assert.match(errorsOf(chara({ effects: [{ type: 'paralyze', target: 'everyone', duration: 3, chance: 1 }] })), /対象/);
  assert.match(errorsOf(chara({ effects: [{ type: 'heal', amount: 0, interval: 1 }] })), /回復量/);
  assert.match(errorsOf(chara({ effects: [{ type: 'heal', amount: 5, interval: 0 }] })), /間隔/);
  assert.match(errorsOf(chara({ effects: [{ type: 'adjAtkMult', mult: 99 }] })), /倍率/);
  assert.match(errorsOf(chara({ effects: [{ type: 'statBuff', stat: 'atk', value: 99999, mode: 'add', scope: 'team' }] })), /付けられません/);
  assert.match(errorsOf(chara({ effects: [{ type: 'poisonBonus', value: 9 }] })), /付けられません/);
  assert.match(errorsOf(chara({ effects: [{ type: '__proto__' }] })), /不明な効果/);
  assert.match(errorsOf(chara({ effects: [{ type: 'toString' }] })), /不明な効果/);
  assert.match(errorsOf(chara({ effects: [null] })), /不明な効果/);
  assert.match(errorsOf(chara({ effects: 'poison' })), /特殊効果/);
  assert.match(errorsOf(chara({ effects: Array(5000).fill(poison) })), /2個まで/);
});

test('名前・アイコン・IDの文字：マークアップ、制御文字、向きを変える文字、長すぎる値を拒否する', () => {
  assert.match(errorsOf(chara({ icon: '<b>' })), /アイコン/);
  assert.match(errorsOf(chara({ icon: '<img src=x onerror=alert(1)>' })), /アイコン/);
  assert.match(errorsOf(chara({ icon: '"' })), /アイコン/);
  assert.match(errorsOf(chara({ icon: 'あいうえおかきくけ' })), /アイコン/);
  assert.match(errorsOf(chara({ icon: 'a\u0000' })), /アイコン/);
  assert.match(errorsOf(chara({ icon: 5 })), /アイコン/);
  assert.equal(errorsOf(chara({ icon: '👨‍👩‍👧‍👦' })), ''); // 家族の絵文字（ZWJ連結）は通す
  assert.equal(errorsOf(chara({ icon: undefined })), ''); // 未指定なら ❓
  assert.match(errorsOf(chara({ name: '' })), /名前/);
  assert.match(errorsOf(chara({ name: '   ' })), /名前/);
  assert.match(errorsOf(chara({ name: 'x'.repeat(31) })), /名前/);
  assert.match(errorsOf(chara({ name: 'a‮b' })), /名前/);
  assert.match(errorsOf(chara({ name: 'a\nb' })), /名前/);
  assert.equal(errorsOf(chara({ name: '<b>太字</b> & "引用"' })), ''); // 表示時にエスケープするので名前は通す
  for (const id of ['', 'a b', '../x', '__proto__', '__x', 'u/a', 'あ', 'x'.repeat(65), 5, null]) {
    assert.match(errorsOf(chara({ id })), /ID/, String(id));
  }
  assert.equal(errorsOf(chara({ id: 'u_ok-1' })), '');
});

test('種類・種族の不正と、未知の項目の除去', () => {
  assert.match(errorsOf(chara({ kind: 'monster' })), /種類/);
  assert.match(errorsOf(chara({ kind: ['character'] })), /種類/);
  assert.match(errorsOf(chara({ kind: '__proto__' })), /種類/);
  assert.match(errorsOf(chara({ tribe: 'elf' })), /種族/);
  assert.match(errorsOf(chara({ tribe: '__proto__' })), /種族/);
  const dirty = JSON.parse(`{"format":"auto-battler/piece","version":1,"piece":{"id":"u_a","kind":"character","name":"x","tribe":"beast",
    "hp":300,"atk":30,"def":20,"spd":1,"evil":1,"sprite":"<svg>","__proto__":{"admin":true},"constructor":"x",
    "effects":[{"type":"poison","stacks":1,"chance":1,"extra":"y","__proto__":{"a":1}}]}}`);
  const { pieces } = parsePieceJson(JSON.stringify(dirty));
  assert.deepEqual(Object.keys(pieces[0]).sort(), ['atk', 'def', 'effects', 'hp', 'icon', 'id', 'kind', 'name', 'spd', 'tribe']);
  assert.deepEqual(pieces[0].effects, [{ type: 'poison', stacks: 1, chance: 1 }]);
  assert.equal(Object.getPrototypeOf(pieces[0]), Object.prototype);
  assert.equal({}.admin, undefined);
  // 道具にキャラの項目があっても取り込まない
  assert.deepEqual(Object.keys(parsePieceJson(wrap(thing({ hp: 999, tribe: 'beast', spd: 9 }))).pieces[0]).sort(),
    ['atk', 'def', 'effects', 'icon', 'id', 'kind', 'name']);
});

test('コストの内訳は合計が pieceCost と一致し、効果も内訳に出る', () => {
  for (const p of [...CHARACTERS, ...ITEMS, chara(), thing()]) {
    const b = costBreakdown(p);
    assert.equal(b.total, pieceCost(p));
    assert.ok(Math.abs(b.parts.reduce((s, x) => s + x.value, 0) - b.raw) < 1e-9);
  }
  assert.deepEqual(costBreakdown(chara()).parts.map((p) => p.label), ['HP', '攻撃×攻撃速度', '防御', '毒']);
  // ステータスが高いほどコストが大きい（コストは切り上げなので、差が出る値で比べる）
  assert.ok(pieceCost(chara({ hp: 1000 })) > pieceCost(chara({ hp: 300 })));
  assert.ok(pieceCost(chara({ spd: 3 })) > pieceCost(chara({ spd: 1 })));
  assert.ok(pieceCost(chara({ def: 100 })) > pieceCost(chara({ def: 0 })));
  assert.ok(costBreakdown(chara({ hp: 600 })).raw > costBreakdown(chara({ hp: 300 })).raw);
});

test('新しいIDは形式を満たし、標準の駒や他のIDと重ならない', () => {
  const ids = new Set(Array.from({ length: 200 }, newPieceId));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.deepEqual(sanitizePiece(chara({ id })).errors, [], id);
});

test('自作駒の保存庫：保存・上書き・削除・再読み込み', () => {
  const storage = memoryStorage();
  const store = createPieceStore(storage);
  assert.deepEqual(store.load(), []);
  assert.equal(store.save(chara()), true);
  assert.equal(store.save(thing()), true);
  assert.equal(store.save(chara({ name: '改良型' })), true); // 同じIDは上書き
  assert.deepEqual(store.load().map((p) => [p.id, p.name]), [['u_a', '改良型'], ['u_i', '試作盾']]);
  assert.equal(createPieceStore(storage).load().length, 2);
  assert.equal(store.remove('u_a'), true);
  assert.deepEqual(store.load().map((p) => p.id), ['u_i']);
});

test('保存庫：不正な駒は保存せず、壊れた保存データ・改ざんされた駒は読み飛ばす', () => {
  const storage = memoryStorage();
  const store = createPieceStore(storage);
  assert.equal(store.save(chara({ hp: 99999 })), false);
  assert.equal(store.save(chara({ id: 'c_wolf' })), false);
  assert.deepEqual(store.load(), []);

  storage.setItem('auto-battler.pieces.v1', '{oops');
  assert.deepEqual(store.load(), []);
  storage.setItem('auto-battler.pieces.v1', JSON.stringify([chara(), chara({ id: 'u_b', hp: 99999 }), 5, null, chara({ id: 'u_c', icon: '<b>' }), chara()]));
  assert.deepEqual(store.load().map((p) => p.id), ['u_a']);
});

test('保存庫：上限を超える保存は拒否し、容量超過でも落ちない', () => {
  const store = createPieceStore(memoryStorage());
  const many = Array.from({ length: MAX_STORED_PIECES }, (_, i) => chara({ id: `u_${i}` }));
  assert.equal(store.saveMany(many), true);
  assert.equal(store.save(chara({ id: 'u_extra' })), false);
  assert.equal(store.load().length, MAX_STORED_PIECES);
  const full = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.equal(createPieceStore(full).save(chara()), false);
});
