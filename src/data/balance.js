// バランス調整用の数値。戦闘エンジンとコスト計算はここを読む。
// tools/balance.js で大量に対戦させて、決着時間と勝率の偏りを見ながら調整する（spec §7）。
// 駒・種族・遺物の個別の数値は、それぞれ src/data/pieces.js・tribes.js・relics.js にある。

// 新しい効果のコスト係数の既定値。過去の環境のバランス値にはこれらの係数がないので、ここから補う。
export const EFFECT_COST_DEFAULTS = {
  curse: 0.2, // 確率 × 秒数 × curse
  pierce: 0.8, // 貫通割合 × pierce
  adjBuff: 2.5, // 隣接効果: 基準キャラへの効きめ × 隣にいる人数の想定
  teamBuff: 5, // 全体効果: 基準キャラへの効きめ × 味方の人数の想定
  pulsePoison: 0.6, // 定期付与（毒）: 付与量 / 間隔 × pulsePoison
  pulseCurse: 0.8, // 定期付与（呪い）: 秒数 / 間隔 × pulseCurse
};

// 調整前の値。仕組みそのものを確かめるテストで使う（駒のコストが整数で、毒は1蓄積1ダメージ、など）。
// ダメージ式は Ver.1 の「攻撃 × 100 ÷ (100 + 防御)」。null の項目は「その仕組みを使わない」。
export const NEUTRAL_BALANCE = {
  damageScale: 1,
  armor: null,
  minDamage: null,
  curseAmp: null,
  boardTraits: null,
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
    atkPow: null,
    atkRef: null,
    def: 50,
    itemAtk: 20,
    itemDef: 25,
    poison: 0.5,
    paralyze: 1.0,
    paralyzeSec: null,
    onHitSpd: null,
    itemOnHit: null,
    adjAtkMult: 5,
    heal: 0.1,
    ...EFFECT_COST_DEFAULTS,
    buffRef: null,
    rowBuff: 2,
  },
};

// 現在の値（調整後）
export const BALANCE = {
  // ---- 戦闘 ----
  // 通常攻撃のダメージにかける倍率。対戦全体のテンポ（決着までの時間）を決める。
  damageScale: 1.2,
  // 防御の効き方（spec §2）。1発のダメージ = max(攻撃 × minDamage, 攻撃 − 防御 × armor)。
  // 1発ごとに防御を引くので、手数の多い攻撃ほど防御で止まり、重い一撃は防御を抜ける。
  // armor がない環境（Ver.1）は、攻撃 × 100 ÷ (100 + 防御)。
  armor: 0.6,
  minDamage: 0.3,
  // 呪いにかかったチームが受けるダメージ（通常攻撃・毒）の増加分。
  curseAmp: 0.25,
  // ボードの特性。rowBuffMult: そのボードでの行効果の効き目の倍率。
  boardTraits: { square: { rowBuffMult: 2 } },
  // 毒1蓄積あたりの、0.1秒ごとのダメージ。毒は防御を無視して溜まり続けるので、弱めにしてある。
  poisonDamage: 0.2,
  // 毒1回分が続く秒数。null なら戦闘終了まで。
  poisonDuration: null,
  // 麻痺中の攻撃速度の倍率。
  paralyzeFactor: 0.3,

  // ---- コスト式（spec §6） ----
  // 駒の「実力」= 各ステータスのコストの合計。コスト = scale × 実力 ^ curve を step 刻みに丸めたもの。
  // curve が1より大きいので、高い駒ほど割高になる。これで、マスが少なくコスト上限の高いボード（ハニカム）が
  // 一方的に強くならず、マスが多くコスト上限の低いボード（ペンタグラム）と釣り合う。
  cost: {
    step: 1, // コストの刻み。最低コストもこの値（小数を避けるため、以前の値を2倍にした）
    ceil: 0, // 1なら刻みに切り上げ、0なら四捨五入。切り上げは、安い駒ほど割高になる
    curve: 1.55, // 実力の指数
    scale: 1.35, // 係数（コスト2倍化のため以前の2倍）。中くらいの駒（実力2前後）のコストが、おおむね変わらないように決めた
    // 各ステータスの実力（この値で割った数）
    hp: 400, // キャラ: HP / hp
    atkSpd: 40, // キャラ: 攻撃 × 攻撃速度 / atkSpd
    atkPow: 0.4, // さらに (攻撃 / atkRef) ^ atkPow を掛ける（1発の重さ）
    atkRef: 40,
    def: 65, // キャラ: 防御 / def
    itemAtk: 14, // 道具: 攻撃 / itemAtk（隣の何体にも効くので、キャラの攻撃より高く数える）
    itemDef: 28, // 道具: 防御 / itemDef
    // 特殊効果
    poison: 0.7, // 付与量 × 確率 × poison
    paralyze: 1.0, // 確率 × paralyze（paralyzeSec がない環境で使う）
    paralyzeSec: 0.5, // 確率 × 秒数 × 対象の重み × paralyzeSec
    onHitSpd: 1, // 1ならキャラの「攻撃時」の効果・防御貫通を、攻撃速度倍に数える
    itemOnHit: 3, // 道具の「攻撃時」の効果・防御貫通は、隣にいる人数の想定ぶん（この倍）に数える
    adjAtkMult: 4.5, // 倍率 × adjAtkMult
    heal: 0.05, // 回復量 / 間隔(秒) × heal
    ...EFFECT_COST_DEFAULTS,
    curse: 0.4,
    pierce: 1.2,
    // 能力値を上げる効果（隣接・行・全体）を数えるときの基準キャラ
    buffRef: { hp: 400, atk: 45, def: 40 },
    adjBuff: 3,
    teamBuff: 8,
    pulsePoison: 1.2,
    pulseCurse: 1.2,
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

// まとめて差し替える。引数は NEUTRAL_BALANCE と同じ形で、一部の項目だけでもよい（省略すると調整後の値に戻す）
export function useBalance(values = TUNED) {
  for (const [k, v] of Object.entries(values)) {
    const isObj = (x) => x !== null && typeof x === 'object';
    if (isObj(v) && isObj(BALANCE[k])) Object.assign(BALANCE[k], clone(v));
    else BALANCE[k] = clone(v);
  }
}
