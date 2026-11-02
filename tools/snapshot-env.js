// 今のデータファイルの中身を、過去の環境として固定する（Node.js）。
//
//   node tools/snapshot-env.js v2 "Ver.2"
//
// src/data/environments/<id>.js を書き出す。そのあと手で次の2つを直す：
//   1. src/data/environments/index.js の SNAPSHOTS に追加する
//   2. src/data/environment.js の LATEST の id / name を次のバージョン（例 v3 / Ver.3）にする
// 保存チームは環境ごとに分かれる（src/storage/teamStore.js）。
import { writeFileSync } from 'node:fs';
import { captureEnvironment } from '../src/data/environment.js';

const [id, name = id] = process.argv.slice(2);
if (!/^v\d+$/.test(id ?? '')) {
  console.error('使い方: node tools/snapshot-env.js v2 "Ver.2"');
  process.exit(1);
}

const env = { id, name, status: '保存版', note: `${name}の環境をそのまま残したもの。`, ...captureEnvironment() };
const path = new URL(`../src/data/environments/${id}.js`, import.meta.url);
const body = `// ${name} の環境（tools/snapshot-env.js で書き出したもの。手で直さない）\n`
  + `export default ${JSON.stringify(env, null, 2)};\n`;
writeFileSync(path, body);
console.log(`書き出しました: src/data/environments/${id}.js`);
