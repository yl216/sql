import { useEffect, useMemo, useState } from 'react';
import type { QuestionListItem } from '../types';
import { push } from '../store';

interface Props {
  items: QuestionListItem[];
  activeId: string;
  done: Record<string, boolean>;
  onSelect: (id: string) => void;
}

const COLLAPSE_KEY = 'sqlprac:collapsed';
const DIFF_LABEL: Record<number, string> = { 1: '入门', 2: '基础', 3: '进阶', 4: '挑战' };

export default function Sidebar({ items, activeId, done, onSelect }: Props) {
  // 只记录"用户手动设置过"的分组，没设置过的走默认规则
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');
    } catch {
      return {};
    }
  });

  const groups = useMemo(() => {
    const m = new Map<string, QuestionListItem[]>();
    for (const q of items) {
      if (!m.has(q.module)) m.set(q.module, []);
      m.get(q.module)!.push(q);
    }
    return m;
  }, [items]);

  const activeModule = items.find((q) => q.id === activeId)?.module ?? '';

  // 默认只展开当前题所在的分组；用户手动设置过的以设置为准
  const isCollapsed = (mod: string) => (mod in collapsed ? collapsed[mod] : mod !== activeModule);

  // 切到某道题时，确保它所在的分组是展开的，否则看不到当前题
  useEffect(() => {
    if (!activeModule) return;
    setCollapsed((prev) => {
      if (!prev[activeModule]) return prev;
      const next = { ...prev };
      delete next[activeModule];
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      push({ collapsed: next });
      return next;
    });
  }, [activeModule]);

  const toggle = (mod: string) => {
    setCollapsed((prev) => {
      const current = mod in prev ? prev[mod] : mod !== activeModule;
      const next = { ...prev, [mod]: !current };
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      push({ collapsed: next });
      return next;
    });
  };

  const mods = [...groups.keys()];
  const allExpanded = mods.every((m) => !isCollapsed(m));

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    for (const m of mods) next[m] = allExpanded;
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
    push({ collapsed: next });
    setCollapsed(next);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span>题库</span>
        <button className="head-toggle" onClick={toggleAll}>
          {allExpanded ? '全部收起' : '全部展开'}
        </button>
      </div>
      <div className="sidebar-list">
        {[...groups.entries()].map(([mod, qs]) => {
          const closed = isCollapsed(mod);
          const passed = qs.filter((q) => done[q.id]).length;
          return (
            <div className={`group ${closed ? 'closed' : 'open'}`} key={mod}>
              <button className="group-title" onClick={() => toggle(mod)} title={closed ? '展开' : '收起'}>
                <span className="gcaret" />
                <span className="gname">{mod}</span>
                <span className={`gstat ${passed === qs.length ? 'all' : ''}`}>
                  {passed}/{qs.length}
                </span>
              </button>
              {!closed && (
                <div className="group-items">
                  {qs.map((q) => (
                    <button
                      key={q.id}
                      className={`qitem ${q.id === activeId ? 'active' : ''} ${done[q.id] ? 'done' : ''}`}
                      onClick={() => onSelect(q.id)}
                    >
                      <span className="qdot" />
                      <span className="qname">{q.title}</span>
                      <span className={`qdiff d${q.difficulty}`}>{DIFF_LABEL[q.difficulty] || q.difficulty}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
