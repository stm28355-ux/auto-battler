// バランス調整用の数値。戦闘エンジンとコスト計算はここを読む。
// tools/balance.js で大量に対戦させて、決着時間と勝率の偏りを見ながら調整する（spec §7）。
// 駒・種族・遺物の個別の数値は、それぞれ src/data/pieces.js・tribes.js・relics.js にある。

// 調整前の値。仕組みそのものを確かめるテストで使う（駒のコストが整数で、毒は1蓄積1ダメージ、など）。
export const NEUTRAL_BALANCE = {
  damageScale: 1,
  poisonDamage: 1,
  poisonDuration: null,
  paralyzeFactor: 0.5,
  cost: {
    step: 1,
    ceil: 1,
    curve: 1,
    scale: 1,
    hp: 400,
    atkSpd: 40,
    def: 50,
    itemAtk: 20,
    itemDef: 25,
    poison: 0.5,
    paralyze: 1.0,
    adjAtkMult: 5,
    heal: 0.1,
    rowBuff: 2,
  },
};

// 現在の値（調整後）
export const BALANCE = {
  // ---- 戦闘 ----
  // 通常攻撃のダメージにかける倍率。対戦全体のテンポ（決着までの時間）を決める。
  damageScale: 1,
  // 毒1蓄積あたりの、0.1秒ごとのダメージ。毒は防御を無視して溜まり続けるので、弱めにしてある。
  poisonDamage: 0.25,
  // 毒1回分が続く秒数。null なら戦闘終了まで。
  poisonDuration: null,
  // 麻痺中の攻撃速度の倍率。
  paralyzeFactor: 0.5,

  // ---- コスト式（spec §6） ----
  // 駒の「実力」= 各ステータスのコストの合計。コスト = scale × 実力 ^ curve を step 刻みに丸めたもの。
  // curve が1より大きいので、高い駒ほど割高になる。これで、マスが少なくコスト上限の高いボード（ハニカム）が
  // 一方的に強くならず、マスが多くコスト上限の低いボード（ペンタグラム）と釣り合う。
  cost: {
    step: 1, // コストの刻み。最低コストもこの値（小数を避けるため、以前の値を2倍にした）
    ceil: 0, // 1なら刻みに切り上げ、0なら四捨五入。切り上げは、安い駒ほど割高になる
    curve: 1.6, // 実力の指数
    scale: 1.3, // 係数（コスト2倍化のため以前の2倍）。中くらいの駒（実力2前後）のコストが、おおむね変わらないように決めた
    // 各ステータスの実力（この値で割った数）
    hp: 400, // キャラ: HP / hp
    atkSpd: 40, // キャラ: 攻撃 × 攻撃速度 / atkSpd
    def: 55, // キャラ: 防御 / def
    itemAtk: 16, // 道具: 攻撃 / itemAtk
    itemDef: 25, // 道具: 防御 / itemDef
    // 特殊効果
    poison: 0.5, // 付与量 × 確率 × poison
    paralyze: 1.0, // 確率 × paralyze
    adjAtkMult: 4.5, // 倍率 × adjAtkMult
    heal: 0.1, // 回復量 / 間隔(秒) × heal
    rowBuff: 3, // 行効果: 基準キャラ（HP300・攻撃30・防御30・速度1）への効きめ × 同じ行に居る人数の想定(rowBuff)
  },
};

const clone = (obj) => structuredClone(obj);
let TUNED = clone(BALANCE);

// useBalance() で戻す先の値を変える（環境を切り替えたとき。src/data/environment.js）
export function setTunedBalance(values) {
  TUNED = clone(values);
}

// 値を一時的に差し替える（ツールやテスト用）。path は 'cost.def' のようにドットで指す。
export function setBalance(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let target = BALANCE;
  for (const k of keys) {
    if (!Object.hasOwn(target, k)) throw new Error(`知らない設定です: ${path}`);
    target = target[k];
  }
  if (!Object.hasOwn(target, last)) throw new Error(`知らない設定です: ${path}`);
  target[last] = value;
}

// まとめて差し替える。引数は NEUTRAL_BALANCE と同じ形（省略すると調整後の値に戻す）
export function useBalance(values = TUNED) {
  for (const [k, v] of Object.entries(values)) {
    if (v !== null && typeof v === 'object') Object.assign(BALANCE[k], v);
    else BALANCE[k] = v;
  }
}
