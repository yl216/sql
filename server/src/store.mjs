// 做题记录的持久化存储。
// 之前全存在浏览器 localStorage 里，但 localStorage 是按「协议+域名+端口」隔离的：
// 127.0.0.1:3001 / localhost:3001 / 5173 开发端口 各自一份，换个地址打开就像"记录丢了"。
// 现在改成服务端存一份 JSON，浏览器只是缓存，换地址、换浏览器、清缓存都能找回来。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, '..', '.data');
const FILE = path.join(DATA_DIR, 'profile.json');

const EMPTY = {
  progress: {},
  drafts: {},
  collapsed: {},
  activeId: '',
  history: [],
  updatedAt: 0,
};

let cache = null;
let queue = Promise.resolve();

export function readProfile() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    cache = {
      ...EMPTY,
      ...parsed,
      progress: parsed.progress || {},
      drafts: parsed.drafts || {},
      collapsed: parsed.collapsed || {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

function persist() {
  const data = JSON.stringify(cache, null, 2);
  // 串行写 + 先写临时文件再改名，避免写到一半断电留下半个 JSON
  queue = queue
    .then(async () => {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      const tmp = FILE + '.tmp';
      await fs.promises.writeFile(tmp, data, 'utf8');
      await fs.promises.rename(tmp, FILE);
    })
    .catch(() => {});
  return queue;
}

export function patchProfile(patch = {}) {
  const cur = readProfile();
  const next = {
    ...cur,
    progress: { ...cur.progress, ...(patch.progress || {}) },
    drafts: { ...cur.drafts, ...(patch.drafts || {}) },
    collapsed: { ...cur.collapsed, ...(patch.collapsed || {}) },
    activeId: typeof patch.activeId === 'string' ? patch.activeId : cur.activeId,
    history: Array.isArray(patch.history) ? patch.history.slice(0, 50) : cur.history,
    updatedAt: Date.now(),
  };

  // drafts 里传 null 表示"删除这条草稿"
  for (const [k, v] of Object.entries(patch.drafts || {})) {
    if (v === null) delete next.drafts[k];
  }

  cache = next;
  persist();
  return next;
}

export function profilePath() {
  return FILE;
}
