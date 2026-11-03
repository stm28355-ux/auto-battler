import { escapeHtml } from './format.js';

// 対戦結果の内訳：駒（マス）ごとに、与えたダメージ（攻撃・毒・呪いで増えた分）・その割合・攻撃を受けた量・回復量を、
// 表と横棒のグラフで出す。result.stats は戦闘エンジンが log: true のときに集める（src/engine/battle.js）。
//   HPはチームで共有なので、毒と呪いで受けたダメージは駒ごとではなく、チーム全体の値として出す。

const SIDE_NAMES = { a: 'A', b: 'B' };
const num = (x) => Math.round(x).toLocaleString();
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const total = (s) => s.attack + s.poison + s.curse;

function label(src, catalog) {
  if (src.kind === 'synergy') return '⚙️ 機械の再生<small class="muted">（種族ボーナス）</small>';
  const thing = src.kind === 'relic' ? catalog.relic(src.id) : catalog.piece(src.id);
  if (!thing) return escapeHtml(src.id);
  const where = src.pos ? `<small class="muted">(${src.pos.join(',')})</small>` : '<small class="muted">（遺物）</small>';
  return `${escapeHtml(thing.icon)} ${escapeHtml(thing.name)} ${where}`;
}

// 横棒。parts: [[値, クラス], ...]、max: 棒の長さの基準
const bar = (parts, max) => `<div class="stat-bar">${parts
  .filter(([v]) => v > 0)
  .map(([v, cls]) => `<span class="${cls}" style="width:${max > 0 ? (v / max) * 100 : 0}%"></span>`).join('')}</div>`;

export function battleStatsHtml(result, teams, catalog) {
  const stats = result?.stats;
  if (!stats) return '';
  const all = Object.values(stats).flatMap((s) => s.sources);
  const maxDealt = Math.max(0, ...all.map(total));
  const maxTaken = Math.max(0, ...all.map((s) => s.taken));
  const maxHeal = Math.max(0, ...all.map((s) => s.heal));

  const side = (key) => {
    const st = stats[key];
    const dealt = st.sources.reduce((sum, s) => sum + total(s), 0);
    const heal = st.sources.reduce((sum, s) => sum + s.heal, 0);
    const taken = st.sources.reduce((sum, s) => sum + s.taken, 0);
    // 何もしていない遺物・道具の行は出さない（駒はいつも出す）
    const rows = st.sources
      .filter((s) => (s.kind === 'piece' && catalog.piece(s.id)?.kind === 'character') || total(s) + s.taken + s.heal > 0)
      .sort((x, y) => total(y) - total(x) || y.taken - x.taken || y.heal - x.heal)
      .map((s) => `<tr>
        <td class="stat-name">${label(s, catalog)}</td>
        <td class="stat-num">${num(total(s))}<small class="muted">${s.poison > 0 || s.curse > 0 ? `<br>攻${num(s.attack)}・毒${num(s.poison)}${s.curse > 0 ? `・呪${num(s.curse)}` : ''}` : ''}</small></td>
        <td class="stat-num">${dealt > 0 ? pct(total(s) / dealt) : '—'}</td>
        <td class="stat-graph">${bar([[s.attack, 'seg-atk'], [s.poison, 'seg-poison'], [s.curse, 'seg-curse']], maxDealt)}</td>
        <td class="stat-num">${num(s.taken)}</td>
        <td class="stat-graph">${bar([[s.taken, 'seg-taken']], maxTaken)}</td>
        <td class="stat-num">${num(s.heal)}</td>
        <td class="stat-graph">${bar([[s.heal, 'seg-heal']], maxHeal)}</td>
      </tr>`).join('');
    const poisonDealt = st.sources.reduce((sum, s) => sum + s.poison, 0);
    return `<section class="stat-side">
      <h4>チーム${SIDE_NAMES[key]}: ${escapeHtml(teams[key].name)}</h4>
      <div class="table-wrap"><table class="stat-table">
        <thead><tr><th>駒</th><th>与ダメージ</th><th>割合</th><th></th><th>攻撃を受けた</th><th></th><th>回復</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>合計</td><td class="stat-num">${num(dealt)}</td><td class="stat-num">${dealt > 0 ? '100%' : '—'}</td><td class="muted">うち毒 ${num(poisonDealt)}（${dealt > 0 ? pct(poisonDealt / dealt) : '—'}）</td>
          <td class="stat-num">${num(taken)}</td><td class="muted">ほかに毒 ${num(st.poisonTaken)}${st.curseTaken > 0 ? `・呪い ${num(st.curseTaken)}` : ''}（チーム全体）</td>
          <td class="stat-num">${num(heal)}</td><td></td></tr></tfoot>
      </table></div>
    </section>`;
  };

  return `<h3>ダメージの内訳</h3>
    <p class="muted stat-legend"><span class="seg-atk"></span>攻撃 <span class="seg-poison"></span>毒 <span class="seg-curse"></span>呪いで増えた分 <span class="seg-taken"></span>攻撃を受けた <span class="seg-heal"></span>回復
      ／ 割合はチームの与ダメージ全体に占める割合。攻撃を受けるのは各行の前線の駒。毒と呪いのダメージはチームのHPから引かれる。回復は最大HPを超えた分を数えない。</p>
    ${side('a')}${side('b')}`;
}
