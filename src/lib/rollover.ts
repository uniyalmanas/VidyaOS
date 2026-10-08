import { Batch, Student } from '../types';

// F12 — Session rollover (new academic year).
//
// One wizard takes every active batch + its active students and prepares next
// year's setup: a fresh batch per class/subject, the old batch marked completed,
// and a first-month invoice per carried student. Everything in this module is
// pure so the preview the admin reviews is exactly what the unit suite can
// exercise — the provider only does the Firestore writes.

export const FIRST_MONTH_LABEL = 'April';
export const FIRST_INVOICE_DUE_DAY = 10;

export interface RolloverInvoiceDraft {
  /** Maps back to the new batch created from this plan row. */
  planKey: string;
  studentId: string;
  branchId: string;
  monthYear: string;
  title: string;
  amount: number;
  dueDate: string;
}

export interface RolloverBatchPlan {
  sourceBatchId: string;
  sourceName: string;
  subject: string;
  fromClassGrade: string;
  /** `null` when the class graduates (e.g. Class 12) and has no next year. */
  toClassGrade: string | null;
  isTerminal: boolean;
  /** Stable id the new batch is deduped against. Empty for a terminal class. */
  targetBatchId: string;
  newName: string;
  carriedStudentIds: string[];
  carriedStudentNames: string[];
  teacherId: string;
  branchId: string;
  classroom: string;
  scheduleDays: Batch['scheduleDays'];
  timeSlot: string;
  capacity: number;
  feeAmountMonthly: number;
  /** `null` when this row rolls forward; otherwise the reason it is left behind. */
  skipReason: string | null;
}

export interface RolloverPlan {
  fromYear: string;
  toYear: string;
  firstInvoiceMonth: string;
  firstInvoiceDueDate: string;
  batches: RolloverBatchPlan[];
  newBatchCount: number;
  carriedStudentCount: number;
  invoiceCount: number;
  invoices: RolloverInvoiceDraft[];
}

export interface BuildRolloverPlanParams {
  batches: Batch[];
  students: Student[];
  fromYear: string;
  toYear: string;
  /** Ids already present in the next year, used to skip a duplicate rollover. */
  existingBatchIds?: string[];
  /** Admin-editable monthly fee per source batch id. */
  feeOverrides?: Record<string, number>;
}

/** The numeric class level (1–12) or `null` when the label has no usable class. */
export function classLevel(grade: string): number | null {
  const match = /(\d{1,2})/.exec(grade || '');
  if (!match) return null;
  const level = Number(match[1]);
  if (!Number.isInteger(level) || level < 1 || level > 12) return null;
  return level;
}

/**
 * The class a batch rolls into next year, keeping the label's own style
 * ("Class 9" → "Class 10", "Grade-9" → "Grade-10"). `null` when the class
 * graduates (Class 12) or the label carries no class number.
 */
export function nextClassGrade(grade: string): string | null {
  const level = classLevel(grade);
  if (level === null) return null;
  if (level >= 12) return null;
  const match = /(\d{1,2})/.exec(grade) as RegExpExecArray;
  const prefix = grade.slice(0, match.index);
  return `${prefix}${level + 1}`;
}

/** Parses "2026-2027" → [2026, 2027]; `null` when the span is malformed. */
export function academicYearSpan(year: string): [number, number] | null {
  const match = /^(\d{4})\s*[-–]\s*(\d{4})$/.exec((year || '').trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

/** The first calendar year of an academic year, e.g. "2026-2027" → 2026. */
export function academicYearStartYear(year: string): number | null {
  const span = academicYearSpan(year);
  return span ? span[0] : null;
}

/** Rolls an academic-year label forward one year. Malformed labels pass through. */
export function nextAcademicYear(year: string): string {
  const span = academicYearSpan(year);
  if (!span) return year;
  return `${span[0] + 1}-${span[1] + 1}`;
}

/** Lower-case, hyphenated key for ids ("Class 10" / "Math & Logic" → class-10-math-logic). */
export function slugify(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Deterministic next-year batch id, e.g. `batch-class-10-mathematics-2027-2028`. */
export function rolloverBatchId(nextGrade: string, subject: string, toYear: string): string {
  return `batch-${slugify(nextGrade)}-${slugify(subject)}-${toYear}`;
}

/** Rename a batch for the new session, swapping the class label it carries. */
export function renameBatchForNextYear(name: string, fromGrade: string, toGrade: string): string {
  if (!toGrade) return name;
  if (fromGrade && name.includes(fromGrade)) {
    return name.replace(fromGrade, toGrade);
  }
  return `${toGrade} · ${name}`;
}

/** The first (April) month label of an academic year, e.g. "2027-2028" → "April 2027". */
export function firstInvoiceMonth(toYear: string): string {
  const start = academicYearStartYear(toYear);
  if (start === null) return `April ${new Date().getFullYear()}`;
  return `${FIRST_MONTH_LABEL} ${start}`;
}

/** The first-month fee due date (10th April of the year the session starts). */
export function firstInvoiceDueDate(toYear: string): string {
  const start = academicYearStartYear(toYear);
  if (start === null) return '';
  const day = String(FIRST_INVOICE_DUE_DAY).padStart(2, '0');
  return `${start}-04-${day}`;
}

/**
 * Build the dry-run plan grouped by batch. Rows that must not roll (a graduating
 * class, a duplicate class/subject, or no active students) stay in the list with
 * a `skipReason` so the admin sees why nothing was created for them.
 */
export function buildRolloverPlan(params: BuildRolloverPlanParams): RolloverPlan {
  const studentById = new Map(params.students.map(student => [student.id, student]));
  const existing = new Set(params.existingBatchIds || []);
  const seenTargets = new Set<string>();
  const carriedStudents = new Set<string>();
  const planBatches: RolloverBatchPlan[] = [];
  const invoices: RolloverInvoiceDraft[] = [];

  for (const batch of params.batches) {
    if (batch.status !== 'active') continue;

    const toClassGrade = nextClassGrade(batch.classGrade);
    const targetBatchId = toClassGrade
      ? rolloverBatchId(toClassGrade, batch.subject, params.toYear)
      : '';

    const carriedStudentIds = batch.studentIds.filter(id => {
      const student = studentById.get(id);
      return !!student && student.status === 'active';
    });
    const carriedStudentNames = carriedStudentIds.map(id => studentById.get(id)!.name);

    let skipReason: string | null = null;
    if (!toClassGrade) {
      skipReason = `${batch.classGrade} graduates — no next-year class`;
    } else if (existing.has(targetBatchId)) {
      skipReason = 'A next-year batch for this class & subject already exists';
    } else if (seenTargets.has(targetBatchId)) {
      skipReason = 'Another batch already rolls into this class & subject';
    } else if (carriedStudentIds.length === 0) {
      skipReason = 'No active students to carry forward';
    }

    const feeAmountMonthly = params.feeOverrides?.[batch.id] ?? batch.feeAmountMonthly;

    planBatches.push({
      sourceBatchId: batch.id,
      sourceName: batch.name,
      subject: batch.subject,
      fromClassGrade: batch.classGrade,
      toClassGrade,
      isTerminal: toClassGrade === null,
      targetBatchId,
      newName: toClassGrade
        ? renameBatchForNextYear(batch.name, batch.classGrade, toClassGrade)
        : batch.name,
      carriedStudentIds,
      carriedStudentNames,
      teacherId: batch.teacherId,
      branchId: batch.branchId,
      classroom: batch.classroom,
      scheduleDays: batch.scheduleDays,
      timeSlot: batch.timeSlot,
      capacity: batch.capacity,
      feeAmountMonthly,
      skipReason
    });

    // A skipped row reserves nothing: a later batch can still roll into the slot.
    if (skipReason || !toClassGrade) continue;

    seenTargets.add(targetBatchId);
    const monthYear = firstInvoiceMonth(params.toYear);
    const dueDate = firstInvoiceDueDate(params.toYear);
    for (const studentId of carriedStudentIds) {
      carriedStudents.add(studentId);
      invoices.push({
        planKey: targetBatchId,
        studentId,
        branchId: batch.branchId,
        monthYear,
        title: `${monthYear} Tuition Fee — ${renameBatchForNextYear(batch.name, batch.classGrade, toClassGrade)}`,
        amount: feeAmountMonthly,
        dueDate
      });
    }
  }

  return {
    fromYear: params.fromYear,
    toYear: params.toYear,
    firstInvoiceMonth: firstInvoiceMonth(params.toYear),
    firstInvoiceDueDate: firstInvoiceDueDate(params.toYear),
    batches: planBatches,
    newBatchCount: planBatches.filter(item => !item.skipReason).length,
    carriedStudentCount: carriedStudents.size,
    invoiceCount: invoices.length,
    invoices
  };
}

/** The next year after the latest active batch's academic year. */
export function suggestedRolloverYears(batches: Batch[]): { fromYear: string; toYear: string } | null {
  const years = batches
    .map(batch => batch.academicYear)
    .filter(year => academicYearSpan(year) !== null);
  if (years.length === 0) return null;
  const fromYear = years.reduce((latest, year) => {
    const latestStart = academicYearStartYear(latest) ?? 0;
    const yearStart = academicYearStartYear(year) ?? 0;
    return yearStart > latestStart ? year : latest;
  });
  return { fromYear, toYear: nextAcademicYear(fromYear) };
}