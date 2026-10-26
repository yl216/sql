export type TierStatus = 'pass' | 'fail' | 'skip';

export interface Diff {
  columns: string[];
  missing: (string | null)[][];
  extra: (string | null)[][];
  missingCount: number;
  extraCount: number;
}

export interface PlanTable {
  table: string;
  accessType: string;
  rowsExamined: number;
  key: string | null;
}

export interface Plan {
  rowsExamined: number;
  accessTypes: string[];
  fullScan: boolean;
  usingFilesort: boolean;
  usingTemporaryTable: boolean;
  tables: PlanTable[];
  limit: number;
}

export interface Tier {
  key: string;
  label: string;
  status: TierStatus;
  detail?: string;
  diff?: Diff | null;
  plan?: Plan;
  error?: { code: number | null; title: string; hint: string; raw: string };
}

export interface RunResult {
  columns: string[];
  rows: (string | number | null)[][];
  rowCount: number;
  elapsed: number;
  truncated?: boolean;
  dml?: boolean;
  affected?: number;
}

export interface SubmitResponse {
  passed: boolean;
  tiers: Tier[];
  result: RunResult | null;
}

export interface QuestionListItem {
  id: string;
  module: string;
  difficulty: number;
  title: string;
  schema: string;
  tags: string[];
  hasPerf: boolean;
  mustUse: string[];
  dml?: boolean;
}

export interface ColumnMeta {
  0: string;
  1: string;
  2: string;
}

export interface TableMeta {
  name: string;
  desc: string;
  rows: number;
  columns: [string, string, string][];
  note?: string;
}

export interface SchemaMeta {
  key: string;
  label: string;
  intro: string;
  tables: TableMeta[];
}

export interface Term {
  key: string;
  name: string;
  en: string;
  plain: string;
  usage: string;
}

export interface SolutionPayload {
  plain: string;
  terms: Term[];
  solutions: { label: string; sql: string; note: string; wrong?: boolean }[];
  followups: string[];
}

export interface InterviewResult {
  qid: string;
  passed: boolean;
  tiers: Tier[];
  usedMs: number;
  timedOut: boolean;
  sql: string;
}

export interface InterviewSession {
  createdAt: number;
  scope: string;
  qids: string[];
  perQuestionMs: number;
  index: number;
  endsAt: number;
  results: InterviewResult[];
  finished: boolean;
}

export interface InterviewRecord {
  createdAt: number;
  scope: string;
  total: number;
  passed: number;
  usedMs: number;
  perQuestionMs: number;
  marks: ('pass' | 'fail' | 'timeout')[];
}

export interface QuestionDetail extends QuestionListItem {
  description: string;
  requirements: string[];
  expectedColumns: string[];
  ordered: boolean;
  roundTo: number | null;
  schemaMeta: SchemaMeta;
}
