import type { InterviewSession, QuestionListItem } from '../types';

interface Props {
  session: InterviewSession;
  list: QuestionListItem[];
  activeQid: string;
  onExit: () => void;
}

export default function InterviewSide({ session, list, activeQid, onExit }: Props) {
  return (
    <aside className="sidebar interview-side">
      <div className="sidebar-head">
        <span>面试进行中</span>
      </div>
      <div className="sidebar-list">
        {session.qids.map((qid, i) => {
          const q = list.find((x) => x.id === qid);
          const r = session.results[i];
          const state = r ? (r.passed ? 'pass' : 'fail') : qid === activeQid ? 'current' : 'todo';
          const label = r ? (r.passed ? '通过' : r.timedOut ? '超时' : '未过') : qid === activeQid ? '进行中' : '待做';
          return (
            <div className={`iq-item ${state}`} key={qid}>
              <span className="iq-no">{i + 1}</span>
              <span className="iq-body">
                <span className="iq-title">{q?.title ?? qid}</span>
                <span className="iq-mod">{q?.module ?? ''}</span>
              </span>
              <span className="iq-state">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="interview-side-foot">
        <button className="btn ghost full" onClick={onExit}>
          退出面试
        </button>
      </div>
    </aside>
  );
}
