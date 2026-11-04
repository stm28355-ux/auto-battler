// 相性表からの「環境」：どのチームをどの割合で使うのが最も負けにくいか（対称な定和ゲームのナッシュ均衡の近似）。
//   A[i][j] は i が j と戦ったときの得点（0〜1、A[i][j] + A[j][i] = 1）。
//   乗算型重み更新の平均で近似する。得られた割合 x に対して、どのチームも 0.5 + exploit を超える得点を取れない。
export function solveNash(A, { iterations = 20000, eta = 0.2, floor = 0.005 } = {}) {
  const n = A.length;
  if (n === 0) return { weights: [], values: [], exploit: 0 };
  let x = Array(n).fill(1 / n);
  const avg = Array(n).fill(0);
  for (let t = 0; t < iterations; t++) {
    const u = A.map((row) => row.reduce((s, a, j) => s + a * x[j], 0));
    const v = u.reduce((s, ui, i) => s + ui * x[i], 0);
    const step = eta / Math.sqrt(1 + t / 100);
    x = x.map((xi, i) => xi * Math.exp(step * (u[i] - v)));
    const sum = x.reduce((a, b) => a + b, 0);
    x = x.map((xi) => xi / sum);
    for (let i = 0; i < n; i++) avg[i] += x[i];
  }
  // 小さすぎる割合は0にしてならし直す
  let w = avg.map((a) => a / iterations);
  w = w.map((wi) => (wi < floor ? 0 : wi));
  const total = w.reduce((a, b) => a + b, 0);
  w = w.map((wi) => wi / total);
  const values = A.map((row) => row.reduce((s, a, j) => s + a * w[j], 0)); // 環境に対する得点
  return { weights: w, values, exploit: Math.max(...values) - 0.5 };
}
