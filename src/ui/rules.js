import { BALANCE } from '../data/balance.js';
import { BOARDS } from '../data/boards.js';
import { PARALYZE_TARGETS } from '../data/effects.js';
import { PRESET_TEAMS, TIERS } from '../data/presetTeams.js';
import { TRIBES } from '../data/tribes.js';
import { MAX_EFFECTS } from '../core/piece.js';
import { PENTAGRAM_FOLD } from '../core/rows.js';
import { MAX_RELICS } from '../core/team.js';
import { DT, MAX_STEPS } from '../engine/battle.js';
import { renderBoard } from './boardView.js';
import { $, tribeTag } from './format.js';

// 「ルール」：遊び方の説明。数値はデータから読むので、調整しても説明がずれない。
export function initRules({ go }) {
  const seconds = MAX_STEPS * DT;
  const fold = Object.entries(PENTAGRAM_FOLD)
    .map(([row, to]) => `<li>ペンタグラム${row}行目 → ${to.map(([c, s]) => `計算行${c}${s === 1 ? '' : `に${s * 100}%`}`).join('、')}</li>`)
    .join('');
  const subtract = BALANCE.armor != null; // Ver.2 からのダメージ式
  const damage = subtract
    ? `<li><strong>ダメージ</strong>（1発ごと）= 攻撃 − 相手の前線の防御 × ${BALANCE.armor}。ただし攻撃の${Math.round(BALANCE.minDamage * 100)}%は必ず通る。`
      + `1発ごとに防御を引くので、<strong>手数の多い攻撃ほど防御で止まり、重い一撃は防御を抜ける</strong>。防御を抜くには防御貫通・毒・呪いも有効。</li>`
      + (BALANCE.damageScale === 1 ? '' : `<li>攻撃には全体の倍率 ${BALANCE.damageScale} がかかる（決着までの時間の調整）。</li>`)
    : '<li><strong>ダメージ</strong> = 攻撃 × 攻撃倍率 × 100 ÷ (100 + 相手の前線の防御)。防御100でダメージ半分。</li>';
  const traits = BALANCE.boardTraits ?? {};
  const traitText = (id) => (traits[id]?.rowBuffMult ? `<br>特性：行効果が${traits[id].rowBuffMult}倍` : '');
  const tiers = [...new Set(PRESET_TEAMS.map((t) => t.tier))].map((t) => TIERS[t].name).join('・');
  const tribes = Object.entries(TRIBES)
    .map(([id, t]) => `${tribeTag(id)} ${Object.keys(t.bonuses).join('・')}体以上`).join('　');

  $('rules-body').innerHTML = `
    <section class="rule-card">
      <h2>1. ゲームの流れ</h2>
      <ol class="rule-steps">
        <li><strong>チームを編成する</strong>：ボードを選び、マスにキャラクターと道具を置く。遺物を${MAX_RELICS}つまで持てる。</li>
        <li><strong>対戦する</strong>：戦闘は自動で進む。操作はいらない。</li>
        <li><strong>結果を見て直す</strong>：配置や駒を変えて、また戦う。</li>
      </ol>
      <p class="muted">駒は「駒作成」で自分で作ることもできます。</p>
    </section>

    <section class="rule-card">
      <h2>2. ボードとコスト</h2>
      <p>ボードは3種類。駒にはコストがあり、置いた駒のコストの合計がボードの上限を超えてはいけない。マスが多いボードほど上限が低い。</p>
      <div class="rule-boards" id="rule-boards"></div>
      <p>コストは駒の強さ（HP・攻撃×攻撃速度・防御・特殊効果）から自動で決まる。強い駒ほど割高になる。</p>
    </section>

    <section class="rule-card">
      <h2>3. 駒</h2>
      <dl class="rule-dl">
        <dt>キャラクター</dt><dd>HP・攻撃・防御・攻撃速度・種族を持ち、自動で攻撃する。<strong>1体以上</strong>置く必要がある。</dd>
        <dt>道具</dt><dd>自分では攻撃しない。多くは<strong>隣のマスのキャラクター</strong>の攻撃・防御を上げ、毒や麻痺などの効果を与える（隣にいないキャラには効かない）。回復・全体効果・定期付与のように、どこに置いても効く道具もある（詳しくは「6. 特殊効果」の「効く範囲」）。</dd>
        <dt>遺物</dt><dd>マスもコストも使わない。チーム全体などに効く。${MAX_RELICS}つまで。</dd>
        <dt>特殊効果</dt><dd>1つの駒に${MAX_EFFECTS}個まで（下の「6. 特殊効果」）。</dd>
      </dl>
    </section>

    <section class="rule-card">
      <h2>4. 戦闘</h2>
      <ul class="rule-list">
        <li><strong>チームHP</strong>：キャラクターのHPの合計が、チームのHPになる。キャラクターは個別には倒れない。</li>
        <li><strong>前線</strong>：各行でいちばん前（列が小さい＝左）のキャラクター。攻撃を受けるのは前線だけで、防御には前線の防御が使われる。</li>
        <li><strong>攻撃先</strong>：自分と同じ行の、相手の前線を攻撃する。その行に相手の前線がいなければ、いちばん近い行の前線を攻撃する。</li>
        ${damage}
        <li><strong>攻撃速度</strong>：1秒あたりの攻撃回数。</li>
        <li>両チームの攻撃は同時に処理されるので、先攻・後攻の有利はない。</li>
      </ul>
      <h3>ペンタグラムと他のボードの対戦</h3>
      <p>ペンタグラムは4行、他のボードは3行。向かい合うときは、ペンタグラムの4行を3つの「計算行」に割り振る（ペンタグラム同士は4行のまま）。</p>
      <ul class="rule-list">${fold}</ul>
      <p>攻撃は割合ぶんずつ各計算行に当たり（1発の攻撃を割合で分け、それぞれで防御を計算する）、計算行の防御は、割り振られた前線の防御の平均（割合で重みづけ）になる。編成画面の「行ごとの秒間パラメータ」で確認できる。</p>
    </section>

    <section class="rule-card">
      <h2>5. 勝敗</h2>
      <ul class="rule-list">
        <li>相手のチームHPを0にしたら勝ち。</li>
        <li>${seconds}秒たっても決着しなければ、<strong>残りHPの割合</strong>が高い方の勝ち。</li>
        <li>同時にHPが0以下になったら、はみ出したダメージの割合が小さい方の勝ち。</li>
        <li>割合がまったく同じなら引き分け。</li>
      </ul>
    </section>

    <section class="rule-card">
      <h2>6. 特殊効果</h2>
      <dl class="rule-dl">
        <dt>☠ 毒</dt><dd>攻撃が当たると、相手チームに毒が溜まる。0.1秒ごとに「溜まった量 × ${BALANCE.poisonDamage}」のダメージ。防御を無視し、${BALANCE.poisonDuration === null ? '戦闘が終わるまで消えない' : `${BALANCE.poisonDuration}秒で消える`}。</dd>
        <dt>❄ 麻痺</dt><dd>相手キャラの攻撃速度を一定時間 ${Math.round(BALANCE.paralyzeFactor * 100)}% にする。重ねると時間が延びる。対象は効果ごとに、${Object.values(PARALYZE_TARGETS).join('・')}のどれか。</dd>
        ${BALANCE.curseAmp ? `<dt>🕯 呪い</dt><dd>相手チームが受けるダメージ（通常攻撃・毒）を一定時間 +${Math.round(BALANCE.curseAmp * 100)}% にする。重ならず、かけ直すと残り時間が長い方になる。</dd>` : ''}
        <dt>🗡 防御貫通</dt><dd>攻撃するとき、相手の防御をその割合ぶん無いものとして計算する。</dd>
        <dt>↗ 隣接効果</dt><dd>隣のマスのキャラクターのステータスを上げる（固定値か割合）。</dd>
        <dt>↔ 行効果</dt><dd>同じ行にいるキャラクターのステータスを上げる（固定値か割合）。</dd>
        <dt>🌐 全体効果</dt><dd>味方のキャラクター全員のステータスを上げる。</dd>
        <dt>💚 回復</dt><dd>一定時間ごとにチームHPを回復する（最大HPは超えない）。</dd>
        <dt>⏱ 定期付与</dt><dd>一定時間ごとに、相手チームへ毒か呪いを付ける（攻撃しなくても付く）。</dd>
        <dt>🚩 隣接攻撃倍率</dt><dd>Ver.1 の効果。隣のマスのキャラクターの攻撃倍率を上げる。</dd>
      </dl>
      <h3>効く範囲（置き場所が大事な効果）</h3>
      <div class="table-wrap"><table class="rule-range">
        <tr><th>効果</th><th>キャラクターが持つとき</th><th>道具が持つとき</th></tr>
        <tr><td>攻撃・防御（道具の数値）</td><td>—</td><td class="need">隣のキャラ全員に加算</td></tr>
        <tr><td>☠ 毒・❄ 麻痺・🕯 呪い</td><td>自分の攻撃に付く</td><td class="need">隣のキャラ全員の攻撃に付く</td></tr>
        <tr><td>🗡 防御貫通</td><td>自分の攻撃</td><td class="need">隣のキャラ全員の攻撃</td></tr>
        <tr><td>↗ 隣接効果・🚩 隣接攻撃倍率</td><td class="need">隣のキャラ全員</td><td class="need">隣のキャラ全員</td></tr>
        <tr><td>↔ 行効果</td><td class="row">同じ行のキャラ全員（自分も）</td><td class="row">同じ行のキャラ全員</td></tr>
        <tr><td>🌐 全体効果</td><td class="any">どこでもOK（味方全員）</td><td class="any">どこでもOK（味方全員）</td></tr>
        <tr><td>💚 回復</td><td class="any">どこでもOK（チームHP）</td><td class="any">どこでもOK（チームHP）</td></tr>
        <tr><td>⏱ 定期付与</td><td class="any">どこでもOK（相手チーム）</td><td class="any">どこでもOK（相手チーム）</td></tr>
      </table></div>
      <p class="muted">「隣」は辺を共有するマス。編成画面でマスにマウスを乗せると、隣のマスが色付きで表示される。隣にキャラクターがいない道具は、「どこでもOK」の効果のほかは何も効かない。遺物は置き場所に関係なく効く。</p>
    </section>

    <section class="rule-card">
      <h2>7. 種族シナジー</h2>
      <p>同じ種族のキャラクターを決まった数以上置くと、ボーナスが付く。満たした最大の段階だけが効く。${TRIBES.neutral?.bonuses?.[2] ? '中立だけは、少ないほど強い（1体がいちばん強い）。' : ''}</p>
      <p class="rule-tribes">${tribes}</p>
      <p>効果の一覧は <button type="button" class="link-btn" data-rules-go="data">📖 図鑑</button> の「種族シナジー」にある。</p>
    </section>

    <section class="rule-card">
      <h2>8. 対戦モード</h2>
      <dl class="rule-dl">
        <dt>ランダムマッチ</dt><dd>自分のチームで、ゲームが用意したチームと戦う。強さ（${tiers}）を選べる。</dd>
        <dt>カスタム対戦</dt><dd>好きなチーム同士を戦わせる。シードを同じにすると、同じ展開をもう一度見られる。</dd>
        <dt>ストーリー・ローグライト</dt><dd>準備中。</dd>
      </dl>
    </section>`;

  const boards = Object.values(BOARDS).map((b) => {
    const fig = document.createElement('figure');
    fig.className = 'rule-board';
    fig.append(renderBoard(b));
    const cap = document.createElement('figcaption');
    cap.innerHTML = `<strong>${b.name}</strong><br>${b.cells.length}マス ／ コスト上限 ${b.costCap}${traitText(b.id)}`;
    fig.append(cap);
    return fig;
  });
  $('rule-boards').replaceChildren(...boards);

  $('rules-body').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-rules-go]');
    if (btn) go(btn.dataset.rulesGo);
  });
}
