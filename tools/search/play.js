import { runBattle } from '../../src/engine/battle.js';

// a が b と戦ったときの得点（0〜1）。シードごとに先攻・後攻を入れ替えて2戦。
//   勝ち1・引き分け0.5 を 9割、残りHPの割合の差を 1割（全勝・全敗でも差が出るように）。pay(a,b) + pay(b,a) = 1
export function pay(a, b, catalog, seeds, from = 1) {
  let win = 0;
  let margin = 0;
  const left = (r, k) => Math.max(0, r.ratio[k]);
  for (let s = from; s < from + seeds; s++) {
    const r1 = runBattle(a, b, catalog, { seed: s });
    const r2 = runBattle(b, a, catalog, { seed: s });
    win += (r1.winner === 'a') + (r2.winner === 'b') + 0.5 * ((r1.winner === 'draw') + (r2.winner === 'draw'));
    margin += left(r1, 'a') - left(r1, 'b') + left(r2, 'b') - left(r2, 'a');
  }
  const n = 2 * seeds;
  return 0.9 * (win / n) + 0.1 * ((margin / n + 1) / 2);
}
