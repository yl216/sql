import { useState } from 'react';
import type { QuestionDetail, SolutionPayload } from '../types';

interface Props {
  q: QuestionDetail;
  solution: SolutionPayload | null;
  onToggleSolution: () => void;
  hideSolution?: boolean;
}

export default function QuestionPanel({ q, solution, onToggleSolution, hideSolution = false }: Props) {
  const [openSchema, setOpenSchema] = useState(true);
  const [openTerm, setOpenTerm] = useState<string | null>(null);

  return (
    <section className="qpanel">
      <div className="qpanel-scroll">
        <div className="qmeta">
          <span className="chip">{q.module}</span>
          <span className={`chip diff d${q.difficulty}`}>
            难度 {q.difficulty}
          </span>
          <span className="chip ghost">{q.schemaMeta.label}</span>
        </div>

        <h1 className="qtitle">{q.title}</h1>
        <p className="qdesc">{q.description}</p>

        <div className="block">
          <div className="block-title">要求</div>
          <ul className="req">
            {q.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        {q.dml ? (
          <div className="block">
            <div className="block-title">
              判题方式
              <span className="hint">看数据改成什么样</span>
            </div>
            <p className="dml-note">
              这道题不看查询结果，而是看执行完之后表里的数据。每次提交前沙盒都会重置回初始状态，改坏了也不要紧。
            </p>
            <div className="colchips">
              {q.expectedColumns.map((c) => (
                <code key={c} className="colchip">
                  {c}
                </code>
              ))}
            </div>
          </div>
        ) : (
          <div className="block">
            <div className="block-title">
              输出列
              <span className="hint">{q.ordered ? '按指定顺序' : '顺序不限'}</span>
            </div>
            <div className="colchips">
              {q.expectedColumns.map((c) => (
                <code key={c} className="colchip">
                  {c}
                </code>
              ))}
            </div>
          </div>
        )}

        <div className="block">
          <button className="block-title as-button" onClick={() => setOpenSchema((v) => !v)}>
            表结构 · {q.schemaMeta.label}
            <span className="caret">{openSchema ? '收起' : '展开'}</span>
          </button>
          {openSchema && (
            <div className="schema">
              <p className="schema-intro">{q.schemaMeta.intro}</p>
              {q.schemaMeta.tables.map((t, idx) => (
                <details className="tablecard" key={t.name} open={idx === 0}>
                  <summary>
                    <code>{t.name}</code>
                    <span className="tname">{t.desc}</span>
                    <span className="trows">{t.rows.toLocaleString()} 行</span>
                  </summary>
                  <table className="coltable">
                    <tbody>
                      {t.columns.map(([name, type, desc]) => (
                        <tr key={name}>
                          <td className="cname">{name}</td>
                          <td className="ctype">{type}</td>
                          <td className="cdesc">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {t.note && <div className="tnote">{t.note}</div>}
                </details>
              ))}
            </div>
          )}
        </div>

        <div className="block">
          <div className="tags">
            {q.tags.map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {!hideSolution && (
          <div className="block">
            <button className="linkbtn" onClick={onToggleSolution}>
              {solution ? '收起参考答案' : '看参考答案与追问'}
            </button>
          </div>
        )}

        {solution && (
          <div className="solutions">
            {solution.plain && (
              <div className="plainblock">
                <div className="plainhead">这道题在干什么</div>
                <p className="plaintext">{solution.plain}</p>
              </div>
            )}

            {solution.solutions.map((s, i) => (
              <div className={`sol ${s.wrong ? 'is-wrong' : ''}`} key={i}>
                <div className="sol-head">{s.label}</div>
                <pre className="sol-sql">{s.sql}</pre>
                <div className="sol-note">{s.note}</div>
              </div>
            ))}

            {solution.terms.length > 0 && (
              <div className="terms">
                <div className="terms-head">
                  术语解释
                  <span className="terms-hint">点开看大白话</span>
                </div>
                {solution.terms.map((t) => {
                  const open = openTerm === t.key;
                  return (
                    <div className={`termcard ${open ? 'open' : ''}`} key={t.key}>
                      <div className="term-head">
                        {/* 折叠按钮独立出来，文字区不挂事件，这样标题也能正常拖选 */}
                        <button
                          className="term-toggle"
                          onClick={() => setOpenTerm(open ? null : t.key)}
                          aria-label={open ? '收起' : '展开'}
                        >
                          {open ? '−' : '+'}
                        </button>
                        <span className="term-name">{t.name}</span>
                        {t.en && t.en !== t.name && <span className="term-en">{t.en}</span>}
                      </div>
                      {open && (
                        <>
                          <p className="term-plain">{t.plain}</p>
                          {t.usage && (
                            <p className="term-usage">
                              <b>什么时候用</b>
                              {t.usage}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {solution.followups?.length > 0 && (
              <div className="followups">
                <div className="sol-head">面试官可能追问</div>
                <ul>
                  {solution.followups.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
