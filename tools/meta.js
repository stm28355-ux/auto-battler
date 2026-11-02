// 環境の上位チームの総当たり表を出す（Node.js）。調整のたびに、型どうしの相性（3すくみ）が崩れていないか確かめる。
//
//   node tools/meta.js                          最新の環境で tools/meta-teams/<環境ID>/ のチームを総当たり
//   node tools/meta.js --env v1                 過去の環境で測る
//   node tools/meta.js --dir tools/meta-teams/v1 チームのフォルダを指定する
//   node tools/meta.js --matches 40             1組あたりの対戦数（先攻・後攻を入れ替えて2倍戦う）
//
// チームは「チームのJSON」（チーム編成の「ファイルに書き出す」で作るもの）を *.team.json で置く。
// ルールに合わないチーム（コスト超過・知らない駒など）は理由を出して外す。
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BOARDS } from '../src/data/boards.js';
import { applyEnvironment, findEnvironment } from '../src/data/environment.js';
import { createCatalog } from '../src/core/catalog.js';
import { teamCost, validateTeam } from '../src/core/team.js';
import { runBattle } from '../src/engine/battle.js';
import { parseTeamJson } from '../src/storage/teamJson.js';

export function loadTeams(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.team.json'))
    .sort()
    .map((f) => {
      const { team, errors } = parseTeamJson(readFileSync(path.join(dir, f), 'utf8'));
      return { file: f, ...team, errors };
    });
}

// 総当たり。{ teams, rates[i][j] (iがjに勝つ割合), times[i][j] }
export function roundRobin(teams, catalog, matches = 40) {
  const n = teams.length;
  const rates = Array.from({ length: n }, () => Array(n).fill(null));
  const times = Array.from({ length: n }, () => Array(n).fill(null));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let win = 0;
      let time = 0;
      for (let s = 1; s <= matches; s++) {
        const r1 = runBattle(teams[i], teams[j], catalog, { seed: s });
        const r2 = runBattle(teams[j], teams[i], catalog, { seed: s });
        win += (r1.winner === 'a') + (r2.winner === 'b') + 0.5 * ((r1.winner === 'draw') + (r2.winner === 'draw'));
        time += r1.time + r2.time;
      }
      rates[i][j] = win / (2 * matches);
      times[i][j] = time / (2 * matches);
    }
  }
  return { rates, times };
}

const pct = (x) => `${Math.round(x * 100)}%`;

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : fallback;
  };
  const envId = opt('env', undefined);
  if (envId && !findEnvironment(envId)) throw new Error(`知らない環境です: ${envId}`);
  const env = applyEnvironment(envId);
  const dir = opt('dir', path.join('tools', 'meta-teams', env.id));
  const matches = Number(opt('matches', 40));

  const catalog = createCatalog();
  const teams = [];
  for (const t of loadTeams(dir)) {
    const errors = t.errors.length ? t.errors : validateTeam(t, catalog);
    if (errors.length) console.log(`× ${t.file}: ${errors.join(' / ')}`);
    else teams.push(t);
  }
  if (teams.length < 2) {
    console.log('総当たりにはチームが2つ以上必要です');
    return;
  }
  console.log(`環境 ${env.name}（${dir}）  1組 ${matches * 2}戦\n`);
  teams.forEach((t, i) => {
    console.log(`  #${i + 1} ${t.name}：${BOARDS[t.board].name} コスト${teamCost(t, catalog)}/${BOARDS[t.board].costCap}`);
  });
  const { rates, times } = roundRobin(teams, catalog, matches);
  // 行のチームが、列のチームに勝つ割合
  console.log(`\n     ${teams.map((_, i) => `#${i + 1}`.padStart(5)).join('')}  平均`);
  teams.forEach((t, i) => {
    const cells = rates[i].map((r) => (r === null ? '    -' : pct(r).padStart(5)));
    const others = rates[i].filter((r) => r !== null);
    const avg = others.reduce((a, b) => a + b, 0) / others.length;
    console.log(`  #${String(i + 1).padEnd(2)}${cells.join('')}  ${pct(avg).padStart(4)}  ${t.name}`);
  });
  const all = times.flat().filter((x) => x !== null);
  console.log(`\n平均決着時間 ${(all.reduce((a, b) => a + b, 0) / all.length).toFixed(1)}秒`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
