// 対戦を並列で回すワーカー。pool.js から使う。
import { parentPort, workerData } from 'node:worker_threads';
import { applyEnvironment } from '../../src/data/environment.js';
import { setBalance } from '../../src/data/balance.js';
import { createCatalog } from '../../src/core/catalog.js';
import { pay } from './play.js';

applyEnvironment(workerData.env);
for (const [p, v] of workerData.sets ?? []) setBalance(p, v);
const catalog = createCatalog();

// { id, pairs: [[a, b], ...], seeds, from } → { id, results: [得点, ...] }
parentPort.on('message', ({ id, pairs, seeds, from }) => {
  parentPort.postMessage({ id, results: pairs.map(([a, b]) => pay(a, b, catalog, seeds, from)) });
});
