/**
 * VidyaOS syllabus coverage (F7) — pure, dependency-free helpers.
 *
 * Same philosophy as `lib/finance.ts`, `lib/staffOps.ts` and `lib/timetable.ts`:
 * no Firestore imports, so the identical template generation and % coverage math
 * runs in the browser (admin/teacher/student portals) and in node (test-auth.ts).
 *
 * A batch's syllabus is a flat list of `SyllabusTopic` rows — one per chapter,
 * ordered by `sequence`. Teachers tick them off; admins can seed an entire
 * chapter list from a built-in board template with one click.
 */

import { IndianBoard, SyllabusStatus, SyllabusTopic } from '../types';

export const SYLLABUS_STATUSES: SyllabusStatus[] = ['not_started', 'in_progress', 'completed'];

export const SYLLABUS_STATUS_LABEL: Record<SyllabusStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed'
};

/** Ordering for progress bars / sorting: lower is "less done". */
export const SYLLABUS_STATUS_RANK: Record<SyllabusStatus, number> = {
  not_started: 0,
  in_progress: 1,
  completed: 2
};

// ---------------------------------------------------------------------------
// Board templates — the "Generate from template" seed data
// ---------------------------------------------------------------------------

export interface SyllabusTemplate {
  board: IndianBoard;
  classGrade: string;
  subject: string;
  /** Chapter titles, in teaching order. `sequence` is derived from the index. */
  chapters: string[];
}

export const SYLLABUS_TEMPLATES: SyllabusTemplate[] = [
  {
    board: 'CBSE',
    classGrade: 'Class 10',
    subject: 'Mathematics',
    chapters: [
      'Real Numbers',
      'Polynomials',
      'Pair of Linear Equations in Two Variables',
      'Quadratic Equations',
      'Arithmetic Progressions',
      'Triangles',
      'Coordinate Geometry',
      'Introduction to Trigonometry',
      'Some Applications of Trigonometry',
      'Circles',
      'Constructions',
      'Areas Related to Circles',
      'Surface Areas and Volumes',
      'Statistics',
      'Probability'
    ]
  },
  {
    board: 'CBSE',
    classGrade: 'Class 10',
    subject: 'Science',
    chapters: [
      'Chemical Reactions and Equations',
      'Acids, Bases and Salts',
      'Metals and Non-metals',
      'Carbon and its Compounds',
      'Life Processes',
      'Control and Coordination',
      'How do Organisms Reproduce?',
      'Heredity and Evolution',
      'Light – Reflection and Refraction',
      'The Human Eye and the Colourful World',
      'Electricity',
      'Magnetic Effects of Electric Current',
      'Our Environment'
    ]
  },
  {
    board: 'CBSE',
    classGrade: 'Class 12',
    subject: 'Physics',
    chapters: [
      'Electric Charges and Fields',
      'Electrostatic Potential and Capacitance',
      'Current Electricity',
      'Moving Charges and Magnetism',
      'Magnetism and Matter',
      'Electromagnetic Induction',
      'Alternating Current',
      'Electromagnetic Waves',
      'Ray Optics and Optical Instruments',
      'Wave Optics',
      'Dual Nature of Radiation and Matter',
      'Atoms',
      'Nuclei',
      'Semiconductor Electronics'
    ]
  },
  {
    board: 'CBSE',
    classGrade: 'Class 12',
    subject: 'Mathematics',
    chapters: [
      'Relations and Functions',
      'Inverse Trigonometric Functions',
      'Matrices',
      'Determinants',
      'Continuity and Differentiability',
      'Application of Derivatives',
      'Integrals',
      'Application of Integrals',
      'Differential Equations',
      'Vector Algebra',
      'Three Dimensional Geometry',
      'Linear Programming',
      'Probability'
    ]
  },
  {
    board: 'CBSE',
    classGrade: 'Class 9',
    subject: 'Mathematics',
    chapters: [
      'Number Systems',
      'Polynomials',
      'Coordinate Geometry',
      'Linear Equations in Two Variables',
      "Introduction to Euclid's Geometry",
      'Lines and Angles',
      'Triangles',
      'Quadrilaterals',
      'Circles',
      "Heron's Formula",
      'Surface Areas and Volumes',
      'Statistics'
    ]
  }
];

/** Case-insensitive, order-insensitive subject match ("Science (Physics & Chemistry)" ⊃ "Science"). */
function subjectMatches(templateSubject: string, wanted: string): boolean {
  const a = templateSubject.trim().toLowerCase();
  const b = wanted.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** First template matching a board + class (+ fuzzy subject). */
export function findSyllabusTemplate(
  board: IndianBoard,
  classGrade: string,
  subject: string
): SyllabusTemplate | undefined {
  return SYLLABUS_TEMPLATES.find(
    t =>
      t.board === board &&
      t.classGrade.trim().toLowerCase() === classGrade.trim().toLowerCase() &&
      subjectMatches(t.subject, subject)
  );
}

export function syllabusTemplatesFor(board?: IndianBoard, classGrade?: string): SyllabusTemplate[] {
  return SYLLABUS_TEMPLATES.filter(
    t =>
      (!board || t.board === board) &&
      (!classGrade || t.classGrade.trim().toLowerCase() === classGrade.trim().toLowerCase())
  );
}

/** Distinct boards/classes/subjects, for building the admin picker. */
export function templateOptions() {
  const boards = Array.from(new Set(SYLLABUS_TEMPLATES.map(t => t.board)));
  const classes = Array.from(new Set(SYLLABUS_TEMPLATES.map(t => t.classGrade)));
  const subjects = Array.from(new Set(SYLLABUS_TEMPLATES.map(t => t.subject)));
  return { boards, classes, subjects };
}

// ---------------------------------------------------------------------------
// Template → rows
// ---------------------------------------------------------------------------

export interface BuildTopicsMeta {
  orgId: string;
  branchId: string;
  batchId: string;
  /** Defaults to the template's own subject/class/board. */
  subject?: string;
  classGrade?: string;
  board?: IndianBoard;
  /** Row ids become `${idPrefix}-1`, `-2`, … (unique + testable). */
  idPrefix?: string;
  createdAt?: string;
}

/** Turn a template's chapter list into fresh, not-started `SyllabusTopic` rows. */
export function buildTopicsFromTemplate(
  template: SyllabusTemplate,
  meta: BuildTopicsMeta
): SyllabusTopic[] {
  const createdAt = meta.createdAt || new Date().toISOString();
  const prefix = meta.idPrefix || 'syl';
  return template.chapters.map((title, index) => ({
    id: `${prefix}-${index + 1}`,
    orgId: meta.orgId,
    branchId: meta.branchId,
    batchId: meta.batchId,
    subject: meta.subject || template.subject,
    classGrade: meta.classGrade || template.classGrade,
    board: meta.board || template.board,
    chapter: `Chapter ${index + 1}`,
    title,
    sequence: index + 1,
    status: 'not_started' as SyllabusStatus,
    createdAt
  }));
}

// ---------------------------------------------------------------------------
// Coverage math
// ---------------------------------------------------------------------------

export function countByStatus(topics: SyllabusTopic[]): Record<SyllabusStatus, number> {
  const counts: Record<SyllabusStatus, number> = { not_started: 0, in_progress: 0, completed: 0 };
  for (const topic of topics) {
    if (topic.status in counts) counts[topic.status] += 1;
  }
  return counts;
}

/** Completed share of the syllabus, rounded to a whole percent (0 when empty). */
export function coveragePct(topics: SyllabusTopic[]): number {
  if (topics.length === 0) return 0;
  const { completed } = countByStatus(topics);
  return Math.round((completed / topics.length) * 100);
}

/**
 * "Weighted" progress that counts an in-progress chapter as half-covered — used
 * for the student/parent bar so ticking a chapter visibly moves the needle.
 */
export function weightedCoveragePct(topics: SyllabusTopic[]): number {
  if (topics.length === 0) return 0;
  const { completed, in_progress } = countByStatus(topics);
  return Math.round(((completed + in_progress * 0.5) / topics.length) * 100);
}

export function sortTopicsBySequence(topics: SyllabusTopic[]): SyllabusTopic[] {
  return [...topics].sort((a, b) => {
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    return a.title.localeCompare(b.title);
  });
}

export function topicsForBatch(topics: SyllabusTopic[], batchId: string): SyllabusTopic[] {
  return sortTopicsBySequence(topics.filter(t => t.batchId === batchId));
}

/** The next chapter a teacher should pick up (first not-started, else first in-progress). */
export function nextTopicForBatch(topics: SyllabusTopic[], batchId: string): SyllabusTopic | undefined {
  const forBatch = topicsForBatch(topics, batchId);
  return forBatch.find(t => t.status === 'not_started') || forBatch.find(t => t.status === 'in_progress');
}

export interface BatchCoverage {
  batchId: string;
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  pct: number;
}

/** Per-batch coverage rows for the admin overview (in the order batches are given). */
export function batchCoverage(
  topics: SyllabusTopic[],
  batches: { id: string }[]
): BatchCoverage[] {
  return batches.map(batch => {
    const forBatch = topics.filter(t => t.batchId === batch.id);
    const counts = countByStatus(forBatch);
    return {
      batchId: batch.id,
      total: forBatch.length,
      completed: counts.completed,
      inProgress: counts.in_progress,
      notStarted: counts.not_started,
      pct: coveragePct(forBatch)
    };
  });
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

/** One tap moves a chapter forward: not started → in progress → completed → reset. */
export function advanceStatus(current: SyllabusStatus): SyllabusStatus {
  if (current === 'not_started') return 'in_progress';
  if (current === 'in_progress') return 'completed';
  return 'not_started';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface SyllabusTopicInput {
  batchId: string;
  chapter: string;
  title: string;
  status: SyllabusStatus;
  sequence?: number;
}

/** Returns an error sentence, or null when the topic row is well-formed. */
export function validateSyllabusTopic(input: SyllabusTopicInput): string | null {
  if (!input.batchId) return 'Choose the batch this chapter belongs to.';
  if (!input.chapter.trim()) return 'Give the chapter a number or name.';
  if (!input.title.trim()) return 'Give the chapter a title.';
  if (!SYLLABUS_STATUSES.includes(input.status)) return 'Unknown coverage status.';
  if (input.sequence != null && (!Number.isFinite(input.sequence) || input.sequence < 0)) {
    return 'Sequence must be a positive number.';
  }
  return null;
}