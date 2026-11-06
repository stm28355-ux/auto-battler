import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARDS, boardRows, neighbors, posKey } from '../src/data/boards.js';

const keys = (list) => list.map(posKey).sort();

test('マス数とコスト上限', () => {
  assert.equal(BOARDS.pentagram.cells.length, 12);
  assert.equal(BOARDS.square.cells.length, 9);
  assert.equal(BOARDS.honeycomb.cells.length, 7);
  assert.deepEqual(
    [BOARDS.pentagram.costCap, BOARDS.square.costCap, BOARDS.honeycomb.costCap],
    [48, 52, 55],
  );
});

test('隣接は対称', () => {
  for (const board of Object.values(BOARDS)) {
    for (const a of board.cells) {
      for (const b of neighbors(board.id, a)) {
        assert.ok(keys(neighbors(board.id, b)).includes(posKey(a)), `${board.id} ${a} - ${b}`);
      }
    }
  }
});

test('スクエアは上下左右の4方向', () => {
  assert.deepEqual(keys(neighbors('square', [2, 2])), ['1,2', '2,1', '2,3', '3,2']);
  assert.deepEqual(keys(neighbors('square', [1, 1])), ['1,2', '2,1']);
});

test('ハニカムの中央は6マスすべてと隣接', () => {
  assert.deepEqual(keys(neighbors('honeycomb', [2, 3])), ['1,2', '1,4', '2,1', '2,5', '3,2', '3,4']);
  assert.deepEqual(keys(neighbors('honeycomb', [2, 1])), ['1,2', '2,3', '3,2']);
  assert.deepEqual(keys(neighbors('honeycomb', [1, 2])), ['1,4', '2,1', '2,3']);
});

test('ペンタグラムの縦の隣接は4組だけ', () => {
  const board = BOARDS.pentagram;
  const vertical = new Set();
  for (const a of board.cells) {
    for (const b of neighbors('pentagram', a)) {
      if (a[0] < b[0]) vertical.add(`${posKey(a)}-${posKey(b)}`);
    }
  }
  assert.deepEqual([...vertical].sort(), ['1,3-2,3', '2,2-3,2', '2,4-3,4', '3,3-4,3']);
});

test('ペンタグラムの横の隣接と端のマス', () => {
  assert.deepEqual(keys(neighbors('pentagram', [2, 1])), ['2,2']);
  assert.deepEqual(keys(neighbors('pentagram', [2, 3])), ['1,3', '2,2', '2,4']);
  assert.deepEqual(keys(neighbors('pentagram', [1, 3])), ['2,3']);
});

test('行の一覧', () => {
  assert.deepEqual(boardRows('pentagram'), [1, 2, 3, 4]);
  assert.deepEqual(boardRows('square'), [1, 2, 3]);
});
