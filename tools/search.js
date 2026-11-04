// 強いチーム探し（Node.js）。人間が作ったチームを与えなくても、ゼロから環境の上位チームを探す。
//
//   node tools/search.js --env v1 --minutes 30
//   node tools/search.js --start <フォルダ>        そのフォルダの *.team.json も出発点・相手に入れる
//   node tools/search.js --check <フォルダ>        最後に、そのフォルダのチームを見つけた環境と比べる（探索には使わない）
//   node tools/search.js --boards honeycomb       ボードを絞る（ほかのボードの最強に押されて見えない型を探す）
//
// しくみ（チームの数が多すぎて全部は試せないため）
//   1. 形の区切りごと（ボード・キャラの数・道具の数・主な種族）に、いちばん強いチームを1つずつ残す。
//      新しい形が弱いうちに捨てられないようにするため。
//   2. 強さは「リーグ」に対する得点で測る。リーグは見つけた強いチームの集まりで、相性表から
//      「どのチームをどの割合で使うのが最も負けにくいか」（ナッシュ均衡、nash.js）を出し、その割合で戦った得点を使う。
//      じゃんけんの関係でも、1つの数値に押し込まずに扱える。強いチームが見つかるたびにリーグに入れ、測り直す。
//   3. 最後に、環境に残ったチームの「すぐ近く」（1マス・2マスの変更、遺物の全組み合わせ）を全部試して仕上げる。
//   どの段階でも、必ず同じか弱くなるチームは試さない（search/prune.js）。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyEnvironment, findEnvironment } from '../src/data/environment.js';
import { BOARDS } from '../src/data/boards.js';
import { createCatalog } from '../src/core/catalog.js';
import { teamCost, validateTeam } from '../src/core/team.js';
import { createRng } from '../src/engine/rng.js';
import { exportTeamJson } from '../src/storage/teamJson.js';
import { loadTeams } from './meta.js';
import { solveNash } from './search/nash.js';
import { createPool } from './search/pool.js';
import { createSpace, descriptor, teamKey } from './search/space.js';
import { canonicalize } from './search/prune.js';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const envId = opt('env', undefined);
if (envId && !findEnvironment(envId)) throw new Error(`知らない環境です: ${envId}`);
const env = applyEnvironment(envId);
const O = {
  minutes: Number(opt('minutes', 20)), // 探索（1・2）の時間
  polishMinutes: Number(opt('polish-minutes', 15)), // 仕上げ（3）の時間
  workers: Number(opt('workers', Math.max(1, os.cpus().length - 1))),
  seeds: Number(opt('seeds', 8)), // 探索中の1組あたりのシード数（先後で2倍戦う）
  finalSeeds: Number(opt('final-seeds', 30)), // 最後の測り直しのシード数（探索とは別のシードを使う）
  batch: Number(opt('batch', 2000)),
  leagueEvery: Number(opt('league-every', 4)),
  leagueMax: Number(opt('league-max', 40)),
  seed: Number(opt('seed', 1)),
  out: opt('out', path.join('tools', 'search-out', env.id)),
  start: opt('start', null),
  check: opt('check', null),
  boards: opt('boards', Object.keys(BOARDS).join(',')).split(','), // 探すボード（例：honeycomb）
};

const catalog = createCatalog();
for (const b of O.boards) if (!BOARDS[b]) throw new Error(`知らないボードです: ${b}`);
const space = createSpace(catalog, { boards: O.boards });
const rng = createRng(O.seed);
const pool = createPool(env.id, O.workers);
const t0 = Date.now();
const elapsed = () => `${((Date.now() - t0) / 60000).toFixed(1)}分`;
const describe = (t) => `${BOARDS[t.board].name} コスト${teamCost(t, catalog)}/${BOARDS[t.board].costCap} | ${t.slots
  .slice().sort((x, y) => x.pos[0] - y.pos[0] || x.pos[1] - y.pos[1])
  .map((s) => `${s.pos.join(',')}:${catalog.piece(s.pieceId).name}`).join(' ')} | ${t.relics.map((id) => catalog.relic(id).name).join('・')}`;

function readTeams(dir) {
  return loadTeams(dir).filter((t) => {
    const errors = t.errors.length ? t.errors : validateTeam(t, catalog);
    if (errors.length) console.log(`× ${t.file}: ${errors.join(' / ')}`);
    return errors.length === 0;
  });
}

// ---- リーグ（相性表とナッシュ均衡） ----
const league = []; // { team, key, name }
let A = []; // A[i][j]: league[i] が league[j] と戦ったときの得点
let mix = { weights: [], values: [], exploit: 0 };
let opps = []; // 強さを測る相手 { team, w }
let mixVersion = 0;

async function addToLeague(teams) {
  const fresh = [];
  for (const t of teams) {
    const key = teamKey(t);
    if (league.some((l) => l.key === key) || fresh.some((f) => f.key === key)) continue;
    fresh.push({ team: t, key, name: t.name });
  }
  if (!fresh.length) return 0;
  const base = league.length;
  league.push(...fresh);
  const pairs = [];
  for (let i = base; i < league.length; i++) for (let j = 0; j < i; j++) pairs.push([league[i].team, league[j].team]);
  const results = await pool.pays(pairs, O.seeds, 1);
  A = league.map((_, i) => league.map((__, j) => (i === j ? 0.5 : A[i]?.[j])));
  let k = 0;
  for (let i = base; i < league.length; i++) for (let j = 0; j < i; j++) {
    A[i][j] = results[k++];
    A[j][i] = 1 - A[i][j];
  }
  return fresh.length;
}

// ナッシュ均衡を解き直し、強さを測る相手を決める。リーグが大きすぎたら、使われず得点も低いチームから外す
function updateMix() {
  mix = solveNash(A);
  while (league.length > O.leagueMax) {
    const drop = league.map((_, i) => i).filter((i) => mix.weights[i] === 0).sort((a, b) => mix.values[a] - mix.values[b])[0];
    if (drop === undefined) break;
    league.splice(drop, 1);
    A.splice(drop, 1);
    for (const row of A) row.splice(drop, 1);
    mix = solveNash(A);
  }
  // 均衡で使われるチーム＋使われないが得点の高いチーム4つ。割合は均衡8割・均等2割（均衡が偏りすぎないように）
  const order = league.map((_, i) => i).sort((a, b) => mix.values[b] - mix.values[a]);
  const chosen = [...order.filter((i) => mix.weights[i] > 0), ...order.filter((i) => mix.weights[i] === 0).slice(0, 4)];
  opps = chosen.map((i) => ({ team: league[i].team, w: 0.8 * mix.weights[i] + 0.2 / chosen.length }));
  mixVersion++;
}

async function fitness(teams) {
  if (!teams.length) return [];
  const pairs = teams.flatMap((t) => opps.map((o) => [t, o.team]));
  const results = await pool.pays(pairs, O.seeds, 1);
  return teams.map((_, i) => opps.reduce((s, o, j) => s + o.w * results[i * opps.length + j], 0));
}

// ---- 形の区切りごとの最強（アーカイブ） ----
const archive = new Map(); // 区切り → { team, fit, key, version }
const seen = new Map(); // key → mixVersion（同じ相手で同じチームを2度測らない）
let evaluated = 0;

async function offer(teams) {
  const fresh = [];
  for (const t of teams) {
    if (!t) continue;
    const key = teamKey(t);
    if (seen.get(key) === mixVersion) continue;
    seen.set(key, mixVersion);
    fresh.push({ team: t, key });
  }
  const fits = await fitness(fresh.map((f) => f.team));
  evaluated += fresh.length;
  fresh.forEach((f, i) => {
    const d = descriptor(f.team, catalog);
    const cur = archive.get(d);
    if (!cur || fits[i] > cur.fit) archive.set(d, { team: f.team, fit: fits[i], key: f.key });
  });
}

async function rescoreArchive() {
  const list = [...archive.values()];
  const fits = await fitness(list.map((e) => e.team));
  list.forEach((e, i) => { e.fit = fits[i]; seen.set(e.key, mixVersion); });
}

const topArchive = (n) => [...archive.entries()].sort((a, b) => b[1].fit - a[1].fit).slice(0, n);
let named = 0;
const withName = (t, tag) => ({ ...t, name: `${tag}${++named}` });

function printMix(title) {
  const support = league.map((l, i) => ({ l, w: mix.weights[i], v: mix.values[i] })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w);
  console.log(`  ${title} リーグ${league.length} 均衡: ${support.map((x) => `${x.l.name}(${Math.round(x.w * 100)}%)`).join(' ')}`);
}

// ---- すぐ近くを全部試す（探索中は1マスと遺物だけ、最後の仕上げでは2マスも） ----
async function polish(team, deadlineAt, { pairs: usePairs = true, quiet = false } = {}) {
  let cur = team;
  let [curFit] = await fitness([cur]);
  for (let round = 0; Date.now() < deadlineAt; round++) {
    let improved = false;
    for (const pairs of usePairs ? [false, true] : [false]) {
      if (Date.now() >= deadlineAt) break;
      const keys = new Set([teamKey(cur)]);
      const cands = [];
      for (const t of space.neighborhood(cur, { pairs })) {
        const k = teamKey(t);
        if (!keys.has(k)) { keys.add(k); cands.push(t); }
      }
      let best = null;
      for (let i = 0; i < cands.length && Date.now() < deadlineAt; i += 4000) {
        const part = cands.slice(i, i + 4000);
        const fits = await fitness(part);
        fits.forEach((f, j) => { if (f > curFit + 0.002 && (!best || f > best.fit)) best = { team: part[j], fit: f }; });
      }
      if (best) {
        // 元のチームにも負け越さないこと（別のシードで確かめる）
        const [h2h] = await pool.pays([[best.team, cur]], O.seeds * 2, 5000);
        if (h2h >= 0.5) {
          if (!quiet) console.log(`    ${pairs ? '2マス' : '1マス/遺物'} ${cands.length}通り → 得点${curFit.toFixed(3)}→${best.fit.toFixed(3)} 元に${Math.round(h2h * 100)}%`);
          cur = { ...best.team, name: cur.name };
          curFit = best.fit;
          improved = true;
          break;
        }
      }
      if (!quiet) console.log(`    ${pairs ? '2マス' : '1マス/遺物'} ${cands.length}通り 改善なし`);
    }
    if (!improved) break;
  }
  return cur;
}

// ---- 1・2. 探索 ----
const startTeams = O.start ? readTeams(O.start).map((t) => ({ ...canonicalize(t, catalog), name: t.name })) : [];
console.log(`環境 ${env.name}  ボード ${O.boards.join('・')}  ワーカー${O.workers}  探索${O.minutes}分＋仕上げ${O.polishMinutes}分  シード${O.seeds}`);
const init = [];
const initKeys = new Set();
for (let guard = 0; init.length < 3000 && guard < 100000; guard++) {
  const t = space.random(rng);
  if (t && !initKeys.has(teamKey(t))) { initKeys.add(teamKey(t)); init.push(t); }
}
await addToLeague([...startTeams, ...init.slice(0, 20).map((t) => withName(t, 'R'))]);
updateMix();
await offer([...startTeams, ...init]);
console.log(`[${elapsed()}] 初期 ${evaluated}チーム 区切り${archive.size}`);

const deadline = t0 + O.minutes * 60000;
for (let gen = 1; Date.now() < deadline; gen++) {
  const elites = [...archive.values()];
  const tour = () => {
    const a = elites[Math.floor(rng() * elites.length)];
    const b = elites[Math.floor(rng() * elites.length)];
    return a.fit >= b.fit ? a.team : b.team;
  };
  const others = elites.map((e) => e.team);
  const batch = [];
  for (let i = 0; i < O.batch; i++) batch.push(rng() < 0.1 ? space.random(rng) : space.mutate(tour(), rng, others));
  await offer(batch);
  if (gen % O.leagueEvery === 0) {
    // 上位を1マス・遺物の範囲で磨いてからリーグに入れる（変異だけでは届きにくい「あと1マス」を埋める）
    const tops = [];
    for (const [, e] of topArchive(8)) tops.push(await polish(e.team, Date.now() + 20000, { pairs: false, quiet: true }));
    await offer(tops);
    const added = await addToLeague(tops.map((t) => withName(t, 'S')));
    updateMix();
    await rescoreArchive();
    const [, best] = topArchive(1)[0];
    console.log(`[${elapsed()}] 世代${gen} 試した${evaluated} 区切り${archive.size} 追加${added} 最高${best.fit.toFixed(3)}（環境に対する得点、0.5で互角）`);
    printMix('');
  }
}

// ---- 3. 仕上げ ----
const polishDeadline = Date.now() + O.polishMinutes * 60000;
const polished = new Set();
while (Date.now() < polishDeadline) {
  const target = league.map((l, i) => ({ l, w: mix.weights[i] })).filter((x) => x.w > 0 && !polished.has(x.l.key)).sort((a, b) => b.w - a.w)[0];
  if (!target) break;
  polished.add(target.l.key);
  console.log(`[${elapsed()}] 仕上げ ${target.l.name}（${Math.round(target.w * 100)}%） ${describe(target.l.team)}`);
  const better = await polish(target.l.team, polishDeadline);
  if (teamKey(better) !== target.l.key) {
    await addToLeague([withName(better, 'P')]);
    updateMix();
    printMix('');
  }
}

// ---- 最後：別のシードで、リーグを測り直す ----
const n = league.length;
const finalPairs = [];
for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) finalPairs.push([league[i].team, league[j].team]);
const finalResults = await pool.pays(finalPairs, O.finalSeeds, 1001, 8);
const F = league.map(() => Array(n).fill(0.5));
let k = 0;
for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) { F[i][j] = finalResults[k++]; F[j][i] = 1 - F[i][j]; }
const final = solveNash(F);
const support = league.map((l, i) => ({ ...l, i, w: final.weights[i], v: final.values[i] })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w);
console.log(`\n[${elapsed()}] 結果（シード${O.finalSeeds}×先後、探索とは別のシード） 試したチーム ${evaluated}`);
console.log('環境で使われるチーム（割合・環境に対する得点）');
for (const s of support) console.log(`  ${s.name.padEnd(5)} ${String(Math.round(s.w * 100)).padStart(3)}%  ${s.v.toFixed(3)}  ${describe(s.team)}`);
console.log(`どのチームも環境に対して ${(0.5 + final.exploit).toFixed(3)} 以下（0.5に近いほど、環境が崩れにくい）`);
console.log('\n相性（行が列と戦ったときの得点×100）');
console.log('       ' + support.map((s) => s.name.padStart(6)).join(''));
for (const a of support) console.log(`  ${a.name.padEnd(5)}${support.map((b) => (a === b ? '     -' : String(Math.round(F[a.i][b.i] * 100)).padStart(6))).join('')}`);

fs.mkdirSync(O.out, { recursive: true });
for (const f of fs.readdirSync(O.out)) if (f.endsWith('.team.json')) fs.rmSync(path.join(O.out, f));
support.forEach((s, idx) => fs.writeFileSync(path.join(O.out, `${String(idx + 1).padStart(2, '0')}_${s.name}.team.json`), exportTeamJson({ ...s.team, name: s.name })));
fs.writeFileSync(path.join(O.out, 'summary.json'), JSON.stringify({
  env: env.id, options: O, evaluated,
  league: league.map((l, i) => ({ name: l.name, weight: final.weights[i], value: final.values[i], team: l.team })),
  archive: topArchive(40).map(([d, e]) => ({ descriptor: d, fit: e.fit, team: e.team })),
}, null, 1));
console.log(`\n保存: ${O.out}`);

// ---- 人間のチームと比べる ----
if (O.check) {
  const mine = readTeams(O.check);
  console.log(`\n比べるチーム（${O.check}）：環境に対する得点・入れたときの均衡での割合・環境の各チームとの得点`);
  const pairs = mine.flatMap((t) => league.map((l) => [t, l.team]));
  const res = await pool.pays(pairs, O.finalSeeds, 1001, 8);
  mine.forEach((t, a) => {
    const row = league.map((_, j) => res[a * n + j]);
    const value = row.reduce((s, x, j) => s + x * final.weights[j], 0);
    const G = [...F.map((r, i) => [...r, 1 - row[i]]), [...row, 0.5]];
    const w = solveNash(G).weights[n];
    console.log(`  ${t.name.padEnd(10)} ${value.toFixed(3)}  割合${String(Math.round(w * 100)).padStart(3)}%  ${support.map((s) => `${s.name}:${Math.round(row[s.i] * 100)}`).join(' ')}`);
  });
}
await pool.close();
