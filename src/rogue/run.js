import { BOARDS } from '../data/boards.js';
import { validateTeam } from '../core/team.js';
import { createRng } from '../engine/rng.js';
import { autoTeam } from './auto.js';
import { CLEAR_BONUS, floorKind, FRONT_FLOOR, gameOverPoints, ROGUE_META_KEY, ROGUE_RUN_KEY, TOP_FLOOR } from './config.js';
import { createEnemy } from './enemies.js';
import { lifeOf, normalizeMeta } from './meta.js';
import { pieceOffer, relicOffer } from './offers.js';

// 挑戦の進行（spec §15）。画面に依存しない。関数は run を書き換える（保存は呼び出し側）。
//   run.phase: 'floor'（層の敵と戦う）/ 'reward'（報酬を選ぶ）/ 'front'（30層クリアの一時リザルト）/ 'final'（100層クリア）/ 'over'（ゲームオーバー・諦めた）
//   敵・報酬の候補は作った時点で保存する（ページを読み込み直しても変わらない）。
//   run.pending: 対戦を始めたときの { seed, team }。結果が出る前にページを閉じたら、開き直したときにこの内容で結果を出す

// 乱数はシード・用途・層・回数から作る（同じ挑戦で同じ層の敵は、いつも同じ）
const TAG = { enemy: 1, offer: 2 };
export function hashSeed(...parts) {
  let h = 2166136261;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return h >>> 0;
}
const rngFor = (run, ...parts) => createRng(hashSeed(run.seed, ...parts));

export const stackRelics = (relics) => Object.entries(relics).flatMap(([id, n]) => Array(n).fill(id));

// 自分のチームのルール：コスト上限なし、駒は持っている数まで、遺物は持っているものを全部（重ねてよい）
export const runRules = (run) => ({
  costCap: () => Infinity,
  pieceCounts: new Map(Object.entries(run.pieces)),
  maxRelics: Infinity,
  duplicateRelics: true,
});
// 敵のチームのルール
export const enemyRules = { costCap: () => Infinity, maxRelics: Infinity, duplicateRelics: true };

// 対戦に出すチーム：持っている遺物を全部つける
export const battleTeam = (run) => ({ ...run.team, board: run.board, relics: stackRelics(run.relics) });

const ctxOf = (catalog) => ({ pieces: catalog.pieces(), relics: catalog.relics() });

const add = (obj, ids) => {
  for (const id of ids) obj[id] = (obj[id] ?? 0) + 1;
};

// 報酬の候補。group: 'pieces' | 'relics'
function offerGroup(run, group, catalog) {
  const kind = floorKind(run.floor);
  const rng = rngFor(run, TAG.offer, run.floor, run.rolls++);
  if (group === 'pieces') return pieceOffer(catalog.pieces(), rng, { rare: kind === 'boss' || (kind === 'strong' && !!run.perks.strongRare) });
  return relicOffer(catalog.relics(), run.relics, rng, kind === 'boss' ? 2 : 1);
}
function makeOffer(run, catalog) {
  const kind = floorKind(run.floor);
  return {
    pieces: offerGroup(run, 'pieces', catalog),
    relics: kind === 'normal' ? null : offerGroup(run, 'relics', catalog),
  };
}

function enterFloor(run, floor, catalog) {
  run.floor = floor;
  if (floor % 10 === 1) run.rerolls = run.maxRerolls; // 一の位が1の層に入ったら、リロール回数を戻す
  run.enemy = createEnemy(floor, rngFor(run, TAG.enemy, floor), ctxOf(catalog));
}

// ショートカットで始められる層：到達したことのある 11・21・31…層
export const shortcutFloors = (meta) => (meta.alloc.perks.shortcut
  ? Array.from({ length: 9 }, (_, i) => i * 10 + 11).filter((f) => f <= meta.best)
  : []);

export function startRun(meta, { board, startFloor = 1, seed }, catalog) {
  const { alloc } = meta;
  const run = {
    version: 1,
    seed: seed >>> 0,
    board,
    startFloor,
    floor: startFloor,
    life: lifeOf(alloc),
    maxLife: lifeOf(alloc),
    rerolls: alloc.reroll,
    maxRerolls: alloc.reroll,
    perks: { bossHeal: !!alloc.perks.bossHeal, strongRare: !!alloc.perks.strongRare },
    pieces: { ...alloc.pieces },
    relics: { ...alloc.relics },
    rolls: 0,
    losses: 0,
    phase: 'floor',
    offer: null,
    pending: null,
  };
  // 飛ばした層の報酬は、自動で受け取る（どの報酬も1つ目のセット）
  for (let f = 1; f < startFloor; f++) {
    run.floor = f;
    const offer = makeOffer(run, catalog);
    add(run.pieces, offer.pieces[0]);
    if (offer.relics) add(run.relics, offer.relics[0]);
  }
  enterFloor(run, startFloor, catalog);
  run.team = autoTeam(board, run.pieces, catalog, 'わたしのチーム');
  return run;
}

// 勝った：報酬の候補を出す（100層なら挑戦が終わる）。返り値の bonus は、すぐ足すポイント（30層・100層）
export function winFloor(run, catalog) {
  run.pending = null;
  if (floorKind(run.floor) === 'boss' && run.perks.bossHeal) run.life = Math.min(run.maxLife, run.life + 1);
  const bonus = CLEAR_BONUS[run.floor] ?? 0;
  if (run.floor >= TOP_FLOOR) run.phase = 'final';
  else {
    run.offer = makeOffer(run, catalog);
    run.phase = 'reward';
  }
  return { bonus };
}

// 負けた：ライフが1減る。0になったらゲームオーバー（同じ相手に再挑戦できる）
export function loseFloor(run) {
  run.pending = null;
  run.life -= 1;
  run.losses += 1;
  if (run.life <= 0) run.phase = 'over';
}

export function reroll(run, group, catalog) {
  if (run.phase !== 'reward' || run.rerolls <= 0 || !run.offer?.[group]) return false;
  run.rerolls -= 1;
  run.offer[group] = offerGroup(run, group, catalog);
  return true;
}

// 報酬を受け取って次の層へ。picks: { pieces: セットの番号, relics: セットの番号（強敵・ボスだけ） }
export function takeReward(run, picks, catalog) {
  if (run.phase !== 'reward') return false;
  const set = (group) => run.offer[group]?.[picks[group]];
  if (!set('pieces') || (run.offer.relics && !set('relics'))) return false;
  add(run.pieces, set('pieces'));
  if (run.offer.relics) add(run.relics, set('relics'));
  const cleared = run.floor;
  run.offer = null;
  enterFloor(run, cleared + 1, catalog);
  run.phase = cleared === FRONT_FLOOR ? 'front' : 'floor';
  return true;
}

export function continueRun(run) {
  if (run.phase === 'front') run.phase = 'floor';
}

export function giveUp(run) {
  run.pending = null;
  run.phase = 'over';
}

// 挑戦が終わったときに得るポイント（30層・100層のボーナスは、勝ったときに別に足す）
export const finishPoints = (run) => gameOverPoints(run.phase === 'final' ? TOP_FLOOR : run.floor);

// ---- 保存 ----
const PHASES = new Set(['floor', 'reward', 'front', 'final', 'over']);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCounts = (obj, known) => isObj(obj) && Object.entries(obj).every(([id, n]) => known(id) && Number.isInteger(n) && n > 0);
const isSets = (sets, known) => Array.isArray(sets) && sets.length > 0 && sets.every((s) => Array.isArray(s) && s.every(known));

// 挑戦中のデータを確かめる。おかしなところがあれば null（その挑戦は続けられない）
export function normalizeRun(raw, catalog) {
  if (!isObj(raw) || raw.version !== 1 || !BOARDS[raw.board] || !PHASES.has(raw.phase)) return null;
  const piece = (id) => !!catalog.piece(id);
  const relic = (id) => !!catalog.relic(id);
  const ints = ['seed', 'floor', 'life', 'maxLife', 'rerolls', 'maxRerolls', 'rolls', 'losses', 'startFloor'];
  if (!ints.every((k) => Number.isInteger(raw[k]) && raw[k] >= 0)) return null;
  if (raw.floor < 1 || raw.floor > TOP_FLOOR || !isCounts(raw.pieces, piece) || !isCounts(raw.relics, relic)) return null;
  if (!isObj(raw.team) || raw.team.board !== raw.board || !Array.isArray(raw.team.slots)) return null;
  if (!isObj(raw.enemy) || validateTeam(raw.enemy, catalog, enemyRules).length) return null;
  if (raw.phase === 'reward' && !(isObj(raw.offer) && isSets(raw.offer.pieces, piece) && (raw.offer.relics === null || isSets(raw.offer.relics, relic)))) return null;
  if (raw.pending !== null && !(isObj(raw.pending) && Number.isInteger(raw.pending.seed) && isObj(raw.pending.team))) return null;
  return { ...raw, perks: { bossHeal: raw.perks?.bossHeal === true, strongRare: raw.perks?.strongRare === true } };
}

// localStorage の読み書き。meta: 引継ぎ、run: 挑戦中のデータ（なければ null）
export function createRogueStore(storage, catalog) {
  const read = (key) => {
    try {
      return JSON.parse(storage.getItem(key) ?? 'null');
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  return {
    loadMeta: () => normalizeMeta(read(ROGUE_META_KEY), catalog),
    saveMeta: (meta) => write(ROGUE_META_KEY, meta),
    loadRun: () => normalizeRun(read(ROGUE_RUN_KEY), catalog),
    saveRun: (run) => write(ROGUE_RUN_KEY, run),
  };
}

// 挑戦の結果を引継ぎに反映する（最高到達層・クリア回数・ポイント）
export function recordFloor(meta, run) {
  return { ...meta, best: Math.max(meta.best, run.floor) };
}
export function finishRun(meta, run) {
  const points = finishPoints(run);
  return {
    meta: {
      ...recordFloor(meta, run),
      points: meta.points + points,
      runs: meta.runs + 1,
      clears: { ...meta.clears, top: meta.clears.top + (run.phase === 'final' ? 1 : 0) },
    },
    points,
  };
}
export function addBonus(meta, run, bonus) {
  return {
    ...recordFloor(meta, run),
    points: meta.points + bonus,
    clears: { ...meta.clears, front: meta.clears.front + (run.floor === FRONT_FLOOR ? 1 : 0) },
  };
}
