import type { Diff, RunResult, Tier } from '../types';

export type Feedback =
  | { kind: 'idle' }
  | { kind: 'run'; data: RunResult }
  | { kind: 'submit'; data: { passed: boolean; tiers: Tier[]; result: RunResult | null } }
  | { kind: 'explain'; data: any }
  | { kind: 'error'; message: string };

interface Props {
  feedback: Feedback;
  busy: boolean;
}

function Cell({ v }: { v: string | number | null }) {
  if (v === null || v === undefined) return <td className="null">NULL</td>;
  return <td>{String(v)}</td>;
}

function DataTable({
  columns,
  rows,
  tone,
}: {
  columns: string[];
  rows: (string | number | null)[][];
  tone?: 'missing' | 'extra';
}) {
  return (
    <div className="tablewrap">
      <table className={`datatable ${tone || ''}`}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <Cell key={j} v={v} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffBlock({ diff }: { diff: Diff }) {
  const nothing = !diff.missingCount && !diff.extraCount;
  if (nothing) return null;
  return (
    <div className="diffblock">
      <div className="diffhead">
        {diff.missingCount > 0 && <span className="badge missing">少了 {diff.missingCount} 行</span>}
        {diff.extraCount > 0 && <span className="badge extra">多了 {diff.extraCount} 行</span>}
      </div>
      {diff.missingCount > 0 && (
        <>
          <div className="diffsub">标准答案里有、你没有的行</div>
          <DataTable columns={diff.columns} rows={diff.missing} tone="missing" />
        </>
      )}
      {diff.extraCount > 0 && (
        <>
          <div className="diffsub">你多出来的行</div>
          <DataTable columns={diff.columns} rows={diff.extra} tone="extra" />
        </>
      )}
    </div>
  );
}

function TierBar({ tiers }: { tiers: Tier[] }) {
  return (
    <div className="tierbar">
      {tiers.map((t) => (
        <div className={`tier ${t.status}`} key={t.key}>
          <span className="tdot" />
          <span className="tlabel">{t.label}</span>
          <span className="tstatus">
            {t.status === 'pass' ? '通过' : t.status === 'fail' ? '未过' : '跳过'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ResultPanel({ feedback, busy }: Props) {
  if (busy) {
    return (
      <div className="result">
        <div className="placeholder">执行中…</div>
      </div>
    );
  }

  if (feedback.kind === 'idle') {
    return (
      <div className="result">
        <div className="placeholder">
          写完 SQL 后按 <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 运行，或 <kbd>Ctrl</kbd> + <kbd>Shift</kbd> +{' '}
          <kbd>Enter</kbd> 提交判题
        </div>
      </div>
    );
  }

  if (feedback.kind === 'error') {
    return (
      <div className="result">
        <div className="errcard">
          <div className="errtitle">{feedback.message}</div>
        </div>
      </div>
    );
  }

  if (feedback.kind === 'run') {
    const d = feedback.data;
    return (
      <div className="result">
        <div className="runbar">
          <span className="ok">执行成功</span>
          {d.dml ? (
            <span className="muted">影响 {d.affected ?? 0} 行 · 下面是执行后的数据</span>
          ) : (
            <span className="muted">
              {d.rowCount} 行 · {d.elapsed}ms
            </span>
          )}
          {d.truncated && <span className="warn">结果已截断（最多显示 5000 行）</span>}
        </div>
        <DataTable columns={d.columns} rows={d.rows} />
      </div>
    );
  }

  if (feedback.kind === 'explain') {
    const plan = feedback.data;
    return (
      <div className="result">
        <div className="runbar">
          <span className="ok">执行计划</span>
          <span className="muted">估算扫描 {plan.rowsExamined} 行</span>
          {plan.fullScan && <span className="warn">存在全表扫描</span>}
          {plan.usingFilesort && <span className="warn">需要额外排序</span>}
          {plan.usingTemporaryTable && <span className="warn">使用了临时表</span>}
        </div>
        <div className="tablewrap">
          <table className="datatable">
            <thead>
              <tr>
                <th>表</th>
                <th>访问方式</th>
                <th>估算扫描行数</th>
                <th>使用的索引</th>
              </tr>
            </thead>
            <tbody>
              {plan.tables.map((t: any, i: number) => (
                <tr key={i}>
                  <td>{t.table}</td>
                  <td className={t.accessType === 'ALL' ? 'bad' : 'good'}>{t.accessType}</td>
                  <td>{t.rowsExamined}</td>
                  <td>{t.key || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="rawplan">
          <summary>原始 EXPLAIN JSON</summary>
          <pre>{JSON.stringify(plan.raw, null, 2)}</pre>
        </details>
      </div>
    );
  }

  const { passed, tiers, result } = feedback.data;
  const execTier = tiers.find((t) => t.key === 'exec');
  const correctTier = tiers.find((t) => t.key === 'correct');
  const robustTier = tiers.find((t) => t.key === 'robust');
  const perfTier = tiers.find((t) => t.key === 'perf');
  const syntaxTier = tiers.find((t) => t.key === 'syntax');

  return (
    <div className="result">
      <div className={`verdict ${passed ? 'pass' : 'fail'}`}>
        {passed ? '全部通过' : execTier?.status === 'fail' ? '执行失败' : '还没通过'}
      </div>

      <TierBar tiers={tiers} />

      {execTier?.error && (
        <div className="errcard">
          <div className="errtitle">
            {execTier.error.code ? `#${execTier.error.code} ` : ''}
            {execTier.error.title}
          </div>
          <div className="errhint">{execTier.error.hint}</div>
          <pre className="errraw">{execTier.error.raw}</pre>
        </div>
      )}

      {correctTier?.detail && <div className={`tierline ${correctTier.status}`}>{correctTier.detail}</div>}
      {correctTier?.diff && <DiffBlock diff={correctTier.diff} />}

      {robustTier?.detail && <div className={`tierline ${robustTier.status}`}>{robustTier.detail}</div>}

      {perfTier?.detail && (
        <div className={`tierline ${perfTier.status}`}>
          {perfTier.detail}
          {perfTier.plan && (
            <div className="plangrid">
              <span>扫描 {perfTier.plan.rowsExamined} 行</span>
              <span>访问方式 {perfTier.plan.accessTypes.join(' / ')}</span>
              <span>{perfTier.plan.fullScan ? '有全表扫描' : '无全表扫描'}</span>
              <span>{perfTier.plan.usingFilesort ? '有 filesort' : '无 filesort'}</span>
            </div>
          )}
        </div>
      )}

      {syntaxTier?.detail && <div className={`tierline ${syntaxTier.status}`}>{syntaxTier.detail}</div>}

      {result && (
        <>
          <div className="runbar">
            <span className="muted">
              {result.dml
                ? `执行后的数据：${result.rowCount} 行`
                : `你的结果：${result.rowCount} 行 · ${result.elapsed}ms`}
            </span>
          </div>
          <DataTable columns={result.columns} rows={result.rows} />
        </>
      )}
    </div>
  );
}
