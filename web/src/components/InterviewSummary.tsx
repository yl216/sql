import type { InterviewSession, QuestionListItem } from '../types';

interface Props {
  session: InterviewSession;
  list: QuestionListItem[];
  onRestart: () => void;
  onExit: () => void;
  onOpen: (qid: string) => void;
}

function fmt(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function InterviewSummary({ session, list, onRestart, onExit, onOpen }: Props) {
  const passed = session.results.filter((r) => r.passed).length;
  const total = session.results.reduce((a, r) => a + r.usedMs, 0);
  const all = passed === session.qids.length;

  return (
    <div className="summary">
      <div className={`summary-head ${all ? 'pass' : ''}`}>
        <div className="summary-score">
          {passed}
          <span>/{session.qids.length}</span>
        </div>
        <div className="summary-label">本场通过 · 总用时 {fmt(total)}</div>
      </div>

      <div className="summary-hint">点任意一行回到那道题，看答案和解析</div>

      <div className="summary-list">
        {session.qids.map((qid, i) => {
          const q = list.find((x) => x.id === qid);
          const r = session.results[i];
          return (
            <button className="summary-row" key={qid} onClick={() => onOpen(qid)}>
              <span className="sr-no">{i + 1}</span>
              <span className="sr-main">
                <span className="sr-title">{q?.title ?? qid}</span>
                <span className="sr-mod">{q?.module ?? ''}</span>
              </span>
              <span className="sr-time">{r ? fmt(r.usedMs) : '—'}</span>
              <span className={`sr-verdict ${r?.passed ? 'pass' : 'fail'}`}>
                {r?.passed ? '通过' : r?.timedOut ? '超时' : '未过'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="summary-actions">
        <button className="btn ghost" onClick={onExit}>
          返回练习
        </button>
        <button className="btn primary" onClick={onRestart}>
          再来一场
        </button>
      </div>
    </div>
  );
}
