// 対戦環境（バージョン）。駒・種族・遺物・プリセット・コスト上限・バランス値の組を「環境」と呼ぶ。
//
// - 最新の環境（LATEST）は、いつもの各データファイル（pieces.js・tribes.js・relics.js・presetTeams.js・
//   balance.js・boards.js のコスト上限）そのもの。調整はこれまでどおりそこを直す。
// - 過去の環境は src/data/environments/ に固定したコピー（スナップショット）で残し、いつでも遊べるようにする。
//   作り方は tools/snapshot-env.js を参照。
//
// applyEnvironment(id) は、各データファイルが export しているオブジェクト・配列の中身をその環境の値に入れ替える。
// どのモジュールも同じオブジェクトを参照しているので、import している側を書き換えずに環境を切り替えられる。
// 画面では、切り替えたらページを読み込み直す（描画済みの一覧などを作り直すため）。
import { BALANCE, setTunedBalance } from './balance.js';
import { BOARDS } from './boards.js';
import { CHARACTERS, ITEMS } from './pieces.js';
import { PRESET_TEAMS } from './presetTeams.js';
import { RELICS } from './relics.js';
import { TRIBES } from './tribes.js';
import { SNAPSHOTS } from './environments/index.js';

const clone = (v) => structuredClone(v);

// 今のデータファイルの中身を、環境の形で取り出す
export function captureEnvironment() {
  return clone({
    balance: BALANCE,
    costCaps: Object.fromEntries(Object.values(BOARDS).map((b) => [b.id, b.costCap])),
    characters: CHARACTERS,
    items: ITEMS,
    tribes: TRIBES,
    relics: RELICS,
    presets: PRESET_TEAMS,
  });
}

// 最新（調整中）の環境。読み込んだ時点のデータファイルの中身を控えておく（切り替えたあと戻すため）。
export const LATEST = {
  id: 'v2',
  name: 'Ver.2',
  status: '調整中',
  note: '最新の環境。バランス調整はこの環境に入る。',
  ...captureEnvironment(),
};

export const ENVIRONMENTS = [...SNAPSHOTS, LATEST];
export const DEFAULT_ENV = LATEST.id;

let active = LATEST.id;
export const activeEnvironment = () => ENVIRONMENTS.find((e) => e.id === active);
export const findEnvironment = (id) => ENVIRONMENTS.find((e) => e.id === id) ?? null;

const replaceArray = (target, items) => target.splice(0, target.length, ...clone(items));
function replaceObject(target, source) {
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, clone(source));
}

// 環境を切り替える。知らないIDなら最新にする。切り替えた環境を返す。
export function applyEnvironment(id) {
  const env = findEnvironment(id) ?? LATEST;
  replaceArray(CHARACTERS, env.characters);
  replaceArray(ITEMS, env.items);
  replaceArray(RELICS, env.relics);
  replaceArray(PRESET_TEAMS, env.presets);
  replaceObject(TRIBES, env.tribes);
  replaceObject(BALANCE, env.balance);
  setTunedBalance(env.balance);
  for (const board of Object.values(BOARDS)) board.costCap = env.costCaps[board.id];
  active = env.id;
  return env;
}
