/**
 * F10 — Mock test series + all-India rank import.
 *
 * Pure, side-effect-free helpers behind the "mock series with AIR" flow. Real
 * JEE/NEET centers buy a ranked national mock and then paste the ranking sheet
 * back into their system; everything here turns that pasted text into typed
 * `ExamResult.external*` fields and keeps the displayed rank/percentile
 * truthful (imported, never fabricated). No network, no storage — so the same
 * functions run in `test-auth.ts` and in the portals.
 */

import { Exam, ExamKind, ExamResult, Student } from '../types';

export const EXAM_KINDS: ExamKind[] = ['unit', 'mock', 'full_syllabus', 'board'];

export const EXAM_KIND_LABEL: Record<ExamKind, string> = {
  unit: 'Unit Test',
  mock: 'Mock Test',
  full_syllabus: 'Full Syllabus Test',
  board: 'Board Pattern Test'
};

export function examKindLabel(kind?: ExamKind): string {
  return (kind && EXAM_KIND_LABEL[kind]) || EXAM_KIND_LABEL.unit;
}

/** An exam sells an all-India rank only when explicitly flagged. */
export function isAllIndiaExam(exam: Pick<Exam, 'isAllIndia'>): boolean {
  return exam.isAllIndia === true;
}

/** One parsed external (all-India) rank row, already resolved to a student. */
export interface ExternalRankRow {
  studentId: string;
  externalRank: number;
  externalTotalStudents?: number;
  externalPercentile?: number;
}

export interface ParseExternalRankResult {
  rows: ExternalRankRow[];
  errors: string[];
}

export interface MergeExternalResult {
  results: ExamResult[];
  updated: number;
  created: number;
}

const norm = (value: unknown): string =>
  String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Percentile that matches `AcademicContext.saveExamResults`: the top rank is
 * 100 and the count of learners ranked at or below is the numerator.
 */
export function percentileFromRank(rank: number, total: number): number {
  if (!Number.isFinite(rank) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round(((total - rank + 1) / total) * 100);
}

function findStudent(students: Student[], key: string): Student | null {
  const target = norm(key);
  if (!target) return null;
  const byId = students.find(
    s =>
      norm(s.enrollmentNo) === target ||
      norm(s.rollNo) === target ||
      norm(s.id) === target ||
      norm(s.name) === target
  );
  return byId || null;
}

/**
 * Parse a pasted ranking sheet. Each non-empty line is
 * `identifier, rank[, total[, percentile]]` where `identifier` may be a roll
 * number, enrollment number, student id or full name. Commas, tabs or
 * semicolons all work. A header row (or any line whose second cell is not a
 * positive integer) is skipped. Returns resolved rows plus human-readable
 * errors so the UI can show exactly which lines were ignored.
 */
export function parseExternalRankSheet(text: string, students: Student[]): ParseExternalRankResult {
  const rows: ExternalRankRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const lines = (text || '').split(/\r?\n/);
  lines.forEach((rawLine, lineNo) => {
    const line = rawLine.trim();
    if (!line) return;
    const cells = line.split(/[,\t;]/).map(c => c.trim());
    const identifier = cells[0] || '';
    const rank = Number(cells[1]);
    const total = cells[2] !== undefined && cells[2] !== '' ? Number(cells[2]) : undefined;
    const pctRaw = cells[3] !== undefined && cells[3] !== '' ? Number(cells[3]) : undefined;

    // Header / unparseable rank: ignore quietly so a pasted header doesn't
    // drown the real errors.
    if (!Number.isFinite(rank) || !Number.isInteger(rank) || rank <= 0) return;

    const student = findStudent(students, identifier);
    if (!student) {
      errors.push(`Line ${lineNo + 1}: no student matches "${identifier}".`);
      return;
    }
    if (seen.has(student.id)) {
      errors.push(`Line ${lineNo + 1}: duplicate rank for ${student.name}; later line ignored.`);
      return;
    }
    if (total !== undefined && (!Number.isFinite(total) || total < rank)) {
      errors.push(`Line ${lineNo + 1}: total students (${cells[2]}) cannot be less than rank ${rank}.`);
      return;
    }
    if (
      pctRaw !== undefined &&
      (!Number.isFinite(pctRaw) || pctRaw < 0 || pctRaw > 100)
    ) {
      errors.push(`Line ${lineNo + 1}: percentile must be between 0 and 100.`);
      return;
    }

    const externalPercentile =
      pctRaw !== undefined
        ? Math.round(pctRaw * 10) / 10
        : total !== undefined
          ? percentileFromRank(rank, total)
          : undefined;

    seen.add(student.id);
    rows.push({
      studentId: student.id,
      externalRank: rank,
      externalTotalStudents: total,
      externalPercentile
    });
  });

  return { rows, errors };
}

/**
 * Apply parsed rows to the result set for one exam. Existing rows get their
 * `external*` fields upserted; a learner with no internal result yet still gets
 * a row so the imported standing isn't lost (marks stay at 0 until the teacher
 * records them). Rows for other exams are returned untouched.
 */
export function mergeExternalResults(
  existing: ExamResult[],
  examId: string,
  rows: ExternalRankRow[]
): MergeExternalResult {
  const pending = new Map(rows.map(r => [r.studentId, r]));
  let updated = 0;

  const results = existing.map(res => {
    if (res.examId !== examId) return res;
    const row = pending.get(res.studentId);
    if (!row) return res;
    pending.delete(res.studentId);
    updated++;
    return {
      ...res,
      externalRank: row.externalRank,
      externalTotalStudents: row.externalTotalStudents,
      externalPercentile: row.externalPercentile
    };
  });

  const created: ExamResult[] = [];
  pending.forEach(row => {
    created.push({
      id: `res-${examId}-${row.studentId}`,
      examId,
      studentId: row.studentId,
      marksObtained: 0,
      percentage: 0,
      rank: 0,
      percentile: 0,
      status: 'graded',
      externalRank: row.externalRank,
      externalTotalStudents: row.externalTotalStudents,
      externalPercentile: row.externalPercentile
    });
  });

  return { results: [...results, ...created], updated, created: created.length };
}

/** Indian digit grouping: 4500 → "4,500", 450000 → "4,50,000". */
export function formatIndianNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = String(Math.abs(rounded));
  if (digits.length <= 3) return sign + digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${sign}${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/**
 * "All-India Rank #247 of 4,500" when the total is known, "#247" otherwise.
 * Returns null when no external rank has been imported — the caller should
 * then fall back to the internal batch standing.
 */
export function formatAllIndiaRank(result: Pick<ExamResult, 'externalRank' | 'externalTotalStudents'> | null | undefined): string | null {
  if (!result || !result.externalRank || result.externalRank <= 0) return null;
  if (result.externalTotalStudents && result.externalTotalStudents > 0) {
    return `#${formatIndianNumber(result.externalRank)} of ${formatIndianNumber(result.externalTotalStudents)}`;
  }
  return `#${formatIndianNumber(result.externalRank)}`;
}

/** Compact badge text ("AIR 247"), or null when no rank was imported. */
export function airBadge(result: Pick<ExamResult, 'externalRank'> | null | undefined): string | null {
  if (!result?.externalRank || result.externalRank <= 0) return null;
  return `AIR ${formatIndianNumber(result.externalRank)}`;
}

export interface ExternalStats {
  total: number;
  withAir: number;
  bestRank: number | null;
  averagePercentile: number | null;
}

/** Aggregate imported AIR coverage for one exam, for the admin summary line. */
export function externalStats(results: ExamResult[], examId: string): ExternalStats {
  const forExam = results.filter(r => r.examId === examId);
  const withAir = forExam.filter(r => !!r.externalRank && r.externalRank > 0);
  const pcts = withAir
    .map(r => r.externalPercentile)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p));
  return {
    total: forExam.length,
    withAir: withAir.length,
    bestRank: withAir.length ? Math.min(...withAir.map(r => r.externalRank as number)) : null,
    averagePercentile: pcts.length
      ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10
      : null
  };
}