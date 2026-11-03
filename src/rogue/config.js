// ローグライトモードの決まりごと（spec §15）。数値の調整はここで行う。

export const ROGUE_RUN_KEY = 'auto-battler.rogue.run.v1'; // 挑戦中のデータ
export const ROGUE_META_KEY = 'auto-battler.rogue.meta.v1'; // 引継ぎ（ポイント・割り振り・記録）

export const FRONT_FLOOR = 30; // 表クリア（勝つと一時リザルト）
export const TOP_FLOOR = 100; // 裏クリア（勝つと最終リザルト、挑戦が終わる）
export const CLEAR_BONUS = { [FRONT_FLOOR]: 5, [TOP_FLOOR]: 10 }; // その層に勝ったときに足すポイント

// 層の種類：一の位が0ならボス、5なら強敵、ほかは普通
export const floorKind = (floor) => (floor % 10 === 0 ? 'boss' : floor % 10 === 5 ? 'strong' : 'normal');
export const KIND_NAMES = { normal: '普通', strong: '強敵', boss: 'ボス' };

// ゲームオーバー・諦めたときのポイント（その層 ÷ 5、切り捨て）
export const gameOverPoints = (floor) => Math.floor(floor / 5);

// ---- 引継ぎ ----
export const INITIAL_POINTS = 10; // 初めから持っているポイント（最初の駒の持ち込みに割り振ってある）
export const BASE_LIFE = 3;
export const LIMITS = { reroll: 5, life: 10, relic: 10, piece: 3 }; // リロール回数・ライフ・遺物ごと・駒ごとの上限
export const PRICES = { reroll: 2, life: 2, relic: 2 }; // 1つ上げるのに必要なポイント
// 駒の持ち込み1個あたりのポイント：コスト3以下は1、4〜8は2、9以上は3
export const piecePrice = (cost) => (cost <= 3 ? 1 : cost <= 8 ? 2 : 3);
// 解放するとずっと効く要素
export const PERKS = {
  shortcut: { name: '開始層のショートカット', price: 5, text: '到達したことのある 11・21・31…層から挑戦を始められる。飛ばした層の報酬は、自動で受け取る' },
  bossHeal: { name: 'ボス勝利でライフ回復', price: 3, text: 'ボスに勝つと、ライフが1回復する（最大まで）' },
  strongRare: { name: '強敵の報酬をレア駒に', price: 3, text: '強敵に勝ったときの駒の報酬が、レア駒になる' },
};
// 初めから割り振ってある持ち込み（合計 INITIAL_POINTS）
export const DEFAULT_PIECES = { c_squire: 2, c_knight: 1, c_apprentice: 2, c_wolf: 2, i_sword: 1, i_shield: 1 };

// ---- 報酬 ----
export const OFFER = {
  sets: 3, // 候補のセット数
  itemRate: 0.3, // 普通の駒の報酬で、道具が出る割合（キャラ7：道具3）
  costPow: 2, // 普通の駒の出やすさ = 1 ÷ コストの costPow 乗
  rareMin: { character: 4, item: 3 }, // レア駒になる最低コスト
  antidoteId: 'r_antidote',
  antidoteMax: 5, // 解毒の聖水をこの数持っていたら、候補に出さない
};

// ---- 敵 ----
// 普通の敵が使うコスト = base + perFloor × 層。強敵・ボスは倍率をかける。
// ボスはすべての遺物を重ねて持つので、チームのコストは普通の敵より低くする（遺物だけで十分に壁になる）。
// ボードのマス数 × cellMax を超えては使わない（高い駒ばかりになって、置ける駒がなくなるため）。
// 値は node tools/rogue.js で合わせた（自動のプレイヤーで、初期の引継ぎなら30層に届くのが3割ほど）
export const ENEMY = {
  base: 10,
  perFloor: 3,
  strongMult: 1.2,
  bossMult: 0.6,
  cellMax: 13,
  bossTribes: ['warrior', 'mage', 'beast', 'machine'],
};
