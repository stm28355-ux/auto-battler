// ワーカーの束。pay(a, b) の計算を小分けにして全コアで回す。
import { Worker } from 'node:worker_threads';

// sets: [[path, value], ...]（--set の値。ワーカーでも当てる）
export function createPool(env, size, sets = []) {
  const workers = Array.from({ length: size }, () => new Worker(new URL('./worker.js', import.meta.url), { workerData: { env, sets } }));
  const idle = [...workers];
  const queue = [];
  const waiting = new Map();
  let nextId = 0;
  const pump = () => {
    while (idle.length && queue.length) {
      const w = idle.pop();
      const job = queue.shift();
      waiting.set(job.msg.id, { job, w });
      w.postMessage(job.msg);
    }
  };
  for (const w of workers) {
    w.on('message', ({ id, results }) => {
      const { job } = waiting.get(id);
      waiting.delete(id);
      idle.push(w);
      job.resolve(results);
      pump();
    });
    w.on('error', (e) => { throw e; });
  }
  const run = (pairs, seeds, from) => new Promise((resolve) => {
    queue.push({ msg: { id: nextId++, pairs, seeds, from }, resolve });
    pump();
  });

  return {
    size,
    // pairs をまとめて計算。chunk 組ずつワーカーに渡す
    async pays(pairs, seeds, from = 1, chunk = 64) {
      const parts = [];
      for (let i = 0; i < pairs.length; i += chunk) parts.push(run(pairs.slice(i, i + chunk), seeds, from));
      return (await Promise.all(parts)).flat();
    },
    close: () => Promise.all(workers.map((w) => w.terminate())),
  };
}
