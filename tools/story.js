// ストーリーモードの難易度を測る（Node.js）。spec §14。
//
//   node tools/story.js               各対戦イベントについて、そこまでに使える駒・コストでランダムなチームを組み、相手との勝率を出す
//   node tools/story.js --teams 300   1イベントあたりのチーム数（各チームは相手と先攻・後攻で2戦）
//
// 続けて、クリア後の再戦（rematch。強い）を、すべての駒・コスト100%で組んだチームとの勝率で出す。
//
// 「最低限」はサイドイベントを1つもクリアしていないとき、「全部」はそこまでのサイドイベントを全部クリアしたとき。
// 上位10%：ランダムに組んだチームのうち、勝率の高い1割の平均（人がちゃんと組んだときの目安）。
import { pathToFileURL } from 'node:url';
import { applyEnvironment, MODE_ENV } from '../src/data/environment.js';
import { BOARDS } from '../src/data/boards.js';
import { RELICS } from '../src/data/relics.js';
import { createCatalog } from '../src/core/catalog.js';
import { randomTeam } from '../src/core/randomTeam.js';
import { teamCost, validateTeam } from '../src/core/team.js';
import { runBattle } from '../src/engine/battle.js';
import { createRng } from '../src/engine/rng.js';
import { storyCap, storyRules, storyStatus } from '../src/story/progress.js';
import { BATTLERS, STORY, STRENGTH } from '../src/story/script.js';

// そのイベントに挑むときにクリアしているイベント：{ min: メインだけ, max: 出てくるサイドも全部 }
export function clearedBefore(script, event) {
  const byId = new Map(script.events.map((e) => [e.id, e]));
  const needed = new Set();
  const walk = (id) => {
    if (needed.has(id)) return;
    needed.add(id);
    for (const r of byId.get(id)?.requires ?? []) walk(r);
  };
  for (const r of event.requires ?? []) walk(r);
  const min = [...needed];
  const max = [...min];
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of script.events) {
      if (e.kind !== 'side' || e.id === event.id || max.includes(e.id)) continue;
      if ((e.requires ?? []).every((r) => max.includes(r))) {
        max.push(e.id);
        grew = true;
      }
    }
  }
  return { min, max };
}

// 使える駒・コストでランダムなチームを組み、相手との勝率を測る
export function measure(opponent, status, { teams = 200, seed = 1 } = {}) {
  const catalog = createCatalog();
  const pieces = catalog.pieces().filter((p) => status.pieces.has(p.id));
  const relicPool = RELICS.filter((r) => status.relics.has(r.id));
  const rng = createRng(seed);
  const rules = storyRules(status);
  const boards = Object.keys(BOARDS);
  const rates = [];
  for (let i = 0; i < teams; i++) {
    const board = boards[i % boards.length];
    const team = randomTeam(board, pieces, rng, { costCap: storyCap(board, status.costRatio), relicPool });
    if (validateTeam(team, catalog, rules).length) continue;
    const s = Math.floor(rng() * 1e9);
    const a = runBattle(team, opponent, catalog, { seed: s });
    const b = runBattle(opponent, team, catalog, { seed: s });
    rates.push(((a.winner === 'a') + (b.winner === 'b') + 0.5 * ((a.winner === 'draw') + (b.winner === 'draw'))) / 2);
  }
  rates.sort((x, y) => y - x);
  const avg = (list) => list.reduce((s, x) => s + x, 0) / Math.max(1, list.length);
  return { mean: avg(rates), top: avg(rates.slice(0, Math.max(1, Math.round(rates.length / 10)))), n: rates.length };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? Number(args[i + 1]) : fallback;
  };
  applyEnvironment(MODE_ENV.id);
  const catalog = createCatalog();
  const pct = (x) => `${Math.round(x * 100)}%`.padStart(4);
  console.log('イベント                     相手（強さ）            相手のコスト/自分の上限   最低限: 平均 上位10%   全部: 平均 上位10%');
  for (const event of STORY.events.filter((e) => e.battle)) {
    const battler = BATTLERS[event.battle.opponent];
    const { min, max } = clearedBefore(STORY, event);
    const lo = storyStatus(STORY, min);
    const hi = storyStatus(STORY, max);
    const cap = storyCap(battler.team.board, lo.costRatio);
    const a = measure(battler.team, lo, { teams: opt('teams', 200) });
    const b = measure(battler.team, hi, { teams: opt('teams', 200) });
    const label = `${event.title}`.padEnd(14, '　');
    const who = `${battler.name}（${STRENGTH[battler.strength]}）`.padEnd(10, '　');
    const errors = validateTeam(battler.team, catalog);
    console.log(`${label} ${who} ${String(teamCost(battler.team, catalog)).padStart(3)}/${String(cap).padEnd(3)} (${BOARDS[battler.team.board].name})`
      + `   ${pct(a.mean)} ${pct(a.top)}        ${pct(b.mean)} ${pct(b.top)}${errors.length ? `  ×${errors.join(' ')}` : ''}`);
  }

  const finished = storyStatus(STORY, STORY.events.map((e) => e.id));
  console.log('\nクリア後の再戦              チーム                  相手のコスト/上限         平均 上位10%');
  for (const battler of Object.values(BATTLERS).filter((b) => !b.noRematch)) {
    const team = battler.rematch ?? battler.team;
    const r = measure(team, finished, { teams: opt('teams', 200) });
    const errors = validateTeam(team, catalog);
    console.log(`${battler.name.padEnd(14, '　')} ${team.name.padEnd(10, '　')} ${String(teamCost(team, catalog)).padStart(3)}/${String(storyCap(team.board, 1)).padEnd(3)} (${BOARDS[team.board].name})`
      + `   ${pct(r.mean)} ${pct(r.top)}${errors.length ? `  ×${errors.join(' ')}` : ''}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
