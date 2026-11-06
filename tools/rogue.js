// ローグライトモードの難易度を測る（Node.js）。spec §15。
//
//   node tools/rogue.js              引継ぎの段階ごとに、自動で登るプレイヤーで挑戦し、到達した層を出す
//   node tools/rogue.js --runs 200   段階ごとの挑戦回数
//
// 自動のプレイヤー：報酬はコストの合計が高いセット（遺物は1つ目）を取り、毎層おまかせで組み直す。
// 負けたら同じチームで再挑戦する。人が考えて組むより弱いので、ここで登れる層は下限の目安。
import { pathToFileURL } from 'node:url';
import { applyEnvironment, MODE_ENV } from '../src/data/environment.js';
import { BOARDS } from '../src/data/boards.js';
import { createCatalog } from '../src/core/catalog.js';
import { pieceCost } from '../src/core/cost.js';
import { runBattle } from '../src/engine/battle.js';
import { autoTeam } from '../src/rogue/auto.js';
import { defaultMeta } from '../src/rogue/meta.js';
import { battleTeam, continueRun, hashSeed, loseFloor, startRun, takeReward, winFloor } from '../src/rogue/run.js';

// 引継ぎの段階（ポイントの目安）
export const PRESETS = {
  初期: (m) => m,
  ライフ6: (m) => ({ ...m, alloc: { ...m.alloc, life: 3, reroll: 2 } }),
  強化: (m) => ({ ...m, alloc: { ...m.alloc, life: 7, reroll: 5, pieces: { ...m.alloc.pieces, c_knight: 3, c_lion: 2, c_paladin: 2, i_blade: 2 }, relics: { r_amulet: 3, r_whetstone: 3 }, perks: { bossHeal: true, strongRare: true } } }),
};

export function botRun(meta, seed, catalog) {
  const boards = Object.keys(BOARDS);
  const run = startRun(meta, { board: boards[seed % boards.length], seed }, catalog);
  const value = (set) => set.reduce((s, id) => s + pieceCost(catalog.piece(id)), 0);
  let battles = 0;
  while (run.phase !== 'over' && run.phase !== 'final') {
    if (run.phase === 'front') continueRun(run);
    else if (run.phase === 'reward') {
      const best = run.offer.pieces.reduce((bi, set, i, all) => (value(set) > value(all[bi]) ? i : bi), 0);
      takeReward(run, { pieces: best, relics: 0 }, catalog);
    } else {
      run.team = autoTeam(run.board, run.pieces, catalog);
      const r = runBattle(battleTeam(run), run.enemy, catalog, { seed: hashSeed(seed, run.floor, run.losses) });
      battles += 1;
      if (r.winner === 'a') winFloor(run, catalog);
      else loseFloor(run);
    }
  }
  return { floor: run.phase === 'final' ? 101 : run.floor, battles };
}

export function measure(meta, catalog, { runs = 100, seed = 1 } = {}) {
  const floors = [];
  for (let i = 0; i < runs; i++) floors.push(botRun(meta, hashSeed(seed, i), catalog).floor);
  floors.sort((a, b) => a - b);
  const reach = (f) => floors.filter((x) => x >= f).length / floors.length;
  return { floors, median: floors[Math.floor(floors.length / 2)], mean: floors.reduce((s, x) => s + x, 0) / floors.length, reach };
}

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--runs');
  const runs = i >= 0 ? Number(args[i + 1]) : 100;
  applyEnvironment(MODE_ENV.id);
  const catalog = createCatalog();
  const pct = (x) => `${Math.round(x * 100)}%`.padStart(5);
  console.log('引継ぎ      平均  中央   10層  20層  30層  50層 100層');
  for (const [name, f] of Object.entries(PRESETS)) {
    const r = measure(f(defaultMeta()), catalog, { runs });
    console.log(`${name.padEnd(8, '　')} ${r.mean.toFixed(1).padStart(5)} ${String(r.median).padStart(4)} ${[10, 20, 30, 50, 101].map((x) => pct(r.reach(x))).join(' ')}`);
    if (args.includes('--hist')) {
      const h = new Map();
      for (const x of r.floors) h.set(x, (h.get(x) ?? 0) + 1);
      console.log('  負けた層:', [...h].map(([f, n]) => `${f}:${n}`).join(' '));
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
