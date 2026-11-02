// localStorage が使えない環境（プライベートウィンドウなど）では、このページを開いている間だけ覚える。
export function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

export function defaultStorage(probeKey) {
  try {
    const storage = globalThis.localStorage;
    storage.getItem(probeKey);
    return storage;
  } catch {
    return memoryStorage();
  }
}
