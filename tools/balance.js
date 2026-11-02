// バランス調整ツール：大量に対戦させて、決着時間と勝率の偏りを出す（Node.js）。
//
//   node tools/balance.js                    ランダムなチーム同士を3000戦（既定）
//   node tools/balance.js --matches 10000    戦数を変える
//   node tools/balance.js --seed 7           乱数の種を変える（同じ種なら同じ結果）
//   node tools/balance.js --mode presets     プリセット同士の総当たり（各組み合わせ --matches 回）
//   node tools/balance.js --top 12           駒ごとの表に出す件数
//   node tools/balance.js --brief 1          要点だけを1行で出す
//   node tools/balance.js --set damageScale=0.6 --set cost.def=40
//                                            src/data/balance.js の値を一時的に変えて試す（何回でも指定できる）
//   node tools/balance.js --env v1           過去の環境（バージョン）で測る（省略すると最新の環境）
import { pathToFileURL } from 'node:url';
import { setBalance } from '../src/data/balance.js';
import { BOARDS } from '../src/data/boards.js';
import { applyEnvironment, findEnvironment } from '../src/data/environment.js';
import { PRESET_TEAMS } from '../src/data/presetTeams.js';
import { RELICS } from '../src/data/relics.js';
import { TRIBES } from '../src/data/tribes.js';
import { createCatalog } from '../src/core/catalog.js';
import { randomTeam } from '../src/core/randomTeam.js';
import { activeSynergies, teamCost, tribeCounts } from '../src/core/team.js';
import { runBattle } from '../src/engine/battle.js';
import { createRng } from '../src/engine/rng.js';

// 目標（spec §7 バランス目標）
export const TARGET = { meanTime: [8, 12], pieceWinRate: [0.4, 0.6], boardWinRate: [0.45, 0.55] };

const BOARD_IDS = Object.keys(BOARDS);

function describe(team, catalog) {
  return {
    team,
    board: team.board,
    cost: teamCost(team, catalog),
    pieces: [...new Set(team.slots.map((s) => s.pieceId))],
    relics: team.relics,
    tribes: tribeCounts(team, catalog),
    synergies: activeSynergies(team, catalog),
  };
}

// 対戦を回して、1戦ごとの記録を返す。
export function simulate({ matches = 3000, seed = 1, mode = 'random' } = {}) {
  const catalog = createCatalog();
  const rng = createRng(seed);
  const rows = [];
  const play = (a, b, battleSeed) => {
    const result = runBattle(a, b, catalog, { seed: battleSeed });
    rows.push({ a: describe(a, catalog), b: describe(b, catalog), result });
  };

  if (mode === 'presets') {
    for (const a of PRESET_TEAMS) {
      for (const b of PRESET_TEAMS) {
        if (a !== b) for (let i = 0; i < matches; i++) play(a, b, i + 1);
      }
    }
  } else {
    const pieces = catalog.pieces();
    const pickBoard = () => BOARD_IDS[Math.floor(rng() * BOARD_IDS.length)];
    for (let i = 0; i < matches; i++) {
      play(randomTeam(pickBoard(), pieces, rng), randomTeam(pickBoard(), pieces, rng), Math.floor(rng() * 2 ** 31));
    }
  }
  return { rows, catalog };
}

const score = (r) => (r.games ? (r.win + 0.5 * r.draw) / r.games : 0);
const tally = () => ({ games: 0, win: 0, draw: 0, cost: 0 });

function add(map, key, side, winner, cost) {
  const row = map.get(key) ?? tally();
  row.games += 1;
  row.cost += cost;
  if (winner === 'draw') row.draw += 1;
  else if (winner === side) row.win += 1;
  map.set(key, row);
}

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

// 集計。チーム側（a/b）の区別は付けず、「そのチームの勝率」として数える。
export function summarize(rows) {
  const times = rows.map((r) => r.result.time).sort((x, y) => x - y);
  const reasons = { ko: 0, simultaneous: 0, timeout: 0 };
  let draws = 0;
  let dealt = 0;
  let poison = 0;
  const boards = new Map();
  const pieces = new Map();
  const relics = new Map();
  const tribes = new Map();

  for (const { a, b, result } of rows) {
    reasons[result.reason] += 1;
    if (result.winner === 'draw') draws += 1;
    dealt += result.dealt.a + result.dealt.b;
    poison += result.poisonDealt.a + result.poisonDealt.b;
    for (const [side, t] of [['a', a], ['b', b]]) {
      add(boards, t.board, side, result.winner, t.cost);
      for (const id of t.pieces) add(pieces, id, side, result.winner, t.cost);
      for (const id of t.relics) add(relics, id, side, result.winner, t.cost);
      for (const s of t.synergies) add(tribes, `${s.tribe}:${s.tier}`, side, result.winner, t.cost);
    }
  }

  return {
    matches: rows.length,
    time: {
      mean: times.reduce((s, x) => s + x, 0) / times.length,
      p10: quantile(times, 0.1),
      median: quantile(times, 0.5),
      p90: quantile(times, 0.9),
    },
    reasons,
    draws,
    poisonShare: dealt ? poison / dealt : 0,
    boards,
    pieces,
    relics,
    tribes,
  };
}

// ---- 表示 ----
const pct = (x) => `${(100 * x).toFixed(1)}%`;
const sec = (x) => `${x.toFixed(1)}秒`;

function table(title, map, label, { top = Infinity, sortBy = 'rate' } = {}) {
  const rows = [...map].map(([key, r]) => ({ key, ...r, rate: score(r) }));
  rows.sort(sortBy === 'rate' ? (x, y) => y.rate - x.rate : (x, y) => String(x.key).localeCompare(String(y.key)));
  const lines = rows.slice(0, top).map((r) => {
    const flag = r.rate < TARGET.pieceWinRate[0] ? ' ▼弱い' : r.rate > TARGET.pieceWinRate[1] ? ' ▲強い' : '';
    return `  ${String(label(r.key)).padEnd(14, '　')}${pct(r.rate).padStart(7)}   ${String(r.games).padStart(6)}戦  平均コスト${(r.cost / r.games).toFixed(1)}${flag}`;
  });
  return [title, ...lines].join('\n');
}

export function report(summary, catalog, { top = 12 } = {}) {
  const s = summary;
  const [lo, hi] = TARGET.meanTime;
  const timeNote = s.time.mean < lo ? '（短い）' : s.time.mean > hi ? '（長い）' : '（目標内）';
  const nameOf = (id) => catalog.piece(id)?.name ?? id;
  const lines = [
    `== 決着時間（${s.matches}戦） ==`,
    `  平均 ${sec(s.time.mean)} ${timeNote}  目標 ${lo}〜${hi}秒`,
    `  10%点 ${sec(s.time.p10)} ／ 中央値 ${sec(s.time.median)} ／ 90%点 ${sec(s.time.p90)}`,
    `  決着の理由: KO ${pct(s.reasons.ko / s.matches)} ／ 同時 ${pct(s.reasons.simultaneous / s.matches)} ／ 時間切れ ${pct(s.reasons.timeout / s.matches)} ／ 引き分け ${pct(s.draws / s.matches)}`,
    `  与ダメージのうち毒 ${pct(s.poisonShare)}`,
    '',
    table('== ボード別の勝率 ==', s.boards, (id) => BOARDS[id].name, { sortBy: 'key' }),
    '',
    table('== 種族シナジー別の勝率（体数の段階） ==', s.tribes, (k) => `${TRIBES[k.split(':')[0]].name} ${k.split(':')[1]}体〜`, { sortBy: 'key' }),
    '',
    table(`== 駒別の勝率（その駒を使ったチーム。上位${top}） ==`, s.pieces, nameOf, { top }),
    '',
    table(`== 駒別の勝率（下位${top}） ==`, new Map([...s.pieces].sort((x, y) => score(x[1]) - score(y[1])).slice(0, top)), nameOf, { sortBy: 'none' }),
    '',
    table('== 遺物別の勝率 ==', s.relics, (id) => RELICS.find((r) => r.id === id)?.name ?? id),
  ];
  return lines.join('\n');
}

// 目標から外れている項目の一覧（調整の優先順位を決める用）
export function problems(summary) {
  const out = [];
  const [lo, hi] = TARGET.meanTime;
  if (summary.time.mean < lo || summary.time.mean > hi) out.push(`平均決着時間 ${summary.time.mean.toFixed(1)}秒（目標 ${lo}〜${hi}秒）`);
  for (const [id, r] of summary.boards) {
    const rate = score(r);
    if (rate < TARGET.boardWinRate[0] || rate > TARGET.boardWinRate[1]) out.push(`ボード ${BOARDS[id].name} の勝率 ${pct(rate)}`);
  }
  for (const [id, r] of summary.pieces) {
    const rate = score(r);
    if (r.games >= 100 && (rate < TARGET.pieceWinRate[0] || rate > TARGET.pieceWinRate[1])) out.push(`駒 ${id} の勝率 ${pct(rate)}`);
  }
  return out;
}

function parseSet(text) {
  const [path, raw] = text.split('=');
  return [path, raw === 'null' ? null : Number(raw)];
}

function parseArgs(argv) {
  const args = { matches: undefined, seed: 1, mode: 'random', top: 12 };
  // 環境は --set より先に切り替える（切り替えるとバランス値も入れ替わるため）
  const envAt = argv.indexOf('--env');
  if (envAt >= 0) {
    if (!findEnvironment(argv[envAt + 1])) throw new Error(`知らない環境です: ${argv[envAt + 1]}`);
    applyEnvironment(argv[envAt + 1]);
  }
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    if (key === 'mode') args.mode = value;
    else if (['matches', 'seed', 'top'].includes(key)) args[key] = Number(value);
    else if (key === 'brief') args.brief = value !== '0';
    else if (key === 'env') continue; // 上で切り替え済み
    else if (key === 'set') setBalance(...parseSet(value)); // --set damageScale=0.6 のように、設定を一時的に変えて試す
    else throw new Error(`知らないオプションです: ${argv[i]}`);
  }
  args.matches ??= args.mode === 'presets' ? 20 : 3000;
  return args;
}

// 試行を重ねるとき用の1行表示
export function brief(summary) {
  const boardRates = [...summary.boards].map(([id, r]) => `${BOARDS[id].name}${(100 * score(r)).toFixed(0)}%`).join(' ');
  const pieceRates = [...summary.pieces].map(([, r]) => score(r));
  return `平均${summary.time.mean.toFixed(1)}秒(10%点${summary.time.p10.toFixed(1)}〜90%点${summary.time.p90.toFixed(1)}) `
    + `毒${(100 * summary.poisonShare).toFixed(0)}% 時間切れ${(100 * summary.reasons.timeout / summary.matches).toFixed(1)}% | ${boardRates} | `
    + `駒の勝率 ${(100 * Math.min(...pieceRates)).toFixed(0)}〜${(100 * Math.max(...pieceRates)).toFixed(0)}% | 要調整${problems(summary).length}件`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const { rows, catalog } = simulate(args);
  const summary = summarize(rows);
  if (args.brief) {
    console.log(brief(summary));
    process.exit(0);
  }
  console.log(report(summary, catalog, args));
  const list = problems(summary);
  console.log(`\n== 目標から外れている項目 ==\n${list.length ? list.map((p) => `  ・${p}`).join('\n') : '  なし'}`);
}
