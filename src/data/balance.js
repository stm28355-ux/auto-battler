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
  paralyzeSlowFactor: null,
  paralyzeSlowSpd: null,
  paralyzeFastSpd: null,
  alternateTies: null,
  fastestNow: null,
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
    receivers: null,
    paralyzeWeight: null,
    lifesteal: null,
    spdAdd: null,
    atkBuff: null,
    tribeShare: null,
    rallyLen: null,
    curePoison: null,
    cureParalyze: null,
    venomStacks: null,
    itemAmpAtk: null,
    itemAmpDef: null,
  },
};

// 現在の値（調整後）
export const BALANCE = {
  // ---- 戦闘 ----
  // 通常攻撃のダメージにかける倍率。対戦全体のテンポ（決着までの時間）を決める。
  damageScale: 1.35, // Ver.2 は 1.2。最低ダメージを下げた分、決着が遅くなったので上げた（目安10秒）
  // 防御の効き方（spec §2）。1発のダメージ = max(攻撃 × minDamage, 攻撃 − 防御 × armor)。
  // 1発ごとに防御を引くので、手数の多い攻撃ほど防御で止まり、重い一撃は防御を抜ける。
  // armor がない環境（Ver.1）は、攻撃 × 100 ÷ (100 + 防御)。
  armor: 0.6,
  // Ver.3 で 0.3 → 0.1。防御で止まる手数型と、毒・防御貫通・重い一撃の差をはっきりさせる
  minDamage: 0.1,
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
  // 麻痺の倍率を、かかった駒の攻撃速度で変える（遅い駒ほど効きにくい。傾斜のある方が型が多く出た：v3-h 15チーム / 傾斜なし v3-i 6チーム）。
  //   攻撃速度 paralyzeFastSpd 以上は paralyzeFactor、paralyzeSlowSpd 以下は paralyzeSlowFactor、その間はまっすぐつなぐ（速度1 ≒ 0.41倍）
  paralyzeSlowFactor: 0.7,
  paralyzeSlowSpd: 0.5,
  paralyzeFastSpd: 1.2,
  // 麻痺などの「攻撃時の効果」を受ける相手が2体で同じ割合のとき（ペンタグラムと3行のボード）、交互に狙う（Ver.3）。
  // ない環境は、いつも上の行を狙う。
  alternateTies: true,
  // 麻痺の「攻撃速度が最も高い敵」を、麻痺で遅くなっている分も入れた今の速さで選ぶ（Ver.3）
  fastestNow: true,

  // ---- コスト式（spec §6） ----
  // 駒の「実力」= 各ステータスのコストの合計。コスト = scale × 実力 ^ curve を step 刻みに丸めたもの。
  // curve が1より大きいので、高い駒ほど割高になる。これで、マスが少なくコスト上限の高いボード（ハニカム）が
  // 一方的に強くならず、マスが多くコスト上限の低いボード（ペンタグラム）と釣り合う。
  cost: {
    step: 1, // コストの刻み。最低コストもこの値（小数を避けるため、以前の値を2倍にした）
    ceil: 0, // 1なら刻みに切り上げ、0なら四捨五入。切り上げは、安い駒ほど割高になる
    // 実力の指数。Ver.2 は 1.55。Ver.3 は 1.25 に下げて、高い駒のコストあたりの実力を上げた
    curve: 1.25,
    // 係数。実力2の駒のコストが Ver.2（1.35 × 2^1.55 ≒ 3.95）と同じになるように決めた
    scale: 1.662,
    // 各ステータスの実力（この値で割った数）
    hp: 400, // キャラ: HP / hp
    atkSpd: 40, // キャラ: 攻撃 × 攻撃速度 / atkSpd
    atkPow: 0.4, // さらに (攻撃 / atkRef) ^ atkPow を掛ける（1発の重さ）
    atkRef: 40,
    def: 80, // キャラ: 防御 / def（Ver.2 は 65。防御は前線にしか効かないので安くした）
    itemAtk: 12, // 道具: 攻撃 / itemAtk（隣の何体にも効くので、キャラの攻撃より高く数える。攻撃の強化と同じく、1発の重さの分を入れて 14 → 12）
    itemDef: 35, // 道具: 防御 / itemDef（Ver.2 は 28。キャラの防御と同じ割合で安くした）
    // 特殊効果
    poison: 0.7, // 付与量 × 確率 × poison
    paralyze: 1.0, // 確率 × paralyze（paralyzeSec がない環境で使う）
    paralyzeSec: 0.5, // 確率 × 秒数 × 対象の重み × paralyzeSec
    onHitSpd: 1, // 1ならキャラの「攻撃時」の効果・防御貫通を、攻撃速度倍に数える
    // 道具の「攻撃時」の効果・防御貫通は、隣にいる人数 × その攻撃速度の想定ぶん（この倍）に数える。
    // Ver.3 は「隣3体 × 攻撃速度1.2」（Ver.2 は 3）
    itemOnHit: 3.6,
    adjAtkMult: 4.5, // 倍率 × adjAtkMult
    // 回復量 / 間隔(秒) × heal。戦闘の目安10秒なら、回復1/秒 = HP10 = 実力0.025（Ver.2 は 0.05）。
    // ただし回復を積むと戦闘が長引き、回復の価値がさらに上がる（0.025 では修理ロボ4体の時間切れ狙いが最強になった）ので 0.04
    heal: 0.04,
    ...EFFECT_COST_DEFAULTS,
    curse: 0.4,
    pierce: 1.2,
    // 能力値を上げる効果（隣接・行・全体）を数えるときの基準キャラ
    buffRef: { hp: 400, atk: 45, def: 40 },
    adjBuff: 3,
    teamBuff: 9, // Ver.2 は 8。全体効果（預言者など）が割安だったので上げた
    // 効く人数の想定を、能力値と駒の種類で変える（Ver.3）。[能力値 or any][効果][character / item / any]
    //   「item.pct」のように、固定値（add）と割合（pct）で分けて書ける
    receivers: {
      // 道具の行効果は、道具がその行の1マスを使うので2体
      any: { rowBuff: { item: 2 } },
      // 道具の割合強化（攻撃%・攻撃速度%）は、攻撃×攻撃速度の高いエースの隣に置かれるので、3体ではなく3.75体分に数える
      atk: { adjBuff: { 'item.pct': 3.75 } },
      spd: { adjBuff: { 'item.pct': 3.75 } },
      // HP は相乗がなく（チームHPに足すだけ）、値段より効かなかったので、隣接2.5体・全体8体（2体・7体では聖鎧・歯車が強すぎた）
      hp: { adjBuff: { any: 2.5 }, teamBuff: { any: 8 } },
      // 防御は前線にしか効かない。隣接はキャラ0.7体・道具1体、行は1体（その行の前線）、全体は3体（3行の前線）
      def: { adjBuff: { character: 0.7, item: 1 }, rowBuff: { any: 1 }, teamBuff: { any: 3 } },
    },
    // 攻撃の強化（固定値・割合）は、上がるほど1発が重くなり防御を抜けるので、この倍に数える（計算上は1.47倍だが、緩めた）
    atkBuff: 1.25,
    // 種族を決めた全体効果は、全員の何割に効くと数えるか
    tribeShare: 0.5,
    // 号令：全体効果と同じ値段 × 秒数 ÷ rallyLen（戦闘の長さの想定）
    rallyLen: 10,
    // 手当て：(curePoison × 減らす毒 + cureParalyze) ÷ 間隔。毒の付与（1回0.7）より安くした
    curePoison: 0.3,
    cureParalyze: 0.3,
    // 毒で攻撃+：相手の毒の蓄積の想定
    venomStacks: 12,
    // 道具を磨く：隣の道具の攻撃・防御の想定（実力）× 割合。スクエア中央なら道具4つ×それぞれ2〜3体に効くので、道具1つぶんの値段（1.6 / 0.8）では約4倍の割安だった
    itemAmpAtk: 6,
    itemAmpDef: 2,
    // 麻痺の対象の重み（Ver.3）。前線は、攻撃の高い駒が前線以外に居やすいので軽くした（Ver.2 は 1）
    paralyzeWeight: { front: 0.6, random: 1, fastest: 1.2, strongest: 1.2, row: 2.5, all: 4 },
    // 吸血：割合 × 攻撃 × 攻撃速度 × lifesteal（回復の係数 0.04 × ダメージ倍率 1.2 × 防御で残る割合の想定 0.75）
    lifesteal: 0.036,
    // 攻撃速度の固定値（隣接など）は、同じ値の割合（基準キャラは速度1）の spdAdd 倍に数える。遅く重い駒ほど得をするため
    spdAdd: 1.5,
    // 定期付与（毒）：付与量 / 間隔 × pulsePoison。攻撃時の毒（1回 0.7）と同じ値段（Ver.2 は 1.2）
    pulsePoison: 0.7,
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
