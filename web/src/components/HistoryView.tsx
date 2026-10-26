import type { InterviewRecord } from '../types';

interface Props {
  records: InterviewRecord[];
  onClose: () => void;
  onClear: () => void;
}

function fmtDur(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}分${String(s % 60).padStart(2, '0')}秒` : `${s}秒`;
}

function fmtDate(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function HistoryView({ records, onClose, onClear }: Props) {
  const totalRounds = records.length;
  const totalPassed = records.reduce((a, r) => a + r.passed, 0);
  const totalQuestions = records.reduce((a, r) => a + r.total, 0);
  const avg = totalQuestions ? Math.round((totalPassed / totalQuestions) * 100) : 0;
  const best = records.reduce((a, r) => Math.max(a, r.total ? r.passed / r.total : 0), 0);

  // 最近 12 场（时间正序），柱子高度 = 通过率
  const trend = [...records].slice(0, 12).reverse();

  return (
    <div className="history-wrap">
      <div className="history">
        <div className="history-head">
          <div>
            <h2 className="history-title">面试记录</h2>
            <div className="history-sub">
              共 {totalRounds} 场 · 累计 {totalQuestions} 题 · 平均通过率 {avg}% · 最好 {Math.round(best * 100)}%
            </div>
          </div>
          <div className="history-actions">
            {records.length > 0 && (
              <button className="btn text" onClick={onClear}>
                清空记录
              </button>
            )}
            <button className="btn ghost" onClick={onClose}>
              返回练习
            </button>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="history-empty">
            还没有面试记录。点顶栏的「面试模拟」来一场，成绩会自动记在这里。
          </div>
        ) : (
          <>
            <div className="trend">
              {trend.map((r, i) => {
                const ratio = r.total ? r.passed / r.total : 0;
                return (
                  <div className="trend-col" key={r.createdAt + '-' + i} title={`${fmtDate(r.createdAt)} ${r.passed}/${r.total}`}>
                    <div className="trend-bar-wrap">
                      <div
                        className={`trend-bar ${ratio === 1 ? 'full' : ratio === 0 ? 'zero' : ''}`}
                        style={{ height: `${Math.max(6, ratio * 100)}%` }}
                      />
                    </div>
                    <div className="trend-label">{r.passed}/{r.total}</div>
                  </div>
                );
              })}
              <div className="trend-caption">最近 {trend.length} 场（左旧右新）</div>
            </div>

            <div className="rec-list">
              {records.map((r) => {
                const ratio = r.total ? r.passed / r.total : 0;
                return (
                  <div className="rec-row" key={r.createdAt}>
                    <span className="rec-date">{fmtDate(r.createdAt)}</span>
                    <span className="rec-scope">{r.scope === 'all' ? '全部模块' : r.scope}</span>
                    <span className="rec-marks">
                      {r.marks.map((m, i) => (
                        <i key={i} className={`mk ${m}`} title={m === 'pass' ? '通过' : m === 'timeout' ? '超时' : '未过'} />
                      ))}
                    </span>
                    <span className={`rec-score ${ratio === 1 ? 'full' : ratio === 0 ? 'zero' : ''}`}>
                      {r.passed}/{r.total}
                    </span>
                    <span className="rec-time">{fmtDur(r.usedMs)}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
