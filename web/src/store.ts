// 做题记录的前端存储层。
// 本地 localStorage 只当缓存（让界面秒开），真正的记录存在服务端：
// 换地址（127.0.0.1 / localhost / 开发端口）、换浏览器、清缓存都能找回来。
import type { InterviewRecord } from './types';

const K = {
  progress: 'sqlprac:progress',
  active: 'sqlprac:active',
  history: 'sqlprac:interview-history',
  collapsed: 'sqlprac:collapsed',
  draft: 'sqlprac:draft:',
};

export interface Profile {
  progress: Record<string, boolean>;
  drafts: Record<string, string>;
  collapsed: Record<string, boolean>;
  activeId: string;
  history: InterviewRecord[];
}

const EMPTY: Profile = { progress: {}, drafts: {}, collapsed: {}, activeId: '', history: [] };

function safe<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readLocal(): Profile {
  const drafts: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(K.draft)) {
        const v = localStorage.getItem(k);
        if (v != null) drafts[k.slice(K.draft.length)] = v;
      }
    }
  } catch {}
  return {
    progress: safe(localStorage.getItem(K.progress), {}),
    drafts,
    collapsed: safe(localStorage.getItem(K.collapsed), {}),
    activeId: localStorage.getItem(K.active) || '',
    history: safe(localStorage.getItem(K.history), []),
  };
}

function writeLocal(p: Profile) {
  try {
    localStorage.setItem(K.progress, JSON.stringify(p.progress));
    localStorage.setItem(K.collapsed, JSON.stringify(p.collapsed));
    localStorage.setItem(K.history, JSON.stringify(p.history));
    if (p.activeId) localStorage.setItem(K.active, p.activeId);
    for (const [id, sql] of Object.entries(p.drafts)) localStorage.setItem(K.draft + id, sql);
  } catch {}
}

function mergeDrafts(local: Record<string, string>, remote: Record<string, string>) {
  const out: Record<string, string> = { ...remote };
  // 本地有内容就以本地为准（这台机器上刚敲的东西最新）
  for (const [k, v] of Object.entries(local)) if (v && v.trim()) out[k] = v;
  return out;
}

function mergeHistory(a: InterviewRecord[], b: InterviewRecord[]) {
  const m = new Map<number, InterviewRecord>();
  for (const r of [...b, ...a]) if (r && typeof r.createdAt === 'number') m.set(r.createdAt, r);
  return [...m.values()].sort((x, y) => y.createdAt - x.createdAt).slice(0, 50);
}

export function merge(local: Profile, remote: Partial<Profile>): Profile {
  return {
    progress: { ...(remote.progress || {}), ...local.progress },
    drafts: mergeDrafts(local.drafts, remote.drafts || {}),
    collapsed: { ...(remote.collapsed || {}), ...local.collapsed },
    activeId: local.activeId || remote.activeId || '',
    history: mergeHistory(local.history, remote.history || []),
  };
}

// ---------- 同步到服务端 ----------
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: any = {};
let inflight = false;

function mergePatch(a: any, b: any) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if ((k === 'drafts' || k === 'progress' || k === 'collapsed') && v && typeof v === 'object') {
      out[k] = { ...(out[k] || {}), ...v };
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (inflight || !Object.keys(pending).length) return;
  const body = pending;
  pending = {};
  inflight = true;
  try {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // 失败就把这批改动放回去，下次一起发
    pending = mergePatch(body, pending);
  } finally {
    inflight = false;
  }
  if (Object.keys(pending).length) schedule();
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 400);
}

/** 把改动排进队列，400ms 内的多次改动合并成一次请求 */
export function push(partial: Record<string, any>) {
  pending = mergePatch(pending, partial);
  schedule();
}

/** 启动时合并「本地缓存 + 服务端记录」，并把合并结果写回两边 */
export async function hydrate(): Promise<Profile> {
  const local = readLocal();
  let remote: Partial<Profile> | null = null;
  try {
    const r = await fetch('/api/profile');
    if (r.ok) remote = (await r.json()) as Partial<Profile>;
  } catch {}

  const merged = remote ? merge(local, remote) : local;
  writeLocal(merged);
  // 把合并结果补回服务端（本地独有的部分也就上去了）
  if (remote) push(merged as any);
  return merged;
}

// 关页面前把还没发出去的改动尽量送出去
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (!Object.keys(pending).length) return;
    const blob = new Blob([JSON.stringify(pending)], { type: 'application/json' });
    navigator.sendBeacon?.('/api/profile', blob);
    pending = {};
  });
}

export { EMPTY };
