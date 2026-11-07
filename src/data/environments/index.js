import v1 from './v1.js';
import v2 from './v2.js';
import v3 from './v3.js';

// 固定した過去の環境（古い順）。新しく固定したら、ここに足す（tools/snapshot-env.js）。
export const SNAPSHOTS = [v1, v2, v3];
