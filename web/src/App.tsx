import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import type {
  InterviewRecord,
  InterviewResult,
  InterviewSession,
  QuestionDetail,
  QuestionListItem,
  SolutionPayload,
} from './types';
import Sidebar from './components/Sidebar';
import QuestionPanel from './components/QuestionPanel';
import SqlEditor from './components/SqlEditor';
import ResultPanel, { type Feedback } from './components/ResultPanel';
import InterviewSetup from './components/InterviewSetup';
import InterviewSide from './components/InterviewSide';
import InterviewSummary from './components/InterviewSummary';
import HistoryView from './components/HistoryView';
import { hydrate, push } from './store';

const STARTER = '-- Ctrl/Cmd + Enter 运行 · Ctrl/Cmd + Shift + Enter 提交\n\n';
const PROGRESS_KEY = 'sqlprac:progress';
const ACTIVE_KEY = 'sqlprac:active';
const SESSION_KEY = 'sqlprac:interview';
const HISTORY_KEY = 'sqlprac:interview-history';
const PRACTICE_DRAFT = 'sqlprac:draft:';
const INTERVIEW_DRAFT = 'sqlprac:interview:';

const draftKey = (id: string, prefix: string) => `${prefix}${id}`;

function loadSession(): InterviewSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as InterviewSession;
    return s?.qids?.length ? s : null;
  } catch {
    return null;
  }
}

function loadHistory(): InterviewRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function toRecord(s: InterviewSession): InterviewRecord {
  return {
    createdAt: s.createdAt,
    scope: s.scope,
    total: s.qids.length,
    passed: s.results.filter((r) => r.passed).length,
    usedMs: s.results.reduce((a, r) => a + r.usedMs, 0),
    perQuestionMs: s.perQuestionMs,
    marks: s.results.map((r) => (r.passed ? 'pass' : r.timedOut ? 'timeout' : 'fail')),
  };
}

function fmt(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function App() {
  const [list, setList] = useState<QuestionListItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [editorDoc, setEditorDoc] = useState(STARTER);
  const [editorVersion, setEditorVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle' });
  const [solution, setSolution] = useState<SolutionPayload | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [session, setSession] = useState<InterviewSession | null>(loadSession);
  const [history, setHistory] = useState<InterviewRecord[]>(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [remain, setRemain] = useState(0);
  const [progress, setProgress] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    } catch {
      return {};
    }
  });

  const sqlRef = useRef(STARTER);
  const activeRef = useRef('');
  const sessionRef = useRef<InterviewSession | null>(session);
  const answeredRef = useRef(false);
  const submitRef = useRef<(timedOut?: boolean) => void>(() => {});

  const interviewing = !!session && !session.finished;
  const summarizing = !!session?.finished;
  const answered = interviewing && session!.results.length > session!.index;
  const draftPrefix = interviewing ? INTERVIEW_DRAFT : PRACTICE_DRAFT;

  // ---------- 题目与草稿 ----------
  const openQuestion = useCallback((id: string, prefix: string, persist = true) => {
    const doc = localStorage.getItem(draftKey(id, prefix)) ?? STARTER;
    sqlRef.current = doc;
    activeRef.current = id;
    if (persist) {
      localStorage.setItem(ACTIVE_KEY, id);
      push({ activeId: id });
    }
    setEditorDoc(doc);
    setActiveId(id);
    setEditorVersion((v) => v + 1);
    setSolution(null);
    setFeedback({ kind: 'idle' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 先把服务端记录合并进来（换地址/换浏览器也能找回进度），再决定打开哪道题
      const merged = await hydrate();
      if (cancelled) return;
      setProgress(merged.progress || {});
      setHistory(merged.history || []);

      const qs = await api.questions();
      if (cancelled) return;
      setList(qs);
      if (!qs.length) return;
      const s = sessionRef.current;
      if (s && !s.finished) return; // 面试进行中，题目由 session 决定
      const saved = merged.activeId || localStorage.getItem(ACTIVE_KEY) || '';
      const target = qs.some((q) => q.id === saved) ? saved : qs[0].id;
      openQuestion(target, PRACTICE_DRAFT);
    })();
    return () => {
      cancelled = true;
    };
  }, [openQuestion]);

  useEffect(() => {
    if (!activeId) return;
    setDetail(null);
    api.question(activeId).then(setDetail);
  }, [activeId]);

  // ---------- 面试：切题 ----------
  useEffect(() => {
    if (!session || session.finished) return;
    const qid = session.qids[session.index];
    openQuestion(qid, INTERVIEW_DRAFT, false);
    answeredRef.current = session.results.length > session.index;
  }, [session?.index, session?.finished, openQuestion]);

  // ---------- 面试：计时 ----------
  useEffect(() => {
    if (!session || session.finished) return;
    const tick = () => {
      const left = session.endsAt - Date.now();
      setRemain(Math.max(0, left));
      if (left <= 0) submitRef.current(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session?.endsAt, session?.finished]);

  // ---------- 面试：交卷 ----------
  const submitInterview = useCallback(async (timedOut = false) => {
    const s = sessionRef.current;
    if (!s || s.finished || answeredRef.current) return;
    answeredRef.current = true;
    const qid = s.qids[s.index];
    const sql = sqlRef.current.trim();
    const usedMs = Math.min(s.perQuestionMs, Math.max(0, Date.now() - (s.endsAt - s.perQuestionMs)));

    setBusy(true);
    let res: Awaited<ReturnType<typeof api.submit>> | null = null;
    if (sql) {
      try {
        res = await api.submit(qid, sql);
      } catch (e: any) {
        setFeedback({ kind: 'error', message: e.message });
      }
    }
    const result: InterviewResult = {
      qid,
      passed: !!res?.passed,
      tiers: res?.tiers ?? [],
      usedMs,
      timedOut,
      sql,
    };
    const next = { ...s, results: [...s.results, result] };
    sessionRef.current = next;
    setSession(next);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    if (res) setFeedback({ kind: 'submit', data: res });
    else if (!sql) {
      setFeedback({ kind: 'error', message: timedOut ? '时间到，本题已自动交卷（没有写任何 SQL）' : '还没有写 SQL' });
    }
    setBusy(false);
  }, []);
  submitRef.current = submitInterview;

  const nextQuestion = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    const nextIndex = s.index + 1;
    const next: InterviewSession =
      nextIndex >= s.qids.length
        ? { ...s, finished: true }
        : { ...s, index: nextIndex, endsAt: Date.now() + s.perQuestionMs };
    answeredRef.current = false;
    sessionRef.current = next;
    setSession(next);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));

    // 最后一道交卷后，把整场成绩记进历史
    if (next.finished) {
      const rec = toRecord(next);
      setHistory((prev) => {
        const merged = [rec, ...prev.filter((r) => r.createdAt !== rec.createdAt)].slice(0, 50);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
        push({ history: merged });
        return merged;
      });
    }
  }, []);

  // ---------- 面试：开始 / 退出 ----------
  const startSession = useCallback(
    ({ scope, count, minutes }: { scope: string; count: number; minutes: number }) => {
      const pool = scope === 'all' ? list : list.filter((q) => q.module === scope);
      const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
      if (!picked.length) return;
      const s: InterviewSession = {
        createdAt: Date.now(),
        scope,
        qids: picked.map((q) => q.id),
        perQuestionMs: minutes * 60000,
        index: 0,
        endsAt: Date.now() + minutes * 60000,
        results: [],
        finished: false,
      };
      answeredRef.current = false;
      sessionRef.current = s;
      setSession(s);
      setSetupOpen(false);
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    },
    [list],
  );

  const exitInterview = useCallback(() => {
    sessionRef.current = null;
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
    const saved = localStorage.getItem(ACTIVE_KEY);
    const target = saved && list.some((q) => q.id === saved) ? saved : list[0]?.id;
    if (target) openQuestion(target, PRACTICE_DRAFT);
  }, [list, openQuestion]);

  // ---------- 练习模式 ----------
  const selectQuestion = useCallback((id: string) => openQuestion(id, PRACTICE_DRAFT), [openQuestion]);

  const onSqlChange = useCallback(
    (v: string) => {
      sqlRef.current = v;
      setEditorDoc(v);
      if (activeRef.current) {
        localStorage.setItem(draftKey(activeRef.current, draftPrefix), v);
        // 只同步练习草稿，面试草稿属于一次性会话
        if (draftPrefix === PRACTICE_DRAFT) push({ drafts: { [activeRef.current]: v } });
      }
    },
    [draftPrefix],
  );

  const clearEditor = useCallback(() => {
    sqlRef.current = STARTER;
    setEditorDoc(STARTER);
    setEditorVersion((v) => v + 1);
    if (activeRef.current) {
      localStorage.removeItem(draftKey(activeRef.current, PRACTICE_DRAFT));
      push({ drafts: { [activeRef.current]: null } });
    }
  }, []);

  const run = useCallback(async () => {
    const qid = activeRef.current;
    const sql = sqlRef.current.trim();
    if (!qid || !sql) return;
    setBusy(true);
    try {
      const res = await api.run(qid, sql);
      if (!res.ok) {
        setFeedback({
          kind: 'submit',
          data: {
            passed: false,
            tiers: [{ key: 'exec', label: '跑通', status: 'fail', error: res.error }],
            result: null,
          },
        });
      } else {
        setFeedback({ kind: 'run', data: res });
      }
    } catch (e: any) {
      setFeedback({ kind: 'error', message: e.message });
    } finally {
      setBusy(false);
    }
  }, []);

  const submit = useCallback(async () => {
    const qid = activeRef.current;
    const sql = sqlRef.current.trim();
    if (!qid || !sql) return;
    setBusy(true);
    try {
      const res = await api.submit(qid, sql);
      setFeedback({ kind: 'submit', data: res });
      if (res.passed) {
        setProgress((p) => {
          const next = { ...p, [qid]: true };
          localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
          return next;
        });
        push({ progress: { [qid]: true } });
      }
    } catch (e: any) {
      setFeedback({ kind: 'error', message: e.message });
    } finally {
      setBusy(false);
    }
  }, []);

  const explain = useCallback(async () => {
    const qid = activeRef.current;
    const sql = sqlRef.current.trim();
    if (!qid || !sql) return;
    setBusy(true);
    try {
      const res = await api.explain(qid, sql);
      if (!res.ok) setFeedback({ kind: 'error', message: res.error?.raw || '无法生成执行计划' });
      else setFeedback({ kind: 'explain', data: res.plan });
    } catch (e: any) {
      setFeedback({ kind: 'error', message: e.message });
    } finally {
      setBusy(false);
    }
  }, []);

  const toggleSolution = useCallback(async () => {
    if (solution) {
      setSolution(null);
      return;
    }
    setSolution(await api.solution(activeRef.current));
  }, [solution]);

  const modules = useMemo(() => [...new Set(list.map((q) => q.module))], [list]);
  const doneCount = list.filter((q) => progress[q.id]).length;

  const header = (
    <header className="topbar">
      <div className="brand">
        <span className="logo">SQL</span>
        <span className="brandname">练习台</span>
      </div>
      {!interviewing && !summarizing && (
        <div className="legend">
          <span className="legend-label">五挡判定</span>
          <span className="legend-items">跑通 · 正确 · 稳健 · 高效 · 优雅</span>
        </div>
      )}
      <div className="spacer" />
      {!interviewing && (
        <button className="btn text history-btn" onClick={() => setHistoryOpen(true)}>
          面试记录
          {history.length > 0 && <span className="hcount">{history.length}</span>}
        </button>
      )}
      {!interviewing && !summarizing && (
        <button className="btn interview-btn" onClick={() => setSetupOpen(true)}>
          面试模拟
        </button>
      )}
      <div className="progress">
        <span className="progress-num">
          {doneCount}
          <span className="progress-total">/{list.length}</span>
        </span>
        <span className="progress-label">已通过</span>
      </div>
    </header>
  );

  if (historyOpen) {
    return (
      <div className="app">
        {header}
        <HistoryView
          records={history}
          onClose={() => setHistoryOpen(false)}
          onClear={() => {
            if (window.confirm('确定清空所有面试记录？这个操作不能撤销。')) {
              localStorage.removeItem(HISTORY_KEY);
              setHistory([]);
              push({ history: [] });
            }
          }}
        />
      </div>
    );
  }

  if (summarizing && session) {
    return (
      <div className="app">
        {header}
        <div className="summary-wrap">
          <InterviewSummary
            session={session}
            list={list}
            onRestart={() => {
              exitInterview();
              setSetupOpen(true);
            }}
            onExit={exitInterview}
            onOpen={(qid) => {
              sessionRef.current = null;
              setSession(null);
              localStorage.removeItem(SESSION_KEY);
              openQuestion(qid, PRACTICE_DRAFT);
            }}
          />
        </div>
        {setupOpen && (
          <InterviewSetup modules={modules} onStart={startSession} onCancel={() => setSetupOpen(false)} />
        )}
      </div>
    );
  }

  const isLast = interviewing && session!.index === session!.qids.length - 1;

  return (
    <div className="app">
      {header}

      <div className="body">
        {interviewing ? (
          <InterviewSide session={session!} list={list} activeQid={activeId} onExit={exitInterview} />
        ) : (
          <Sidebar items={list} activeId={activeId} done={progress} onSelect={selectQuestion} />
        )}

        {detail ? (
          <QuestionPanel
            q={detail}
            solution={solution}
            onToggleSolution={toggleSolution}
            hideSolution={interviewing}
          />
        ) : (
          <section className="qpanel">
            <div className="placeholder">加载中…</div>
          </section>
        )}

        <main className="workbench">
          {interviewing && (
            <div className="ibar">
              <span className="ibadge">面试中</span>
              <span className="iprogress">
                第 {session!.index + 1} / {session!.qids.length} 题
              </span>
              <span className={`itime ${remain <= 60000 ? 'urgent' : ''}`}>{fmt(remain)}</span>
              <div className="spacer" />
              <span className="ihint">不能运行 · 无补全 · 交卷后锁定</span>
            </div>
          )}

          <div className="editor-wrap">
            <SqlEditor
              key={`${activeId}-${editorVersion}`}
              doc={editorDoc}
              onChange={onSqlChange}
              onRun={interviewing ? () => {} : run}
              onSubmit={interviewing ? () => submitInterview(false) : submit}
              autocomplete={!interviewing}
              readOnly={answered}
            />
          </div>

          <div className="actions">
            {interviewing ? (
              answered ? (
                <button className="btn primary" onClick={nextQuestion}>
                  {isLast ? '看本场结果' : '下一题'}
                </button>
              ) : (
                <button className="btn solid" onClick={() => submitInterview(false)} disabled={busy}>
                  交卷
                </button>
              )
            ) : (
              <>
                <button className="btn primary" onClick={run} disabled={busy}>
                  运行
                </button>
                <button className="btn solid" onClick={submit} disabled={busy}>
                  提交判题
                </button>
                {!detail?.dml && (
                  <button className="btn ghost" onClick={explain} disabled={busy}>
                    执行计划
                  </button>
                )}
                <div className="spacer" />
                <button className="btn text" onClick={clearEditor}>
                  清空
                </button>
              </>
            )}
          </div>

          <div className="result-wrap">
            <ResultPanel feedback={feedback} busy={busy} />
          </div>
        </main>
      </div>

      {setupOpen && (
        <InterviewSetup modules={modules} onStart={startSession} onCancel={() => setSetupOpen(false)} />
      )}
    </div>
  );
}
