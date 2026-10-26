import type { QuestionDetail, QuestionListItem, RunResult, SolutionPayload, SubmitResponse } from './types';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || '请求失败');
  return data as T;
}

export const api = {
  questions: () => fetch('/api/questions').then((r) => r.json() as Promise<QuestionListItem[]>),
  question: (id: string) => fetch(`/api/questions/${id}`).then((r) => r.json() as Promise<QuestionDetail>),
  solution: (id: string) => fetch(`/api/questions/${id}/solution`).then((r) => r.json() as Promise<SolutionPayload>),
  run: (questionId: string, sql: string) =>
    post<{
      ok: boolean;
      columns: string[];
      rows: RunResult['rows'];
      rowCount: number;
      elapsed: number;
      truncated?: boolean;
      dml?: boolean;
      affected?: number;
      error?: any;
    }>('/api/run', { questionId, sql }),
  submit: (questionId: string, sql: string) => post<SubmitResponse>('/api/submit', { questionId, sql }),
  explain: (questionId: string, sql: string) =>
    post<{ ok: boolean; plan?: any; error?: any }>('/api/explain', { questionId, sql }),
};
