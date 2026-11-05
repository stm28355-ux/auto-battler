// 見つけたチームに、中身が分かる名前をつける：「ボード_主な種族_主力のキャラ×数_戦術」
//   例）スクエア_機械_ゴーレム4_耐久・毒
// 戦術は、駒と遺物の効果と、目立つ能力値（HP500以上・防御25以上の道具は耐久、攻撃60以上は火力）を数えて、
// 目安の数を超えたものを多い順に2つまで（どれも超えなければ「バランス」）。
import fs from 'node:fs';
import path from 'node:path';
import { BOARDS } from '../../src/data/boards.js';
import { TRIBES } from '../../src/data/tribes.js';
import { MAX_NAME } from '../../src/storage/teamJson.js';

// 戦術ごとの目安の数（これ以上あれば、その戦術のチームとみなす）
const TACTICS = [
  { name: '毒', need: 2 },
  { name: '麻痺', need: 2 },
  { name: '呪い', need: 2 },
  { name: '攻撃強化', need: 3 },
  { name: '速度', need: 3 },
  { name: '貫通', need: 3 },
  { name: '回復', need: 2 },
  { name: '耐久', need: 4 },
  { name: '火力', need: 2 },
];

// 1つの効果が、どの戦術に数えられるか
function tacticOf(e) {
  if (e.type === 'poison' || (e.type === 'pulse' && e.status === 'poison') || e.type === 'poisonBonus') return '毒';
  if (e.type === 'paralyze' || e.type === 'paralyzeBonus') return '麻痺';
  if (e.type === 'curse' || (e.type === 'pulse' && e.status === 'curse')) return '呪い';
  if (e.type === 'pierce') return '貫通';
  if (e.type === 'heal') return '回復';
  if (['teamBuff', 'rowBuff', 'adjBuff', 'statBuff', 'fullRowBuff'].includes(e.type)) {
    if (e.stat === 'atk') return '攻撃強化';
    if (e.stat === 'spd') return '速度';
    if (e.stat === 'hp' || e.stat === 'def') return '耐久';
  }
  return null;
}

export function teamLabel(team, catalog) {
  const pieces = team.slots.map((s) => catalog.piece(s.pieceId));
  const chars = pieces.filter((p) => p.kind === 'character');

  // 主な種族：半分以上なら、その種族。そうでなければ「混成」
  const tribes = new Map();
  for (const p of chars) tribes.set(p.tribe, (tribes.get(p.tribe) ?? 0) + 1);
  const [tribe, nTribe] = [...tribes].sort((a, b) => b[1] - a[1])[0] ?? ['none', 0];
  const main = nTribe * 2 >= chars.length && TRIBES[tribe] ? TRIBES[tribe].name : '混成';

  // 主力：いちばん多いキャラ（同じ数なら HP×攻撃 の大きいほう）
  const counts = new Map();
  for (const p of chars) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
  const ace = [...counts].map(([id, n]) => ({ p: catalog.piece(id), n })).sort((a, b) => b.n - a.n || b.p.hp * b.p.atk - a.p.hp * a.p.atk)[0];
  const aceText = ace ? `${ace.p.name}${ace.n > 1 ? ace.n : ''}` : 'キャラなし';

  // 戦術：駒と遺物の効果を数える
  const score = new Map();
  const effects = [...pieces.flatMap((p) => p.effects ?? []), ...team.relics.flatMap((id) => catalog.relic(id).effects ?? [])];
  for (const e of effects) {
    const t = tacticOf(e);
    if (t) score.set(t, (score.get(t) ?? 0) + 1);
  }
  const add = (t) => score.set(t, (score.get(t) ?? 0) + 1);
  for (const p of pieces) {
    if (p.kind === 'character' && p.hp >= 500) add('耐久');
    if (p.kind === 'item' && p.def >= 25) add('耐久');
    if (p.atk >= 60) add('火力');
  }
  const tactics = TACTICS
    .map((t) => ({ name: t.name, r: (score.get(t.name) ?? 0) / t.need }))
    .filter((t) => t.r >= 1)
    .sort((a, b) => b.r - a.r)
    .slice(0, 2)
    .map((t) => t.name);

  return [BOARDS[team.board].name, main, aceText, tactics.length ? tactics.join('・') : 'バランス'].join('_');
}

// 環境で使われるチームを保存する。ファイル名は「順位_割合_名前_番号」、あわせて 一覧.txt に中身を書く。
// 番号：S は探索中に見つかってリーグに入ったチーム、P は最後の仕上げで磨いたチーム、R は最初のランダムなチーム。
// 数字は見つけた順の通し番号（同じ名前のチームを見分けるため）。ゲームに読み込むときのチーム名は、長すぎれば後ろを削る（番号は残す）。人間のチームを --start で入れた場合は、そのチームの名前のまま。
export function writeTeams(dir, rows, catalog, { exportTeamJson, describe }) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.team.json')) fs.rmSync(path.join(dir, f));
  const lines = ['環境で使われるチーム（順位・均衡での割合・環境に対する得点 0.5で互角・名前・番号）', ''];
  rows.forEach((r, idx) => {
    const label = teamLabel(r.team, catalog);
    const pct = `${Math.round(r.w * 100)}%`;
    const file = `${String(idx + 1).padStart(2, '0')}_${pct}_${label}_${r.name}.team.json`;
    fs.writeFileSync(path.join(dir, file), exportTeamJson({ ...r.team, name: `${label.slice(0, MAX_NAME - r.name.length - 1)}_${r.name}` }));
    lines.push(`${String(idx + 1).padStart(2, '0')}  ${pct.padStart(4)}  ${r.v.toFixed(3)}  ${label}  ${r.name}`, `      ${describe(r.team)}`);
  });
  lines.push('', '名前：ボード_主な種族（半分以上がその種族。そうでなければ混成）_いちばん多いキャラと数_戦術（効果と目立つ能力値から多い順に2つ）');
  lines.push('番号：S＝探索中に見つかったチーム、P＝最後の仕上げで磨いたチーム、R＝最初のランダムなチーム。数字は見つけた順の通し番号');
  fs.writeFileSync(path.join(dir, '一覧.txt'), lines.join('\n') + '\n');
}
