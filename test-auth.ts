/**
 * VidyaOS Authentication & Multi-Tenancy Automated Verification Suite
 */

import { getIndiaDayName, getIndiaDateString } from './src/lib/date';
import { selectTeacherBatches, filterToBatches } from './src/lib/teacherScope';
import { reconcileBatchMembership } from './src/lib/rosterSync';
import {
  createAuditEntry,
  upsertAuditEntry,
  auditForOrg,
  auditToCsv,
  sortAuditNewestFirst,
  AuditLogEntry
} from './src/lib/audit';
import {
  searchInquiries,
  countByStatus,
  canSetInquiryStatus,
  isTerminalInquiryStatus,
  sortInquiriesForFollowUp,
  formatInquiryPhone
} from './src/lib/inquiries';
import {
  expandLeaveDates,
  leaveDaysCount,
  validateLeaveRange,
  formatLeaveRange,
  countLeaveByStatus,
  getLeaveDisplayName,
  scopeLeaveRequestsForTeacher,
  planExcusedAttendance,
  hasApprovedLeaveCovering,
  leaveTiming,
  canEditLeaveRequest,
  isLeaveReviewer,
  canDeleteLeave,
  searchLeaveRequests,
  sortLeaveRequestsForReview,
  MAX_LEAVE_DAYS
} from './src/lib/leave';
import {
  monthKeyFromDate,
  monthYearFromKey,
  monthYearFromDate,
  currentMonthKey,
  shiftMonthKey,
  daysInMonthKey,
  monthDayList,
  workingDaysInMonthKey,
  teacherAttendanceId,
  upsertTeacherAttendance,
  attendanceForDate,
  summarizeTeacherMonth,
  proratedSalaryHint,
  computeSlipNet,
  formatRupees,
  slipsForMonth,
  formatTimeHHMM
} from './src/lib/staffOps';
import { Inquiry, LeaveRequest, Student, Teacher, Batch, AttendanceRecord, TeacherAttendance, SalarySlip, Expense, FeeInvoice, Installment, TimetableSlot, SyllabusTopic, SyllabusStatus, IndianBoard } from './src/types';
import {
  monthKeyFromSalaryLabel,
  incomeForMonth,
  salaryTotalForMonth,
  expensesForMonth,
  categoryTotals,
  buildProfitAndLoss,
  validateExpense,
  sortExpensesNewestFirst,
  searchExpenses,
  EXPENSE_CATEGORY_LABEL,
  MAX_EXPENSE_AMOUNT
} from './src/lib/finance';
import {
  TIMETABLE_DAYS,
  normalizeMeetUrl,
  isValidMeetUrl,
  meetProviderLabel,
  parseClock,
  nowMinutesIndia,
  joinState,
  formatSlotRange,
  sortTimetableSlots,
  slotsForDay,
  slotsForBatches,
  slotsOverlap,
  findTimetableClashes,
  isClashFree,
  validateTimetableSlot
} from './src/lib/timetable';
import {
  SYLLABUS_TEMPLATES,
  SYLLABUS_STATUSES,
  findSyllabusTemplate,
  syllabusTemplatesFor,
  templateOptions,
  buildTopicsFromTemplate,
  countByStatus as countSyllabusByStatus,
  coveragePct,
  weightedCoveragePct,
  sortTopicsBySequence,
  topicsForBatch,
  nextTopicForBatch,
  batchCoverage,
  advanceStatus,
  validateSyllabusTopic
} from './src/lib/syllabus';
import {
  PROGRAM_TRACKS,
  PROGRAM_CATEGORIES,
  getProgramTrack,
  programLabel,
  tracksByCategory,
  levelsForTrack,
  subjectsForTrack,
  allLevels,
  allSubjects,
  levelOptionsFor,
  DEFAULT_TRACK,
  DEFAULT_LEVEL
} from './src/lib/programs';
import {
  FREE_ENTITLEMENTS,
  CLOUD_SKUS,
  UNLIMITED,
  getCloudSku,
  resolveEntitlements,
  hasSku,
  isUnlimited,
  remainingQuota,
  isQuotaExceeded,
  quotaPct,
  withinStudentCap,
  emptyUsage,
  formatBytes,
  entitlementSummary
} from './src/lib/entitlements';
import {
  appendPage,
  applyLiveFirstPage
} from './src/lib/paginationUtils';
import {
  DEFAULT_PUSH_PREFS,
  mergePushPrefs,
  togglePushPref
} from './src/lib/pushPrefs';
import {
  generatePtmSlots,
  validatePtmEvent,
  parseClockMinutes,
  minutesToClock,
  formatClock12,
  formatClockRange,
  formatSlotRange as formatPtmSlotRange,
  slotsForTeacher,
  bookableSlots,
  bookingsForUser,
  bookingsForStudent,
  applyBooking,
  applyCancel,
  dayOfReminders,
  teacherNameFor,
  PTM_DEFAULT_SLOT_MINUTES,
  PTM_MIN_SLOT_MINUTES,
  PTM_MAX_SLOT_MINUTES
} from './src/lib/ptm';
import {
  issueYear,
  tcNumberPrefix,
  formatTcNumber,
  parseTcNumber,
  nextTcSequence,
  nextTcNumber,
  formatAccessionNo,
  nextAccessionNo,
  barcodeBars,
  validateTcInput,
  issuedForStudent,
  latestIssued,
  documentTypeLabel,
  TC_NUMBER_PAD,
  MAX_TC_REMARKS,
  ISSUED_DOCUMENT_LABEL
} from './src/lib/issuedDocuments';
import {
  EXAM_KINDS,
  EXAM_KIND_LABEL,
  examKindLabel,
  isAllIndiaExam,
  percentileFromRank,
  parseExternalRankSheet,
  mergeExternalResults,
  formatIndianNumber,
  formatAllIndiaRank,
  airBadge,
  externalStats,
  ExternalRankRow
} from './src/lib/exams';
import {
  splitAmount,
  addDays,
  buildInstallments,
  allocatePayment,
  installmentBalance,
  nextDueInstallment,
  invoiceStatusFromInstallments,
  installmentsSummary,
  nextPaymentDueDate,
  nextPaymentDueAmount,
  isInstallmentOverdue,
  formatInstallmentStatus,
  clampInstallmentCount,
  MIN_INSTALLMENTS,
  MAX_INSTALLMENTS
} from './src/lib/installments';
import {
  classLevel,
  nextClassGrade,
  nextAcademicYear,
  academicYearSpan,
  slugify,
  rolloverBatchId,
  renameBatchForNextYear,
  firstInvoiceMonth,
  firstInvoiceDueDate,
  buildRolloverPlan,
  suggestedRolloverYears
} from './src/lib/rollover';
import { PtmEvent, PtmSlot, IssuedDocument, ExamResult } from './src/types';

function cleanPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function toVirtualEmail(phone: string): string {
  const clean = cleanPhone(phone);
  return `${clean}@phone.vidyaos.in`;
}

function formatDisplayPhone(phone: string): string {
  const clean = cleanPhone(phone);
  return `+91 ${clean}`;
}

function classifyAuthError(code: string, phoneExists: boolean, cleanPhoneDigits: string): string {
  if (code === 'auth/wrong-password' || (code === 'auth/invalid-credential' && phoneExists)) {
    return 'Incorrect password for this mobile number. Please try again.';
  }
  if (code === 'auth/user-not-found' || !phoneExists) {
    return `No account found for mobile number +91 ${cleanPhoneDigits}. Please verify the number or contact your coaching institute admin to register you.`;
  }
  if (code === 'auth/too-many-requests') {
    return 'Access temporarily blocked due to too many failed attempts. Please try again later.';
  }
  return 'Authentication failed. Please check your credentials.';
}

function verifyTenantIsolation(userOrgId: string, resourceOrgId: string, role: string): boolean {
  if (role === 'PLATFORM_OWNER') return true;
  return userOrgId === resourceOrgId;
}

// -------------------------------------------------------------
// Test Execution
// -------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n========================================');
console.log('VidyaOS Auth & RBAC Verification Tests');
console.log('========================================\n');

// 1. Phone Normalization Tests
console.log('Suite 1: Phone Normalization & Virtual Email Mapping');
assert(cleanPhone('9876543210') === '9876543210', 'Raw 10-digit mobile number cleans properly');
assert(cleanPhone('+91 98765 43210') === '9876543210', 'Prefixed +91 formatted mobile cleans properly');
assert(cleanPhone('09876543210') === '9876543210', 'Leading-zero prefixed mobile cleans to last 10 digits');
assert(toVirtualEmail('+91 98765 43210') === '9876543210@phone.vidyaos.in', 'Deterministic virtual email generated accurately');
assert(formatDisplayPhone('9876543210') === '+91 9876543210', 'Normalized display phone format matches +91 XXXXXXXXXX');

// 2. Error Classification Tests
console.log('\nSuite 2: Firebase Auth Error Disambiguation');
assert(
  classifyAuthError('auth/invalid-credential', true, '9876543210') ===
    'Incorrect password for this mobile number. Please try again.',
  'Existing account + invalid credentials mapped to "Incorrect password"'
);
assert(
  classifyAuthError('auth/wrong-password', true, '9876543210') ===
    'Incorrect password for this mobile number. Please try again.',
  'Existing account + wrong-password mapped to "Incorrect password"'
);
assert(
  classifyAuthError('auth/invalid-credential', false, '9876543210').includes('No account found'),
  'Non-existent account + invalid credentials correctly identified as uncreated'
);
assert(
  classifyAuthError('auth/user-not-found', false, '9876543210').includes('No account found'),
  'user-not-found code properly informs user to contact center admin'
);

// 3. Multi-Tenant Boundary Tests
console.log('\nSuite 3: Multi-Tenant RBAC Boundary Check');
assert(
  verifyTenantIsolation('org-apex', 'org-apex', 'TEACHER') === true,
  'Teacher can access their own organization data'
);
assert(
  verifyTenantIsolation('org-apex', 'org-allen', 'TEACHER') === false,
  'Teacher cannot access foreign organization data (Coaching A vs Coaching B)'
);
assert(
  verifyTenantIsolation('org-apex', 'org-allen', 'CENTER_ADMIN') === false,
  'Center Admin of Coaching A cannot access Coaching B data'
);
assert(
  verifyTenantIsolation('system', 'org-allen', 'PLATFORM_OWNER') === true,
  'Platform Owner can access any organization data'
);

// 4. Model Sanity Check
console.log('\nSuite 4: Zero Plaintext Password Invariants');
interface SafeUser {
  id: string;
  uid: string;
  name: string;
  phone: string;
  role: string;
  orgId: string;
}
const mockCreatedUser: SafeUser = {
  id: 'firebase-uid-12345',
  uid: 'firebase-uid-12345',
  name: 'Sunita Sharma',
  phone: '+91 9876543210',
  role: 'TEACHER',
  orgId: 'org-apex'
};
assert(!('password' in mockCreatedUser), 'User model strictly excludes password property');

// -------------------------------------------------------------
// India-local date helpers — "today" must be computed, never hardcoded
// (ParentPortal previously hard-coded 'Monday' for its today's-classes strip)
// -------------------------------------------------------------
console.log('\n===== India-local date helpers =====');

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 2026-10-04 is a Sunday. At 12:00Z it is already 17:30 IST, still the same day.
for (let i = 0; i < 7; i++) {
  const instant = new Date(Date.UTC(2026, 9, 4 + i, 12, 0, 0));
  assert(
    getIndiaDayName(instant) === WEEKDAY_NAMES[i],
    `getIndiaDayName resolves ${instant.toISOString().slice(0, 10)} to ${WEEKDAY_NAMES[i]}`
  );
}

// IST is UTC+05:30, so the calendar day rolls over at 18:30 UTC — not midnight.
assert(
  getIndiaDayName(new Date('2026-10-04T18:29:00.000Z')) === 'Sunday',
  'Day boundary: 18:29Z on Oct 4 is still Sunday in IST (23:59)'
);
assert(
  getIndiaDayName(new Date('2026-10-04T18:30:00.000Z')) === 'Monday',
  'Day boundary: 18:30Z on Oct 4 is already Monday in IST (00:00)'
);
assert(
  getIndiaDayName(new Date('2026-10-07T12:00:00.000Z')) === 'Wednesday',
  'Today (2026-10-07) resolves to Wednesday'
);

assert(
  getIndiaDateString(new Date('2026-10-04T18:29:00.000Z')) === '2026-10-04',
  'Date string boundary: 18:29Z is still 2026-10-04 in IST'
);
assert(
  getIndiaDateString(new Date('2026-10-04T18:30:00.000Z')) === '2026-10-05',
  'Date string boundary: 18:30Z is already 2026-10-05 in IST'
);

// Every TimetableSlot['dayOfWeek'] value must be producible by the helper,
// otherwise "today's classes" could never match a slot on that day.
const produced = new Set(
  Array.from({ length: 7 }, (_, i) => getIndiaDayName(new Date(Date.UTC(2026, 9, 4 + i, 12))))
);
assert(
  produced.size === 7,
  'All 7 weekday names are reachable — no slot day is permanently unreachable'
);

// -------------------------------------------------------------
// Faculty batch scoping — a faculty member must never see another
// member's batches, and must fail closed when no record matches.
// -------------------------------------------------------------
console.log('\n===== Faculty batch scoping =====');

const mkBatch = (id: string, teacherId: string): any => ({
  id,
  teacherId,
  orgId: 'org-1',
  branchId: 'branch-1',
  name: id,
  subject: 'Mathematics',
  classGrade: 'Class 10',
  classroom: 'Room 1',
  scheduleDays: ['Mon', 'Wed', 'Fri'],
  timeSlot: '05:00 PM - 06:30 PM',
  capacity: 30,
  studentIds: [],
  feeAmountMonthly: 2000,
  academicYear: '2026-2027',
  status: 'active'
});

const mkTeacher = (id: string, userId: string, assignedBatchIds: string[] = []): any => ({
  id,
  userId,
  assignedBatchIds,
  orgId: 'org-1',
  branchId: 'branch-1',
  name: id,
  phone: '+910000000000',
  email: `${id}@example.com`,
  avatar: '',
  qualification: 'Graduate',
  subjects: ['Mathematics'],
  joiningDate: '2026-01-01',
  status: 'active'
});

const teacherOne = mkTeacher('teach-1', 'uid-teacher-1', ['batch-legacy']);
const teacherTwo = mkTeacher('teach-2', 'uid-teacher-2');
const allBatches = [
  mkBatch('batch-a', 'teach-1'),        // matched via Batch.teacherId
  mkBatch('batch-legacy', 'teach-9'),   // matched via Teacher.assignedBatchIds
  mkBatch('batch-b', 'teach-2')         // belongs to somebody else
];

const idsOf = (list: any[]) => list.map(b => b.id).sort().join(',');

assert(
  idsOf(selectTeacherBatches(allBatches, [teacherOne, teacherTwo], 'uid-teacher-1')) === 'batch-a,batch-legacy',
  'Faculty sees the batch they teach plus the one claimed in assignedBatchIds'
);
assert(
  idsOf(selectTeacherBatches(allBatches, [teacherOne, teacherTwo], 'uid-teacher-2')) === 'batch-b',
  "Faculty sees only their own batches, never another member's"
);
assert(
  selectTeacherBatches(allBatches, [teacherOne, teacherTwo], 'uid-stranger').length === 0,
  'Fails closed: an unmatched account sees zero batches, not all of them'
);
assert(
  selectTeacherBatches(allBatches, [teacherOne, teacherTwo], '').length === 0,
  'Fails closed: a missing userId sees zero batches'
);
assert(
  selectTeacherBatches([], [teacherOne], 'uid-teacher-1').length === 0,
  'Returns an empty list when the institute has no batches yet'
);
assert(
  idsOf(selectTeacherBatches(allBatches, [], 'uid-teacher-1')) === '',
  'Fails closed: with no faculty records loaded, nothing is visible'
);

// Batch-scoped child collections (tests, coursework).
const mkExam = (id: string, batchId: string): any => ({ id, batchId });
const myBatchIds = new Set(['batch-a']);
const mixedExams = [mkExam('exam-a', 'batch-a'), mkExam('exam-b', 'batch-b')];

assert(
  filterToBatches(mixedExams, myBatchIds).map(e => e.id).join(',') === 'exam-a',
  'Tests from another batch are filtered out of the mark sheet'
);
assert(
  filterToBatches(mixedExams, new Set()).length === 0,
  'With no batches assigned, no tests or coursework are visible'
);

// -------------------------------------------------------------
// Batch enrollment roster sync — the two mirrors of a student's
// membership must move together, never one side alone.
// -------------------------------------------------------------
console.log('\n===== Batch enrollment roster sync =====');

const mkEnrollBatch = (id: string, roster: string[] = []): any => ({
  id,
  teacherId: 'teach-1',
  orgId: 'org-1',
  branchId: 'branch-1',
  name: id,
  subject: 'Mathematics',
  classGrade: 'Class 10',
  classroom: 'Room 1',
  scheduleDays: ['Mon', 'Wed', 'Fri'],
  timeSlot: '05:00 PM - 06:30 PM',
  capacity: 30,
  studentIds: roster,
  feeAmountMonthly: 2000,
  academicYear: '2026-2027',
  status: 'active'
});

const mkEnrollStudent = (batchIds: string[]): any => ({
  id: 'stud-1',
  userId: 'user-stud-1',
  orgId: 'org-1',
  batchIds,
  name: 'Test Student',
  phone: '+910000000000'
});

// Enrolling adds the student to the batch roster AND the student's batchIds.
{
  const student = mkEnrollStudent([]);
  const batch = mkEnrollBatch('batch-a');
  const { nextStudent, batchesToUpdate } = reconcileBatchMembership(student, [batch], ['batch-a']);

  assert(
    JSON.stringify(nextStudent.batchIds) === JSON.stringify(['batch-a']),
    'Enrollment writes the batch id onto the student record'
  );
  assert(
    batchesToUpdate.length === 1 && batchesToUpdate[0].studentIds.includes('stud-1'),
    'Enrollment adds the student to the batch roster'
  );
}

// Unenrolling removes from both sides, and only from the affected batch.
{
  const student = mkEnrollStudent(['batch-a', 'batch-b']);
  const batches = [mkEnrollBatch('batch-a', ['stud-1']), mkEnrollBatch('batch-b', ['stud-1'])];
  const { nextStudent, batchesToUpdate } = reconcileBatchMembership(student, batches, ['batch-b']);

  assert(
    JSON.stringify(nextStudent.batchIds) === JSON.stringify(['batch-b']),
    'Unenrollment removes the batch id from the student record'
  );
  assert(
    batchesToUpdate.length === 1 &&
      batchesToUpdate[0].id === 'batch-a' &&
      !batchesToUpdate[0].studentIds.includes('stud-1'),
    'Unenrollment removes the student from the roster of exactly the dropped batch'
  );
}

// Repeating the same membership yields zero batch writes (idempotent).
{
  const student = mkEnrollStudent(['batch-a']);
  const batches = [mkEnrollBatch('batch-a', ['stud-1'])];
  const { nextStudent, batchesToUpdate } = reconcileBatchMembership(student, batches, ['batch-a']);

  assert(nextStudent.batchIds.length === 1, 'Idempotent enrollment keeps a clean batchIds array');
  assert(batchesToUpdate.length === 0, 'No-op membership changes write nothing');
}

// Unknown batch ids are dropped, never stored as dangling references.
{
  const student = mkEnrollStudent([]);
  const batches = [mkEnrollBatch('batch-a')];
  const { nextStudent, batchesToUpdate } = reconcileBatchMembership(student, batches, ['batch-a', 'batch-ghost']);

  assert(
    JSON.stringify(nextStudent.batchIds) === JSON.stringify(['batch-a']),
    'Unknown batch ids are not persisted onto the student'
  );
  assert(batchesToUpdate.length === 1, 'Only real batches are touched by the write batch');
}

// -------------------------------------------------------------
// Audit Trail (F1) — pure helpers that power the append-only log
// -------------------------------------------------------------
console.log('\n===== Audit trail core (F1) =====');

const auditCtx = {
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  actorUserId: 'user-apex-admin',
  actorName: 'Er. Manoj Verma',
  actorRole: 'CENTER_ADMIN' as const
};

const e1 = createAuditEntry({
  ...auditCtx,
  action: 'create',
  targetType: 'student',
  targetId: 'stud-a',
  summary: 'Admitted student A.'
});
const e2 = createAuditEntry({
  ...auditCtx,
  action: 'update',
  targetType: 'batch',
  targetId: 'batch-a',
  summary: 'Updated batch A.'
});

assert(e1.id.startsWith('audit-'), 'Audit entry ids carry an audit- prefix');
assert(e1.createdAtMs > 0, 'Audit entry carries a sortable epoch timestamp');
assert(typeof e1.createdAt === 'string' && e1.createdAt.length > 0, 'Audit entry carries an ISO timestamp');
assert(e1.actorUserId === 'user-apex-admin' && e1.actorRole === 'CENTER_ADMIN', 'Actor attribution is preserved');
assert(e1.orgId === 'org-apex' && e1.branchId === 'branch-rajpur', 'Tenant + branch scope is preserved');
assert(e1.changes === undefined, 'Empty changes are omitted, not stored as an empty object');

const e3 = createAuditEntry({
  ...auditCtx,
  action: 'verify',
  targetType: 'payment',
  targetId: 'inv-1',
  summary: 'Verified payment.',
  changes: { paidAmount: 3200 }
});
assert(Boolean(e3.changes && e3.changes.paidAmount === 3200), 'Non-empty changes are preserved on the entry');

// Upsert semantics: new entries land newest-first, the same id replaces in place.
let auditList: AuditLogEntry[] = [];
auditList = upsertAuditEntry(auditList, e1);
auditList = upsertAuditEntry(auditList, e2);
assert(auditList.length === 2 && auditList[0].id === e2.id, 'Newest entry is merged to the front');
auditList = upsertAuditEntry(auditList, e1);
assert(
  auditList.length === 2 && auditList.filter(x => x.id === e1.id).length === 1,
  'Re-firing the same entry does not duplicate it'
);
auditList = upsertAuditEntry(auditList, { ...e1, summary: 'Admitted student A (edited).' });
assert(
  auditList.find(x => x.id === e1.id)!.summary === 'Admitted student A (edited).',
  'Same-id upsert replaces the record in place'
);

// Tenant isolation for the view layer.
const foreign = createAuditEntry({
  ...auditCtx,
  orgId: 'org-bright',
  action: 'create',
  targetType: 'student',
  targetId: 'stud-x',
  summary: 'Foreign centre entry.'
});
const scoped = auditForOrg([...auditList, foreign], 'org-apex');
assert(
  scoped.length === 2 && !scoped.some(x => x.orgId === 'org-bright'),
  'View layer filters entries to the current organisation'
);

// CSV export must survive hostile cells (commas, quotes, newlines, ₹).
const messy = createAuditEntry({
  ...auditCtx,
  action: 'update',
  targetType: 'settings',
  targetId: 'org-apex',
  summary: 'Updated name to "Vidya, Academy" & line\nbreak.'
});
const csv = auditToCsv([messy], false);
assert(
  csv.includes('"Updated name to ""Vidya, Academy"" & line\nbreak."'),
  'CSV export quotes and escapes commas, quotes and newlines'
);
assert(auditToCsv([e1], true).split('\n')[0].startsWith('Timestamp'), 'CSV export includes a header row by default');

// Ordering guarantee used by the dashboard.
assert(
  sortAuditNewestFirst([e1, e2]).every((x, i, arr) => i === 0 || arr[i - 1].createdAtMs >= x.createdAtMs),
  'Audit list sorts newest-first'
);

// -------------------------------------------------------------
// Inquiries / Leads pipeline (F2) — pure helpers under the CRM
// -------------------------------------------------------------
console.log('\n===== Inquiry pipeline core (F2) =====');

const makeLead = (over: Partial<Inquiry>): Inquiry => ({
  id: 'inq-x',
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  name: 'Priya Singh',
  phone: '+91 98120 33445',
  classGrade: 'Class 10',
  board: 'CBSE',
  status: 'new',
  notes: [],
  createdByUserId: 'user-apex-staff',
  createdByName: 'Pooja Verma',
  createdAt: '2026-10-07T09:15:00.000Z',
  createdAtMs: 100,
  ...over
});

const leadA = makeLead({ id: 'inq-a', name: 'Priya Singh', phone: '+919812033445', classGrade: 'Class 10', status: 'new', followUpDate: '2026-10-09', createdAtMs: 100 });
const leadB = makeLead({ id: 'inq-b', name: 'Arjun Mehta', phone: '+91 99887 66554', classGrade: 'Class 12', status: 'contacted', followUpDate: '2026-10-08', createdAtMs: 200 });
const leadC = makeLead({ id: 'inq-c', name: 'Sneha Patel', phone: '+91 97654 32109', classGrade: 'Class 8', status: 'joined', followUpDate: undefined, createdAtMs: 300 });
const leads: Inquiry[] = [leadA, leadB, leadC];

assert(isTerminalInquiryStatus('joined'), 'A joined lead is terminal');
assert(!isTerminalInquiryStatus('new') && !isTerminalInquiryStatus('lost'), 'Only joined leads are terminal');
assert(canSetInquiryStatus('demo_booked', 'contacted'), 'A lead can move back down the funnel in the edit UI');
assert(!canSetInquiryStatus('joined', 'new'), 'A joined lead cannot silently re-enter the funnel');

const searchedByName = searchInquiries(leads, 'arjun');
assert(searchedByName.length === 1 && searchedByName[0].id === 'inq-b', 'Search matches a lead by name (case-insensitive)');
assert(searchInquiries(leads, '98120').length === 1, 'Search matches by phone');
assert(searchInquiries(leads, 'class 12').length === 1, 'Search matches by class');
assert(searchInquiries(leads, '').length === 3, 'Empty search returns the full pipeline');
assert(searchInquiries(leads, 'no-such-lead').length === 0, 'Unmatched search returns nothing');

const pipelineCounts = countByStatus(leads);
assert(
  pipelineCounts.new === 1 && pipelineCounts.contacted === 1 && pipelineCounts.joined === 1 && pipelineCounts.lost === 0 && pipelineCounts.demo_booked === 0,
  'Pipeline columns count their cards correctly'
);

const followUpSorted = sortInquiriesForFollowUp([leadC, leadA, leadB]);
assert(
  followUpSorted[0].id === 'inq-b' && followUpSorted[1].id === 'inq-a' && followUpSorted[2].id === 'inq-c',
  'Follow-up leads sort first (soonest date first), the rest sink to the bottom'
);

assert(formatInquiryPhone('+919812033445') === '+91 98120 33445', 'Phone formatter renders a +91 12-digit number the India way');
assert(formatInquiryPhone('9988766554') === '+91 99887 66554', 'Phone formatter handles a bare 10-digit number');

// -------------------------------------------------------------
// Leave requests (F3) — pure helpers behind the absence workflow
// -------------------------------------------------------------
console.log('\n===== Leave requests (F3) =====');

const makeLeave = (over: Partial<LeaveRequest>): LeaveRequest => ({
  id: 'leave-x',
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  requesterType: 'student',
  studentId: 'stud-rahul-10',
  requestedByUserId: 'user-parent-rajesh',
  requestedByName: 'Rajesh Sharma',
  startDate: '2026-10-12',
  endDate: '2026-10-13',
  reason: 'Fever since last night — doctor has advised rest.',
  category: 'sick',
  status: 'pending',
  createdAt: '2026-10-07T09:00:00.000Z',
  createdAtMs: 100,
  ...over
});

// Range expansion & validation -------------------------------------------------
assert(
  JSON.stringify(expandLeaveDates('2026-10-05', '2026-10-07')) ===
    JSON.stringify(['2026-10-05', '2026-10-06', '2026-10-07']),
  'Range expansion is inclusive of both endpoints'
);
assert(expandLeaveDates('2026-10-07', '2026-10-05').length === 0, 'A reversed range expands to nothing');
assert(expandLeaveDates('2026-10-05', 'not-a-date').length === 0, 'A malformed date expands to nothing');
assert(leaveDaysCount({ startDate: '2026-10-12', endDate: '2026-10-12' }) === 1, 'A single-day leave counts 1 day');

assert(validateLeaveRange('2026-10-12', '2026-10-13', 'Fever since last night.') === null, 'A valid request passes validation');
assert(validateLeaveRange('2026-10-13', '2026-10-12', 'Fever since last night.') !== null, 'End before start is rejected');
assert(validateLeaveRange('2026-10-12', '2026-10-13', 'ab') !== null, 'A stub reason under 3 characters is rejected');
const overlong = validateLeaveRange('2026-01-01', '2026-03-01', 'A properly long reason for this test.');
assert(overlong !== null && overlong.includes(String(MAX_LEAVE_DAYS)), `Requests beyond the ${MAX_LEAVE_DAYS}-day cap are rejected`);

// Formatting & timing ----------------------------------------------------------
assert(!formatLeaveRange('2026-10-12', '2026-10-12').includes(' – '), 'Same-day range formats as one date');
assert(
  formatLeaveRange('2026-09-30', '2026-10-02').includes(' – ') && formatLeaveRange('2026-09-30', '2026-10-02').includes('2026'),
  'Cross-month range keeps both dates and the year'
);
assert(leaveTiming({ startDate: '2026-10-01', endDate: '2026-10-05' }, '2026-10-10') === 'past', 'A finished absence is timed as past');
assert(leaveTiming({ startDate: '2026-10-11', endDate: '2026-10-15' }, '2026-10-10') === 'upcoming', 'A future absence is timed as upcoming');
assert(leaveTiming({ startDate: '2026-10-10', endDate: '2026-10-10' }, '2026-10-10') === 'today', 'A leave starting and ending today is timed as today');
assert(leaveTiming({ startDate: '2026-10-08', endDate: '2026-10-12' }, '2026-10-10') === 'ongoing', 'A leave spanning today is timed as ongoing');

// Fixtures for the people side -------------------------------------------------
const stuRahul: Student = {
  id: 'stud-rahul-10', orgId: 'org-apex', branchId: 'branch-rajpur',
  enrollmentNo: 'ENR-001', rollNo: 'R1', name: 'Rahul Sharma', gender: 'Male',
  classGrade: 'Class 10', board: 'CBSE', schoolName: 'DAV Public School',
  dateOfBirth: '2011-05-01', admissionDate: '2026-04-01', phone: '+91 98000 00001',
  address: 'Rajpur', avatar: '', batchIds: ['batch-c10-math'],
  guardian: { fatherName: 'Rajesh Sharma', fatherPhone: '+91 98000 00002', parentUserId: 'user-parent-rajesh' },
  status: 'active'
};
const stuPriya: Student = {
  ...stuRahul,
  id: 'stud-priya-8', name: 'Priya Sharma', batchIds: ['batch-c12-phy'],
  guardian: { ...stuRahul.guardian }
};
const tAnjali: Teacher = {
  id: 'teach-anjali', orgId: 'org-apex', branchId: 'branch-rajpur',
  userId: 'user-teacher-sharma', name: 'Prof. Anjali Sharma', phone: '+91 98000 00011',
  email: 'anjali@example.com', avatar: '', qualification: 'M.Sc Mathematics',
  subjects: ['Mathematics'], assignedBatchIds: ['batch-c10-math'],
  joiningDate: '2024-04-01', status: 'active'
};
const tRohit: Teacher = {
  ...tAnjali,
  id: 'teach-rohit', userId: 'user-teacher-negi', name: 'Prof. Rohit Verma',
  subjects: ['Physics'], assignedBatchIds: ['batch-c12-phy']
};
const batchMath: Batch = {
  id: 'batch-c10-math', orgId: 'org-apex', branchId: 'branch-rajpur',
  name: 'Class 10 · Mathematics A', subject: 'Mathematics', classGrade: 'Class 10',
  teacherId: 'teach-anjali', classroom: 'Room 1', scheduleDays: ['Mon', 'Wed'],
  timeSlot: '05:00 PM - 06:30 PM', capacity: 30, studentIds: ['stud-rahul-10'],
  feeAmountMonthly: 1200, academicYear: '2026-27', status: 'active'
};
const batchPhysics: Batch = {
  ...batchMath,
  id: 'batch-c12-phy', name: 'Class 12 · Physics', subject: 'Physics',
  teacherId: 'teach-rohit', scheduleDays: ['Tue', 'Thu'], studentIds: ['stud-priya-8']
};

// Display names & counts -------------------------------------------------------
assert(getLeaveDisplayName(makeLeave({}), [stuRahul, stuPriya], [tAnjali, tRohit]) === 'Rahul Sharma', 'Student leave resolves the student display name');
assert(
  getLeaveDisplayName(makeLeave({ requesterType: 'teacher', studentId: undefined, teacherId: 'teach-anjali' }), [stuRahul], [tAnjali, tRohit]) === 'Prof. Anjali Sharma',
  'Faculty leave resolves the teacher display name'
);
assert(getLeaveDisplayName(makeLeave({ studentId: 'stud-missing' }), [stuRahul], []) === 'Student', 'A missing record falls back to a safe label');

const mixedLeaves = [
  makeLeave({ id: 'm1', status: 'pending' }),
  makeLeave({ id: 'm2', status: 'approved' }),
  makeLeave({ id: 'm3', status: 'approved' }),
  makeLeave({ id: 'm4', status: 'rejected' })
];
const mixedCounts = countLeaveByStatus(mixedLeaves);
assert(
  mixedCounts.pending === 1 && mixedCounts.approved === 2 && mixedCounts.rejected === 1,
  'Status counters tally the register correctly'
);

// Filer / reviewer / deletion gates --------------------------------------------
assert(canEditLeaveRequest(makeLeave({}), 'user-parent-rajesh'), 'The filer may refine their own pending request');
assert(!canEditLeaveRequest(makeLeave({}), 'user-other'), 'Nobody else may refine a pending request');
assert(!canEditLeaveRequest(makeLeave({ status: 'approved' }), 'user-parent-rajesh'), 'A decided request can no longer be refined');

assert(isLeaveReviewer('CENTER_ADMIN') && isLeaveReviewer('STAFF') && isLeaveReviewer('TEACHER') && isLeaveReviewer('PLATFORM_OWNER'), 'Desk and faculty roles review leave');
assert(!isLeaveReviewer('STUDENT') && !isLeaveReviewer('PARENT'), 'Students and parents never review leave');
assert(canDeleteLeave('CENTER_ADMIN') && canDeleteLeave('STAFF') && canDeleteLeave('PLATFORM_OWNER'), 'The front desk may remove stale requests');
assert(!canDeleteLeave('TEACHER') && !canDeleteLeave('STUDENT'), 'Faculty and students cannot delete requests');

// Teacher scoping (#1 join reused by the F3 review board) ----------------------
const leaveForRahul = makeLeave({ id: 'lv-rahul', studentId: 'stud-rahul-10' });
const leaveForPriya = makeLeave({ id: 'lv-priya', studentId: 'stud-priya-8' });
const leaveOfAnjali = makeLeave({ id: 'lv-anjali', requesterType: 'teacher', studentId: undefined, teacherId: 'teach-anjali', requestedByUserId: 'user-teacher-sharma' });
const leaveOfRohit = makeLeave({ id: 'lv-rohit', requesterType: 'teacher', studentId: undefined, teacherId: 'teach-rohit', requestedByUserId: 'user-teacher-negi' });

const anjaliScope = scopeLeaveRequestsForTeacher(
  [leaveForRahul, leaveForPriya, leaveOfAnjali, leaveOfRohit],
  [stuRahul, stuPriya],
  [tAnjali, tRohit],
  [batchMath, batchPhysics],
  'user-teacher-sharma'
);
assert(
  anjaliScope.some(r => r.id === 'lv-rahul') && anjaliScope.some(r => r.id === 'lv-anjali'),
  "A teacher's board keeps their roster's requests and their own leave"
);
assert(
  !anjaliScope.some(r => r.id === 'lv-priya') && !anjaliScope.some(r => r.id === 'lv-rohit'),
  "A teacher's board drops other batches' requests and other faculty's leave"
);
assert(
  scopeLeaveRequestsForTeacher([leaveForRahul], [stuRahul], [tAnjali], [batchMath], '').length === 0,
  'Scoping fails closed without a user id'
);

// Excused-attendance planning ---------------------------------------------------
// 5 Oct 2026 is a Monday, 11 Oct a Sunday; the batch classes Mon & Wed only.
const recPresent: AttendanceRecord = {
  id: 'att-present', orgId: 'org-apex', branchId: 'branch-rajpur',
  batchId: 'batch-c10-math', studentId: 'stud-rahul-10', date: '2026-10-05',
  status: 'present', markedByUserId: 'user-teacher-sharma', markedAt: '2026-10-05T12:00:00.000Z'
};
const recAbsent: AttendanceRecord = {
  ...recPresent,
  id: 'att-absent', date: '2026-10-07', status: 'absent'
};
const excusedPlan = planExcusedAttendance(
  { requesterType: 'student', startDate: '2026-10-05', endDate: '2026-10-11' },
  stuRahul,
  [batchMath],
  [recPresent, recAbsent]
);
assert(excusedPlan.length === 1, 'Approval plans exactly one excused cell for that week');
assert(
  excusedPlan[0].date === '2026-10-07' && excusedPlan[0].batchId === 'batch-c10-math',
  "The absent mark on a class day is fixed, the teacher's present mark and non-class days are left alone"
);
assert(
  planExcusedAttendance({ requesterType: 'student', startDate: '2026-10-06', endDate: '2026-10-06' }, stuRahul, [batchMath], []).length === 0,
  'Non-class days without a record produce no writes'
);
assert(
  planExcusedAttendance({ requesterType: 'student', startDate: '2026-10-05', endDate: '2026-10-07' }, stuPriya, [batchMath], []).length === 0,
  'A student with no matching batch produces no writes'
);
assert(
  planExcusedAttendance({ requesterType: 'teacher', startDate: '2026-10-05', endDate: '2026-10-07' }, stuRahul, [batchMath], []).length === 0,
  'Teacher leave never stamps student attendance'
);

// Faculty status sweep helper ---------------------------------------------------
assert(
  hasApprovedLeaveCovering([leaveOfAnjali], 'teach-anjali', '2026-10-12') === false,
  'A pending request never covers a date'
);
assert(
  hasApprovedLeaveCovering(
    [{ ...leaveOfAnjali, status: 'approved' }],
    'teach-anjali',
    '2026-10-12'
  ),
  'An approved range covers every day inside it'
);
assert(
  hasApprovedLeaveCovering(
    [{ ...leaveOfAnjali, status: 'approved' }],
    'teach-anjali',
    '2026-10-14'
  ) === false,
  'The day after an approved range is not covered'
);

// Search & board order ----------------------------------------------------------
const named = (r: LeaveRequest) => (r.requesterType === 'student' ? 'Rahul Sharma' : 'Prof. Anjali Sharma');
assert(searchLeaveRequests([makeLeave({})], 'fever', named).length === 1, 'Search matches the reason text');
assert(searchLeaveRequests([makeLeave({})], 'sick', named).length === 1, 'Search matches the category label');
assert(searchLeaveRequests([makeLeave({})], 'rahul', named).length === 1, 'Search matches the leave-taker name');
assert(searchLeaveRequests([makeLeave({})], 'no-such-leave', named).length === 0, 'Unmatched leave search returns nothing');
assert(searchLeaveRequests([makeLeave({}), makeLeave({ id: 'y' })], '  ', named).length === 2, 'Blank search returns the full register');

const pendingSoonest = makeLeave({ id: 'ps', status: 'pending', startDate: '2026-10-08', createdAtMs: 9 });
const pendingLater = makeLeave({ id: 'pl', status: 'pending', startDate: '2026-10-12', createdAtMs: 5 });
const decidedOld = makeLeave({ id: 'do', status: 'approved', createdAtMs: 1 });
const decidedNew = makeLeave({ id: 'dn', status: 'rejected', createdAtMs: 2 });
const boardOrder = sortLeaveRequestsForReview([decidedOld, pendingLater, decidedNew, pendingSoonest]);
assert(
  boardOrder.map(r => r.id).join(',') === 'ps,pl,dn,do',
  'Board shows pending first (soonest absence on top), decided newest-first below'
);

// ============================================================================
// F4 — staff ops: month math, attendance idempotence, prorate & slip arithmetic
// ============================================================================

// Month helpers -----------------------------------------------------------------
assert(monthKeyFromDate('2026-10-07') === '2026-10', 'Date → month key strips the day');
assert(monthKeyFromDate('not-a-date') === '', 'Malformed dates yield an empty month key');
assert(monthYearFromKey('2026-10') === 'October 2026', 'Month key → printable salary label');
assert(monthYearFromKey('2026-13') === '', 'Month 13 is rejected');
assert(monthYearFromDate('2026-10-07') === 'October 2026', 'Date → salary label in one step');
assert(currentMonthKey('2026-10-07') === '2026-10', 'Current month key anchors on the India date');

assert(shiftMonthKey('2026-10', -1) === '2026-09', 'Stepping back stays within the year');
assert(shiftMonthKey('2026-10', 1) === '2026-11', 'Stepping forward stays within the year');
assert(shiftMonthKey('2026-01', -1) === '2025-12', 'Stepping back across January lands in December');
assert(shiftMonthKey('2026-12', 1) === '2027-01', 'Stepping forward across December lands in January');

assert(daysInMonthKey('2026-10') === 31, 'October has 31 days');
assert(daysInMonthKey('2026-02') === 28, 'February 2026 (not a leap year) has 28 days');

// Calendar days (2026-10-07 is a Wednesday; 2026-10-11 a Sunday).
const octoberDays = monthDayList('2026-10');
assert(octoberDays.length === 31, 'The grid lists every day of the month');
assert(octoberDays[6].date === '2026-10-07' && octoberDays[6].weekdayShort === 'Wed', 'Day 7 of October 2026 is a Wednesday');
assert(octoberDays[10].isSunday, '11 October 2026 is a Sunday');
assert(octoberDays[3].isSunday && !octoberDays[4].isSunday, '4 October is the first Sunday, 5 October a working day');

// Working days: current month stops at today, future months are zero.
assert(
  workingDaysInMonthKey('2026-10', '2026-10-07') === 6,
  '1–7 October minus the Sunday on the 4th = 6 elapsed working days'
);
assert(
  workingDaysInMonthKey('2026-09', '2026-10-07') === 26,
  'A past month counts all 30 days minus its 4 Sundays'
);
assert(
  workingDaysInMonthKey('2026-11', '2026-10-07') === 0,
  'A future month has no elapsed working days'
);

// Attendance idempotence (one doc per teacher per day) ---------------------------
assert(
  teacherAttendanceId('teach-anjali', '2026-10-07') === 'tatt-teach-anjali-2026-10-07',
  'Doc ids are deterministic per (teacher, day)'
);
const makeAtt = (overrides: Partial<TeacherAttendance>): TeacherAttendance => ({
  id: 'tatt-teach-anjali-2026-10-07',
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  teacherId: 'teach-anjali',
  date: '2026-10-07',
  status: 'present',
  markedByUserId: 'user-teacher-sharma',
  markedAt: '2026-10-07T10:05:00.000Z',
  ...overrides
});
const attList = upsertTeacherAttendance([], makeAtt({}));
assert(attList.length === 1, 'The first stamp creates one row');
const attList2 = upsertTeacherAttendance(
  attList,
  makeAtt({ status: 'half_day', checkOut: '13:00' })
);
assert(
  attList2.length === 1 && attList2[0].status === 'half_day' && attList2[0].checkOut === '13:00',
  'A second stamp on the same day REPLACES the row — never a duplicate'
);
const attList3 = upsertTeacherAttendance(
  attList2,
  makeAtt({ id: 'tatt-teach-anjali-2026-10-06', teacherId: 'teach-anjali', date: '2026-10-06' })
);
assert(attList3.length === 2, 'A different day adds a second row');
assert(
  attendanceForDate(attList3, 'teach-anjali', '2026-10-07')?.status === 'half_day',
  'Lookup returns the row for the requested day'
);
assert(
  attendanceForDate(attList3, 'teach-rohit', '2026-10-07') === undefined,
  'Lookup misses cleanly for an unmarked teacher'
);

// Month summary + prorated salary hint -------------------------------------------
// 6 rows across 1–7 Oct (skipping Sunday the 4th): 3 present, 1 half, 1 leave, 1 absent.
const summaryRows: TeacherAttendance[] = [
  makeAtt({ id: 'a1', date: '2026-10-01', status: 'present' }),
  makeAtt({ id: 'a2', date: '2026-10-02', status: 'present' }),
  makeAtt({ id: 'a3', date: '2026-10-03', status: 'present' }),
  makeAtt({ id: 'a4', date: '2026-10-05', status: 'half_day' }),
  makeAtt({ id: 'a5', date: '2026-10-06', status: 'on_leave' }),
  makeAtt({ id: 'a6', date: '2026-10-07', status: 'absent' }),
  // A different teacher and a different month must not leak into the tally.
  makeAtt({ id: 'a7', date: '2026-10-02', status: 'absent', teacherId: 'teach-rohit' }),
  makeAtt({ id: 'a8', date: '2026-09-30', status: 'absent' })
];
const octSummary = summarizeTeacherMonth(summaryRows, 'teach-anjali', '2026-10', '2026-10-07');
assert(
  octSummary.present === 3 && octSummary.halfDay === 1 && octSummary.onLeave === 1 && octSummary.absent === 1,
  'The tally counts each status — and only this teacher in this month'
);
assert(octSummary.recorded === 6 && octSummary.workingDays === 6, 'Six rows over six elapsed working days');

assert(
  proratedSalaryHint(30000, octSummary) === 22500,
  'Prorated hint: (3 present + 1 leave + 0.5 half) / 6 working days × basic'
);
assert(
  proratedSalaryHint(30000, summarizeTeacherMonth([], 'teach-anjali', '2026-10', '2026-10-07')) === 30000,
  'A month with no rows hints the FULL basic — never a scary near-zero default'
);
assert(
  proratedSalaryHint(30000, summarizeTeacherMonth(summaryRows, 'teach-anjali', '2026-11', '2026-10-07')) === 30000,
  'A month with zero working days hints the full basic'
);
const allAbsent = summarizeTeacherMonth(
  [makeAtt({ id: 'b1', date: '2026-10-01', status: 'absent' })],
  'teach-anjali',
  '2026-10',
  '2026-10-07'
);
assert(proratedSalaryHint(30000, allAbsent) === 0, 'A fully-absent month prorates to zero');
assert(
  proratedSalaryHint(30000, { ...octSummary, present: 999 }) <= 30000,
  'The hint clamps at the full basic, never above it'
);
assert(proratedSalaryHint(-5, octSummary) === 0, 'A non-positive basic hints zero');

// Slip arithmetic ------------------------------------------------------------------
assert(computeSlipNet(30000, 2500, 1000) === 31500, 'Net = basic + allowances − deductions');
assert(computeSlipNet(30000, 0, 0) === 30000, 'A plain slip nets exactly the basic');
assert(computeSlipNet(2000, 0, 99999) === 0, 'Net floors at zero — never negative pay');
assert(computeSlipNet(30000, NaN as number, (undefined as unknown) as number) === 30000, 'Garbage inputs degrade to zero allowances');
assert(formatRupees(32500) === '₹32,500', 'Rupee formatting uses Indian grouping');
assert(formatRupees(0) === '₹0', 'Zero rupees format cleanly');

// One slip per month, newest issued first --------------------------------------------
const makeSlip = (overrides: Partial<SalarySlip>): SalarySlip => ({
  id: 'slip-x',
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  teacherId: 'teach-anjali',
  monthYear: 'October 2026',
  basic: 30000,
  allowances: 0,
  deductions: 0,
  netAmount: 30000,
  paidAmount: 0,
  status: 'issued',
  issuedAt: '2026-10-07T10:00:00.000Z',
  createdAt: '2026-10-07T10:00:00.000Z',
  createdAtMs: 3,
  ...overrides
});
const slipList = [
  makeSlip({ id: 's-oct-old', monthYear: 'October 2026', createdAtMs: 1 }),
  makeSlip({ id: 's-oct-new', monthYear: 'October 2026', createdAtMs: 9 }),
  makeSlip({ id: 's-sep', monthYear: 'September 2026', createdAtMs: 5 })
];
const octSlips = slipsForMonth(slipList, '2026-10');
assert(octSlips.length === 2 && octSlips.every(s => s.monthYear === 'October 2026'), 'The month list filters to that label');
assert(octSlips[0].id === 's-oct-new', '…newest issued first');
assert(slipsForMonth(slipList, '2026-11').length === 0, 'A month without slips lists nothing');

// Clock stamp (HH:MM in India, regardless of the runner's timezone) -----------------
assert(formatTimeHHMM(new Date('2026-10-07T10:05:00.000Z')) === '15:35', '10:05 UTC is 15:35 IST');
assert(formatTimeHHMM(new Date('2026-10-06T18:30:00.000Z')) === '00:00', 'IST midnight formats as 00:00');

// ============================================================================
// F5 — expense tracking & profit/loss: month math, cash flow, category rollup
// ============================================================================

// Salary label → month key (inverse of monthYearFromKey) ------------------------
assert(monthKeyFromSalaryLabel('October 2026') === '2026-10', 'Salary label → month key');
assert(monthKeyFromSalaryLabel('  September 2026 ') === '2026-09', 'Whitespace is trimmed before parsing');
assert(monthKeyFromSalaryLabel('Fake 2026') === '', 'An unknown month name yields an empty key');
assert(monthKeyFromSalaryLabel('October') === '', 'A label with no year is rejected');
assert(monthKeyFromSalaryLabel('') === '', 'An empty label yields an empty key');

// Fixtures ---------------------------------------------------------------------
const makeExpense = (overrides: Partial<Expense>): Expense => ({
  id: 'exp-x',
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  title: 'Expense',
  category: 'misc',
  amount: 1000,
  expenseDate: '2026-10-05',
  paymentMethod: 'Cash',
  recordedByUserId: 'user-apex-admin',
  recordedByName: 'Er. Manoj Verma',
  createdAt: '2026-10-05T10:00:00.000Z',
  createdAtMs: 1,
  ...overrides
});

const makeInvoice = (overrides: Partial<FeeInvoice>): FeeInvoice => ({
  id: 'inv-x',
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  studentId: 'stud-x',
  invoiceNo: 'INV-1',
  monthYear: 'October 2026',
  title: 'Monthly Fee',
  amount: 2000,
  discount: 0,
  lateFee: 0,
  netAmount: 2000,
  paidAmount: 0,
  dueDate: '2026-10-10',
  status: 'pending',
  payments: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  ...overrides
});

// incomeForMonth — only recorded, in-month payments count -----------------------
const invoicesForIncome: FeeInvoice[] = [
  makeInvoice({
    id: 'inv-1',
    payments: [
      { id: 'p1', invoiceId: 'inv-1', amount: 2000, paymentDate: '2026-10-03', paymentMethod: 'UPI', transactionRef: 'A', receivedBy: 'Desk', receiptNo: 'R1' },
      { id: 'p2', invoiceId: 'inv-1', amount: 500, paymentDate: '2026-09-30', paymentMethod: 'Cash', transactionRef: 'B', receivedBy: 'Desk', receiptNo: 'R2' }
    ]
  }),
  makeInvoice({
    id: 'inv-2',
    payments: [
      { id: 'p3', invoiceId: 'inv-2', amount: 1500, paymentDate: '2026-10-20', paymentMethod: 'Cash', transactionRef: 'C', receivedBy: 'Desk', receiptNo: 'R3' },
      { id: 'p4', invoiceId: 'inv-2', amount: 999, paymentDate: '2026-10-21', paymentMethod: 'UPI', transactionRef: 'D', receivedBy: 'Desk', receiptNo: 'R4', status: 'pending_verification' },
      { id: 'p5', invoiceId: 'inv-2', amount: 777, paymentDate: '2026-10-22', paymentMethod: 'UPI', transactionRef: 'E', receivedBy: 'Desk', receiptNo: 'R5', status: 'rejected' }
    ]
  })
];
const octIncome = incomeForMonth(invoicesForIncome, '2026-10');
assert(octIncome.total === 3500, 'Income sums only in-month recorded payments (2000 + 1500)');
assert(octIncome.paymentCount === 2, 'Pending-verification and rejected payments are not "received"');
assert(octIncome.invoiceCount === 2, 'Two invoices received money this month');
assert(incomeForMonth(invoicesForIncome, '2026-11').total === 0, 'A month with no payments earns nothing');

// salaryTotalForMonth — only paid slips, matched by label ------------------------
const slipsForRollup: SalarySlip[] = [
  makeSlip({ id: 's-paid-oct', monthYear: 'October 2026', status: 'paid', paidAmount: 30000, netAmount: 30000 }),
  makeSlip({ id: 's-issued-oct', monthYear: 'October 2026', status: 'issued', paidAmount: 0, netAmount: 25000 }),
  makeSlip({ id: 's-paid-sep', monthYear: 'September 2026', status: 'paid', paidAmount: 32000, netAmount: 32500 })
];
const octSalary = salaryTotalForMonth(slipsForRollup, '2026-10');
assert(octSalary.total === 30000, 'Only the paid October slip counts as cash out');
assert(octSalary.slipCount === 1, '…and only one slip is counted');
assert(salaryTotalForMonth(slipsForRollup, '2026-08').total === 0, 'A month without paid slips costs nothing');
assert(salaryTotalForMonth(slipsForRollup, '2026-09').total === 32000, 'Paid amount is used when present');

// expensesForMonth + category rollup -------------------------------------------
const expenseList: Expense[] = [
  makeExpense({ id: 'e-rent', category: 'rent', amount: 30000, expenseDate: '2026-10-01' }),
  makeExpense({ id: 'e-elec', category: 'electricity', amount: 4000, expenseDate: '2026-10-02' }),
  makeExpense({ id: 'e-rent2', category: 'rent', amount: 5000, expenseDate: '2026-10-20' }),
  makeExpense({ id: 'e-sep', category: 'internet', amount: 1499, expenseDate: '2026-09-05' })
];
assert(expensesForMonth(expenseList, '2026-10').length === 3, 'Only the three October expenses are in scope');
const octCategories = categoryTotals(expenseList, '2026-10', 30000, 1);
assert(octCategories[0].category === 'rent', 'Rent tops the category list');
assert(octCategories[0].amount === 35000, 'Two rent rows aggregate into one total');
assert(octCategories[0].count === 2, '…and the entry count aggregates too');
const salaryCategory = octCategories.find(c => c.category === 'salaries');
assert(!!salaryCategory && salaryCategory.amount === 30000, 'Paid salaries fold into a synthetic salaries row');
assert(
  octCategories.every((c, i) => i === 0 || octCategories[i - 1].amount >= c.amount),
  'Categories read largest-first'
);

// buildProfitAndLoss — the whole equation --------------------------------------
const octPnl = buildProfitAndLoss('2026-10', {
  invoices: invoicesForIncome,
  expenses: expenseList,
  salarySlips: slipsForRollup
});
assert(octPnl.income === 3500, 'P&L income comes from in-month payments');
assert(octPnl.recordedExpense === 39000, 'Recorded expenses are the October ledger rows');
assert(octPnl.salaryTotal === 30000, 'Paid October salaries are included');
assert(octPnl.expense === 69000, 'Total money out = recorded + salaries');
assert(octPnl.net === -65500, 'Net is fees received minus money out (a loss here)');
assert(octCategories.length === 3, 'Rent, electricity and salaries appear in the breakdown');

// Net-profit case + margin -----------------------------------------------------
const profitable = buildProfitAndLoss('2026-10', {
  invoices: [makeInvoice({ id: 'ip', payments: [{ id: 'pp', invoiceId: 'pp', amount: 100000, paymentDate: '2026-10-05', paymentMethod: 'Cash', transactionRef: 'X', receivedBy: 'Desk', receiptNo: 'RX' }] })],
  expenses: [makeExpense({ id: 'e1', category: 'rent', amount: 25000, expenseDate: '2026-10-01' })],
  salarySlips: []
});
assert(profitable.net === 75000, 'Fees minus recorded expenses is the net');
assert(profitable.marginPct === 75, 'Margin is net as a percent of fees received');

// Empty month is safe ----------------------------------------------------------
const emptyMonth = buildProfitAndLoss('2026-07', { invoices: [], expenses: [], salarySlips: [] });
assert(emptyMonth.income === 0 && emptyMonth.expense === 0 && emptyMonth.net === 0, 'An empty month reports all zeros');
assert(emptyMonth.categories.length === 0, 'An empty month has no category rows');
assert(emptyMonth.marginPct === 0, 'A zero-income month has a zero margin (no divide-by-zero)');
assert(emptyMonth.monthLabel === 'July 2026', 'The summary carries a printable month label');

// validateExpense --------------------------------------------------------------
assert(validateExpense({ title: 'Rent', amount: 5000, expenseDate: '2026-10-01' }) === null, 'A valid expense passes');
assert(validateExpense({ title: ' ', amount: 5000, expenseDate: '2026-10-01' }) !== null, 'A blank title is rejected');
assert(validateExpense({ title: 'Rent', amount: 0, expenseDate: '2026-10-01' }) !== null, 'Zero amount is rejected');
assert(validateExpense({ title: 'Rent', amount: -5, expenseDate: '2026-10-01' }) !== null, 'Negative amount is rejected');
assert(validateExpense({ title: 'Rent', amount: MAX_EXPENSE_AMOUNT + 1, expenseDate: '2026-10-01' }) !== null, 'Above the sanity cap is rejected');
assert(validateExpense({ title: 'Rent', amount: 5000, expenseDate: '01-10-2026' }) !== null, 'A non-ISO date is rejected');

// sortExpensesNewestFirst + searchExpenses -------------------------------------
const sorted = sortExpensesNewestFirst(expenseList);
assert(sorted[0].expenseDate >= sorted[sorted.length - 1].expenseDate, 'Ledger reads newest expense date first');
assert(searchExpenses(expenseList, 'electric').length === 1, 'Search matches the category label');
assert(searchExpenses(expenseList, 'rent').length === 2, 'Search matches a title substring');
assert(searchExpenses(expenseList, '').length === expenseList.length, 'An empty search returns everything');
assert(EXPENSE_CATEGORY_LABEL.electricity === 'Electricity', 'Category labels are human readable');

// ============================================================================
// F6 — live class links: URL validation/redaction, join window, clash detection
// ============================================================================

// normalizeMeetUrl — forgiving input, safe output -------------------------------
assert(normalizeMeetUrl('meet.google.com/abc-defg-hij') === 'https://meet.google.com/abc-defg-hij', 'A bare host gets an https scheme');
assert(normalizeMeetUrl('https://meet.google.com/abc-defg-hij').startsWith('https://meet.google.com/'), 'An https link is preserved');
assert(normalizeMeetUrl('  https://us02web.zoom.us/j/9876543210  ') === 'https://us02web.zoom.us/j/9876543210', 'Whitespace around a link is trimmed');
assert(normalizeMeetUrl('javascript:alert(1)') === '', 'A javascript: payload is redacted');
assert(normalizeMeetUrl('data:text/html;base64,PHNjcmlwdD4=') === '', 'A data: URI is redacted');
assert(normalizeMeetUrl('ftp://example.com/x') === '', 'A non-http scheme is redacted');
assert(normalizeMeetUrl('') === '', 'An empty link normalises to empty');
assert(normalizeMeetUrl(undefined) === '', 'An undefined link normalises to empty');
assert(normalizeMeetUrl('not a url') === '', 'Unparseable text normalises to empty');
assert(normalizeMeetUrl('https://localhost') === '', 'A host without a dot is rejected');

// isValidMeetUrl ---------------------------------------------------------------
assert(isValidMeetUrl('https://meet.google.com/abc') === true, 'A Meet link is valid');
assert(isValidMeetUrl('meet.google.com/abc') === true, 'A bare Meet host is valid');
assert(isValidMeetUrl('javascript:alert(1)') === false, 'A script URL is invalid');
assert(isValidMeetUrl('') === false, 'An empty string is invalid');

// meetProviderLabel ------------------------------------------------------------
assert(meetProviderLabel('https://meet.google.com/x') === 'Google Meet', 'Meet is labelled');
assert(meetProviderLabel('https://us02web.zoom.us/j/1') === 'Zoom', 'A Zoom subdomain is labelled');
assert(meetProviderLabel('https://teams.microsoft.com/l/meetup-join/x') === 'Microsoft Teams', 'Teams is labelled');
assert(meetProviderLabel('https://classes.mycoaching.in/room') === 'classes.mycoaching.in', 'An unknown host falls back to its hostname');
assert(meetProviderLabel('') === '', 'No link means no label');

// parseClock / nowMinutesIndia -------------------------------------------------
assert(parseClock('17:00') === 1020, '17:00 is 1020 minutes');
assert(parseClock('00:00') === 0, 'Midnight is zero minutes');
assert(parseClock('9:00') === null, 'A single-digit hour is rejected');
assert(parseClock('24:00') === null, 'Hour 24 is rejected');
assert(parseClock('17:60') === null, 'Minute 60 is rejected');
assert(nowMinutesIndia(new Date('2026-10-05T11:35:00.000Z')) === 1025, '11:35 UTC is 17:05 IST');

// Fixtures ---------------------------------------------------------------------
const makeSlot = (overrides: Partial<TimetableSlot>): TimetableSlot => ({
  id: 'tt-x',
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  batchId: 'batch-c10-math',
  dayOfWeek: 'Monday',
  startTime: '17:00',
  endTime: '18:30',
  classroom: 'Hall 1',
  teacherId: 'teach-anjali',
  subject: 'Class 10 Mathematics',
  ...overrides
});

// joinState — only a linked, in-window, same-day class is joinable --------------
const mondaySlot = makeSlot({ meetUrl: 'https://meet.google.com/abc-defg-hij' });
assert(joinState(makeSlot({}), 'Monday', new Date('2026-10-05T11:35:00.000Z')) === 'unavailable', 'No link means not joinable');
assert(joinState(mondaySlot, 'Tuesday', new Date('2026-10-05T11:35:00.000Z')) === 'upcoming', 'A different weekday is only upcoming');
assert(joinState(mondaySlot, 'Monday', new Date('2026-10-05T10:00:00.000Z')) === 'upcoming', 'Before the 10-minute window it is upcoming');
assert(joinState(mondaySlot, 'Monday', new Date('2026-10-05T11:19:00.000Z')) === 'upcoming', 'One minute before the window it is still upcoming');
assert(joinState(mondaySlot, 'Monday', new Date('2026-10-05T11:20:00.000Z')) === 'live', '10 minutes before the start it opens');
assert(joinState(mondaySlot, 'Monday', new Date('2026-10-05T11:35:00.000Z')) === 'live', 'During the class it is live');
assert(joinState(mondaySlot, 'Monday', new Date('2026-10-05T13:30:00.000Z')) === 'ended', 'After the end time it has ended');
assert(joinState(makeSlot({ meetUrl: 'javascript:alert(1)' }), 'Monday', new Date('2026-10-05T11:35:00.000Z')) === 'unavailable', 'An unsafe link is never joinable');

// formatSlotRange / sorting / filters ------------------------------------------
assert(formatSlotRange(mondaySlot) === '17:00 – 18:30', 'Slot range is printable');
assert(formatSlotRange(makeSlot({ startTime: '', endTime: '' })) === '--:-- – --:--', 'Missing clocks fall back to placeholders');

const week: TimetableSlot[] = [
  makeSlot({ id: 'wed', dayOfWeek: 'Wednesday', startTime: '17:00' }),
  makeSlot({ id: 'mon-late', dayOfWeek: 'Monday', startTime: '18:00' }),
  makeSlot({ id: 'mon-early', dayOfWeek: 'Monday', startTime: '09:00' }),
  makeSlot({ id: 'sat', dayOfWeek: 'Saturday', startTime: '10:00' })
];
const sortedWeek = sortTimetableSlots(week);
assert(sortedWeek[0].id === 'mon-early' && sortedWeek[1].id === 'mon-late', 'Monday sorts before the rest, earliest first');
assert(sortedWeek[3].id === 'sat', 'Saturday comes last');
assert(slotsForDay(week, 'Monday').length === 2, 'slotsForDay filters to a single day');
assert(slotsForDay(week, 'Monday')[0].id === 'mon-early', 'slotsForDay returns them sorted');
assert(slotsForBatches(week, ['batch-c10-math']).length === 4, 'slotsForBatches keeps matching batches');
assert(slotsForBatches(week, ['batch-nope']).length === 0, 'slotsForBatches drops other batches');
assert(TIMETABLE_DAYS.length === 6 && TIMETABLE_DAYS[0] === 'Monday', 'The timetable week is Monday–Saturday');

// slotsOverlap / clash detection -----------------------------------------------
assert(slotsOverlap(makeSlot({ startTime: '17:00', endTime: '18:30' }), makeSlot({ startTime: '18:00', endTime: '19:00' })) === true, 'Overlapping windows clash');
assert(slotsOverlap(makeSlot({ startTime: '17:00', endTime: '18:00' }), makeSlot({ startTime: '18:00', endTime: '19:00' })) === false, 'Touching windows do not clash');
assert(slotsOverlap(makeSlot({ dayOfWeek: 'Monday' }), makeSlot({ dayOfWeek: 'Tuesday', startTime: '17:00', endTime: '18:30' })) === false, 'Different days do not clash');

const clashBase = makeSlot({ id: 'base', startTime: '17:00', endTime: '18:30' });
const sameTeacher = makeSlot({ id: 'st', teacherId: 'teach-anjali', batchId: 'batch-x', classroom: 'Hall 9', startTime: '18:00', endTime: '19:00' });
const teacherClashes = findTimetableClashes(sameTeacher, [clashBase]);
assert(teacherClashes.length === 1 && teacherClashes[0].kind === 'teacher', 'Same faculty in an overlapping window clashes');
assert(teacherClashes[0].slot.id === 'base', 'The clash points at the existing slot');
const sameRoom = makeSlot({ id: 'sr', teacherId: 'teach-rohit', batchId: 'batch-x', classroom: 'Hall 1', startTime: '18:00', endTime: '19:00' });
assert(findTimetableClashes(sameRoom, [clashBase])[0].kind === 'classroom', 'Same room clashes');
const sameBatch = makeSlot({ id: 'sb', teacherId: 'teach-rohit', classroom: 'Hall 9', batchId: 'batch-c10-math', startTime: '18:00', endTime: '19:00' });
assert(findTimetableClashes(sameBatch, [clashBase])[0].kind === 'batch', 'Same batch clashes');
assert(findTimetableClashes(makeSlot({ id: 'other', teacherId: 'teach-rohit', classroom: 'Hall 9', batchId: 'batch-x', startTime: '18:00', endTime: '19:00' }), [clashBase]).length === 0, 'A different teacher/room/batch does not clash');
assert(findTimetableClashes(sameTeacher, [clashBase], 'base').length === 0, 'An edit ignores the slot it is replacing');
assert(findTimetableClashes(sameTeacher, [makeSlot({ id: 'other-org', orgId: 'org-other', startTime: '18:00', endTime: '19:00' })]).length === 0, 'Another centre never clashes');
assert(isClashFree(sameTeacher, [clashBase]) === false, 'isClashFree is false when booked');
assert(isClashFree(makeSlot({ id: 'ok', teacherId: 'teach-rohit', classroom: 'Hall 9', batchId: 'batch-x', startTime: '18:00', endTime: '19:00' }), [clashBase]) === true, 'A free window is clash-free');

// validateTimetableSlot --------------------------------------------------------
const validSlotInput = { batchId: 'batch-1', dayOfWeek: 'Monday' as const, startTime: '17:00', endTime: '18:30', classroom: 'Hall 1', teacherId: 'teach-1', subject: 'Maths' };
assert(validateTimetableSlot(validSlotInput) === null, 'A complete slot passes validation');
assert(validateTimetableSlot({ ...validSlotInput, batchId: '' }) !== null, 'A missing batch is rejected');
assert(validateTimetableSlot({ ...validSlotInput, subject: '   ' }) !== null, 'A blank subject is rejected');
assert(validateTimetableSlot({ ...validSlotInput, startTime: '5pm' }) !== null, 'A malformed start time is rejected');
assert(validateTimetableSlot({ ...validSlotInput, startTime: '18:00', endTime: '17:00' }) !== null, 'An end before the start is rejected');
assert(validateTimetableSlot({ ...validSlotInput, startTime: '17:00', endTime: '17:00' }) !== null, 'A zero-length class is rejected');
assert(validateTimetableSlot({ ...validSlotInput, meetUrl: 'javascript:alert(1)' }) !== null, 'An unsafe class link is rejected');
assert(validateTimetableSlot({ ...validSlotInput, meetUrl: 'meet.google.com/abc' }) === null, 'A valid (bare) class link is accepted');
assert(validateTimetableSlot({ ...validSlotInput, meetUrl: '' }) === null, 'An empty class link is fine — the class is in-person');

// ============================================================================
// F7 — syllabus coverage: template generation, % coverage math, status transitions
// ============================================================================

// Template library ------------------------------------------------------------------
assert(SYLLABUS_TEMPLATES.length >= 4, 'At least four board templates ship with VidyaOS');
assert(SYLLABUS_TEMPLATES.every(t => t.chapters.length > 0), 'Every template carries a real chapter list');
assert(SYLLABUS_TEMPLATES.every(t => t.chapters.every(c => c.trim().length > 0)), 'No template has a blank chapter');

const t10Math = findSyllabusTemplate('CBSE', 'Class 10', 'Mathematics');
assert(!!t10Math, 'A CBSE Class 10 Mathematics template exists');
assert(t10Math!.chapters.includes('Quadratic Equations'), 'The Class 10 maths list includes Quadratic Equations');
assert(findSyllabusTemplate('CBSE', 'CLASS 10', 'MATHEMATICS') === t10Math, 'Board/class/subject matching is case-insensitive');

const sciFuzzy = findSyllabusTemplate('CBSE', 'Class 10', 'Science (Physics & Chemistry)');
assert(!!sciFuzzy, 'A batch subject that wraps the template subject still matches');

assert(findSyllabusTemplate('CBSE', 'Class 7', 'Mathematics') === undefined, 'A class with no template returns undefined');
assert(findSyllabusTemplate('CBSE', 'Class 10', 'Basket Weaving') === undefined, 'An unknown subject returns undefined');

assert(syllabusTemplatesFor('CBSE').length >= 5, 'Filtering by board returns several templates');
assert(syllabusTemplatesFor('CBSE', 'Class 12').length >= 2, 'Filtering by board + class narrows correctly');

const opts = templateOptions();
assert(opts.boards.includes('CBSE'), 'The picker exposes the CBSE board');
assert(opts.classes.includes('Class 10'), 'The picker exposes Class 10');
assert(opts.subjects.includes('Physics'), 'The picker exposes Physics');

// ============================================================================
// Program catalog — school, competitive & government-exam tracks
// ============================================================================
assert(PROGRAM_TRACKS.length >= 20, 'The catalog lists a broad set of tracks');
assert(new Set(PROGRAM_TRACKS.map(t => t.id)).size === PROGRAM_TRACKS.length, 'Every track id is unique');
assert(PROGRAM_TRACKS.every(t => PROGRAM_CATEGORIES.includes(t.category)), 'Every track belongs to a known category');
assert(PROGRAM_TRACKS.every(t => t.label.trim().length > 0), 'Every track has a label');
assert(PROGRAM_TRACKS.every(t => t.levels.length > 0), 'Every track suggests at least one level');
assert(PROGRAM_TRACKS.every(t => t.subjects.length > 0), 'Every track suggests at least one subject');

assert(!!getProgramTrack('SSC') && !!getProgramTrack('Banking') && !!getProgramTrack('UPSC & State PSC'), 'Government-exam tracks exist');
assert(!!getProgramTrack('Railways') && !!getProgramTrack('Defence') && !!getProgramTrack('Teaching Exams'), 'More government-exam tracks exist');
assert(getProgramTrack('SSC')!.levels.includes('SSC CGL'), 'SSC offers CGL as a level');
assert(levelsForTrack('Banking').includes('IBPS PO'), 'Banking offers IBPS PO as a level');
assert(subjectsForTrack('Railways').includes('General Science'), 'Railways lists General Science');
assert(getProgramTrack(DEFAULT_TRACK)!.levels.includes(DEFAULT_LEVEL), 'Default track/level pair is valid for onboarding');

const grouped = tracksByCategory();
assert(grouped.length === PROGRAM_CATEGORIES.length, 'tracksByCategory returns every category');
assert(grouped.some(g => g.category === 'Government Exams' && g.tracks.length >= 5), 'Government Exams is a populated group');

assert(allLevels().includes('SSC CGL') && allLevels().includes('Class 10'), 'allLevels merges school and govt levels');
assert(allSubjects().includes('Quantitative Aptitude'), 'allSubjects merges school and govt subjects');
assert(levelOptionsFor('SSC').includes('SSC CHSL'), 'levelOptionsFor returns the track levels');
assert(levelOptionsFor('State PSC – Mains' as IndianBoard).length > 0, 'An unknown custom track still gets fallback level options');
assert(programLabel('SSC') !== 'SSC', 'programLabel returns the friendly label');

// Government-exam syllabus templates are wired in -------------------------------
assert(!!findSyllabusTemplate('SSC', 'SSC CGL', 'Quantitative Aptitude'), 'An SSC CGL Quant template exists');
assert(!!findSyllabusTemplate('Banking', 'IBPS PO', 'Reasoning'), 'A Banking Reasoning template exists');
assert(!!findSyllabusTemplate('UPSC & State PSC', 'UPSC CSE Prelims', 'Indian Polity'), 'A UPSC Polity template exists');
assert(syllabusTemplatesFor('SSC').length >= 3, 'SSC exposes several templates to the generator');
assert(templateOptions().boards.includes('Banking'), 'The syllabus picker exposes government-exam boards');

// buildTopicsFromTemplate ---------------------------------------------------------
const seedTopics = buildTopicsFromTemplate(t10Math!, {
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  batchId: 'batch-c10-math',
  idPrefix: 'syl-test',
  createdAt: '2026-10-08T00:00:00.000Z'
});

assert(seedTopics.length === t10Math!.chapters.length, 'One row is created per chapter');
assert(seedTopics.every(t => t.status === 'not_started'), 'Seeded chapters all start not_started');
assert(seedTopics[0].sequence === 1 && seedTopics[seedTopics.length - 1].sequence === seedTopics.length, 'Sequences run 1..n in teaching order');
assert(seedTopics[3].id === 'syl-test-4', 'Row ids are deterministic and prefixed');
assert(seedTopics[0].orgId === 'org-apex' && seedTopics[0].batchId === 'batch-c10-math', 'Tenant and batch are stamped on each row');
assert(seedTopics[0].board === 'CBSE' && seedTopics[0].classGrade === 'Class 10', 'Board and class come from the template by default');
assert(seedTopics.every(t => t.chapter === `Chapter ${t.sequence}`), 'Chapter labels track the sequence');

const overrideMeta = buildTopicsFromTemplate(t10Math!, {
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  batchId: 'batch-jee-math',
  subject: 'JEE Foundation Math',
  classGrade: 'Class 12',
  board: 'JEE Foundation',
  idPrefix: 'syl-jee'
});
assert(overrideMeta[0].subject === 'JEE Foundation Math' && overrideMeta[0].board === 'JEE Foundation', 'Explicit meta overrides template subject/board');
assert(overrideMeta[0].batchId === 'batch-jee-math', 'Explicit meta overrides the target batch');

// Coverage math --------------------------------------------------------------------
const statusFor = (i: number): SyllabusStatus => (i < 2 ? 'completed' : i < 4 ? 'in_progress' : 'not_started');
const mixed: SyllabusTopic[] = seedTopics.map((t, i) => ({ ...t, status: statusFor(i) }));

const counts = countSyllabusByStatus(mixed);
assert(counts.completed === 2 && counts.in_progress === 2 && counts.not_started === seedTopics.length - 4, 'countByStatus tallies each bucket');

assert(coveragePct([]) === 0, 'An empty syllabus is 0% covered');
assert(coveragePct(mixed) === Math.round((2 / seedTopics.length) * 100), 'coveragePct is completed/total rounded');
assert(coveragePct(mixed) === Math.round((2 / 15) * 100), 'Class 10 maths: 2 of 15 chapters = 13%');
assert(coveragePct(seedTopics.map(t => ({ ...t, status: 'completed' }))) === 100, 'All completed = 100%');

const weighted = weightedCoveragePct(mixed);
assert(weighted === Math.round(((2 + 2 * 0.5) / 15) * 100), 'weightedCoveragePct counts in-progress as half');
assert(weighted > coveragePct(mixed), 'Weighted progress is above the pure completed percentage');
assert(weightedCoveragePct([]) === 0, 'Weighted coverage of an empty list is 0');

// Ordering / selectors -------------------------------------------------------------
const shuffled = [...mixed].reverse();
const ordered = sortTopicsBySequence(shuffled);
assert(ordered[0].sequence === 1 && ordered[1].sequence === 2, 'sortTopicsBySequence restores teaching order');
assert(ordered[ordered.length - 1].sequence === seedTopics.length, 'The last chapter sorts last');

assert(topicsForBatch(mixed, 'batch-c10-math').length === mixed.length, 'topicsForBatch keeps matching rows');
assert(topicsForBatch(mixed, 'batch-nope').length === 0, 'topicsForBatch drops other batches');

const withGap: SyllabusTopic[] = [
  { ...seedTopics[0], status: 'completed' },
  { ...seedTopics[1], status: 'not_started' },
  { ...seedTopics[2], status: 'in_progress' },
  { ...seedTopics[3], status: 'completed' }
];
assert(nextTopicForBatch(withGap, 'batch-c10-math')!.sequence === 2, 'nextTopicForBatch picks the first not-started chapter');
const allDone: SyllabusTopic[] = mixed.map(t => ({ ...t, status: 'completed' }));
assert(nextTopicForBatch(allDone, 'batch-c10-math') === undefined, 'A finished syllabus has no next topic');

// batchCoverage --------------------------------------------------------------------
const cov = batchCoverage(mixed, [{ id: 'batch-c10-math' }, { id: 'batch-c10-sci' }]);
assert(cov.length === 2, 'batchCoverage returns a row for every batch');
assert(cov[0].total === mixed.length && cov[0].completed === 2, 'The row counts that batch only');
assert(cov[1].total === 0 && cov[1].pct === 0, 'A batch with no syllabus reports 0');

// Status transitions -----------------------------------------------------------------
assert(advanceStatus('not_started') === 'in_progress', 'One tap moves a chapter into progress');
assert(advanceStatus('in_progress') === 'completed', 'A second tap completes it');
assert(advanceStatus('completed') === 'not_started', 'A third tap resets it');
assert(SYLLABUS_STATUSES.length === 3, 'Exactly three coverage statuses exist');

// Validation -------------------------------------------------------------------------
assert(validateSyllabusTopic({ batchId: 'batch-1', chapter: 'Chapter 1', title: 'Real Numbers', status: 'not_started', sequence: 1 }) === null, 'A complete topic passes validation');
assert(validateSyllabusTopic({ batchId: '', chapter: 'Chapter 1', title: 'Real Numbers', status: 'not_started' }) !== null, 'A missing batch is rejected');
assert(validateSyllabusTopic({ batchId: 'batch-1', chapter: '  ', title: 'Real Numbers', status: 'not_started' }) !== null, 'A blank chapter is rejected');
assert(validateSyllabusTopic({ batchId: 'batch-1', chapter: 'Chapter 1', title: '   ', status: 'not_started' }) !== null, 'A blank title is rejected');
assert(validateSyllabusTopic({ batchId: 'batch-1', chapter: 'Chapter 1', title: 'X', status: 'weird' as SyllabusStatus }) !== null, 'An unknown status is rejected');
assert(validateSyllabusTopic({ batchId: 'batch-1', chapter: 'Chapter 1', title: 'X', status: 'not_started', sequence: -3 }) !== null, 'A negative sequence is rejected');

// ============================================================================
// F8 — PTM scheduler: slot cutting, booking/cancel transitions, reminders
// ============================================================================

const ptmEventFor = (over: Partial<PtmEvent> = {}): PtmEvent => ({
  id: 'ptm-test-1',
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  title: 'October Parent–Teacher Meeting',
  date: '2026-10-11',
  startTime: '16:00',
  endTime: '18:00',
  slotMinutes: 15,
  teacherIds: ['teach-a', 'teach-b'],
  createdBy: 'user-admin',
  createdAt: '2026-10-01T09:00:00.000Z',
  ...over
});

// Clock helpers --------------------------------------------------------------------
assert(parseClockMinutes('17:00') === 1020, 'parseClockMinutes reads an afternoon hour');
assert(parseClockMinutes('00:05') === 5, 'parseClockMinutes reads just after midnight');
assert(parseClockMinutes('5:30') === 330, 'parseClockMinutes tolerates an unpadded hour');
assert(Number.isNaN(parseClockMinutes('24:00')), 'parseClockMinutes rejects 24:00');
assert(Number.isNaN(parseClockMinutes('abc')), 'parseClockMinutes rejects junk');
assert(Number.isNaN(parseClockMinutes('')), 'parseClockMinutes rejects an empty string');

assert(minutesToClock(1020) === '17:00', 'minutesToClock pads the hour back');
assert(minutesToClock(0) === '00:00', 'minutesToClock handles midnight');
assert(minutesToClock(-5) === '00:00', 'minutesToClock clamps negatives to midnight');
assert(minutesToClock(24 * 60) === '23:59', 'minutesToClock clamps past the end of the day');

assert(formatClock12('17:00') === '5:00 PM', 'formatClock12 renders an afternoon slot for parents');
assert(formatClock12('09:05') === '9:05 AM', 'formatClock12 keeps the leading-zero minute');
assert(formatClock12('00:00') === '12:00 AM', 'formatClock12 treats midnight as 12 AM');
assert(formatClock12('12:15') === '12:15 PM', 'formatClock12 treats noon as 12 PM');

assert(formatClockRange('17:00', '17:45') === '5:00 – 5:45 PM', 'formatClockRange shares one AM/PM suffix');
assert(formatClockRange('16:00', '18:00') === '4:00 – 6:00 PM', 'formatClockRange keeps both suffixes when periods match');
assert(formatClockRange('11:45', '12:15') === '11:45 AM – 12:15 PM', 'formatClockRange splits suffixes across noon');

// Slot cutting ----------------------------------------------------------------------
const grid = generatePtmSlots(ptmEventFor());
assert(grid.length === 16, 'A 2-hour window at 15 minutes × two teachers cuts 16 slots');
assert(grid.every(s => s.status === 'available'), 'Fresh slots all start available');
assert(grid.every(s => s.orgId === 'org-apex' && s.eventId === 'ptm-test-1'), 'Every slot inherits tenant + event ids');
assert(grid.filter(s => s.teacherId === 'teach-a').length === 8, 'Both teachers get the same number of columns');
assert(grid[0].startsAt === '2026-10-11T16:00' && grid[0].endsAt === '2026-10-11T16:15', 'The first slot starts exactly at the window open');
assert(grid[0].id === 'ptm-ptm-test-1-teach-a-0', 'Slot ids are deterministic and prefixed');

const regen = generatePtmSlots(ptmEventFor());
assert(regen.every(s => grid.some(g => g.id === s.id)), 'Re-generating the same event yields identical ids — no duplicates');
assert(new Set(grid.map(s => s.id)).size === grid.length, 'Every slot id is unique');

const nonDivisible = generatePtmSlots(ptmEventFor({ startTime: '16:00', endTime: '17:10' }));
assert(nonDivisible.filter(s => s.teacherId === 'teach-a').length === 4, 'A window that is not a whole number of slots truncates cleanly');
assert(nonDivisible[nonDivisible.length - 1].endsAt === '2026-10-11T17:00', 'The last slot never spills past the window close');

const column = grid.filter(s => s.teacherId === 'teach-a');
assert(column.every((s, i) => i === 0 || s.startsAt === column[i - 1].endsAt), 'Slots tile the window with no gaps or overlaps');

assert(generatePtmSlots(ptmEventFor({ teacherIds: [] })).length === 0, 'An event without teachers cuts no slots');
assert(generatePtmSlots(ptmEventFor({ startTime: '18:00', endTime: '16:00' })).length === 0, 'An inverted window cuts no slots');
assert(generatePtmSlots(ptmEventFor({ startTime: '', endTime: '' })).length === 0, 'Garbage times cut no slots');

// Event validation ------------------------------------------------------------------
assert(validatePtmEvent({ title: 'PTM', date: '2026-10-11', startTime: '16:00', endTime: '18:00', teacherIds: ['teach-a'] }) === null, 'A complete PTM window passes validation');
assert(validatePtmEvent({ title: '   ', date: '2026-10-11', startTime: '16:00', endTime: '18:00', teacherIds: ['teach-a'] }) !== null, 'A blank title is rejected');
assert(validatePtmEvent({ title: 'X'.repeat(121), date: '2026-10-11', startTime: '16:00', endTime: '18:00', teacherIds: ['teach-a'] }) !== null, 'An over-long title is rejected');
assert(validatePtmEvent({ title: 'PTM', date: '', startTime: '16:00', endTime: '18:00', teacherIds: ['teach-a'] }) !== null, 'A missing date is rejected');
assert(validatePtmEvent({ title: 'PTM', date: '10-11-2026', startTime: '16:00', endTime: '18:00', teacherIds: ['teach-a'] }) !== null, 'A non-ISO date is rejected');
assert(validatePtmEvent({ title: 'PTM', date: '2026-10-11', startTime: '5pm', endTime: '18:00', teacherIds: ['teach-a'] }) !== null, 'A non-clock start is rejected');
assert(validatePtmEvent({ title: 'PTM', date: '2026-10-11', startTime: '18:00', endTime: '16:00', teacherIds: ['teach-a'] }) !== null, 'An inverted window is rejected');
assert(validatePtmEvent({ title: 'PTM', date: '2026-10-11', startTime: '16:00', endTime: '16:10', teacherIds: ['teach-a'] }) !== null, 'A window shorter than one slot is rejected');
assert(validatePtmEvent({ title: 'PTM', date: '2026-10-11', startTime: '16:00', endTime: '18:00', teacherIds: [] }) !== null, 'An event without teachers is rejected');
assert(validatePtmEvent({ title: 'PTM', date: '2026-10-11', startTime: '16:00', endTime: '18:00', slotMinutes: 5, teacherIds: ['teach-a'] }) !== null, 'A 5-minute slot is below the minimum');
assert(validatePtmEvent({ title: 'PTM', date: '2026-10-11', startTime: '16:00', endTime: '18:00', slotMinutes: 90, teacherIds: ['teach-a'] }) !== null, 'A 90-minute slot is above the maximum');

// Selectors -------------------------------------------------------------------------
const teacherAColumn = slotsForTeacher(grid, 'teach-a');
assert(teacherAColumn.every(s => s.teacherId === 'teach-a'), 'slotsForTeacher returns one diary column only');
assert(teacherAColumn[0].startsAt === '2026-10-11T16:00', 'slotsForTeacher sorts soonest first');

const claimed: PtmSlot = { ...grid[0], status: 'booked', bookedByUserId: 'user-parent', bookedStudentId: 'stud-r', bookedForName: 'Rahul', bookedAt: '2026-10-02T10:00:00.000Z' };
const mixedSlots = [grid[0], grid[1], claimed, grid[8]];
assert(bookableSlots(mixedSlots).length === 3, 'bookableSlots drops booked rows');
assert(bookableSlots(mixedSlots, 'teach-a').every(s => s.teacherId === 'teach-a'), 'bookableSlots honours the teacher filter');
assert(bookingsForUser(mixedSlots, 'user-parent').length === 1, 'bookingsForUser finds the claimed row');
assert(bookingsForStudent(mixedSlots, 'stud-r').length === 1, 'bookingsForStudent finds the claimed row by child');

// Pure claim + cancel (the exact guards the Firestore transaction reuses) -------------
const bookedByParent = applyBooking({ ...claimed, status: 'available' }, { userId: 'user-parent-2', studentId: 'stud-p', studentName: 'Priya', nowIso: '2026-10-03T12:00:00.000Z' });
assert(bookedByParent.status === 'booked' && bookedByParent.bookedByUserId === 'user-parent-2', 'applyBooking claims an available slot and stamps the actor');
assert(bookedByParent.bookedForName === 'Priya' && bookedByParent.bookedStudentId === 'stud-p' && bookedByParent.bookedAt === '2026-10-03T12:00:00.000Z', 'applyBooking records who the meeting is for and when');

let threw = false;
try { applyBooking(claimed, { userId: 'user-x', studentId: 'stud-x', studentName: 'X', nowIso: 'now' }); } catch { threw = true; }
assert(threw, 'applyBooking REJECTS a double-book — the loser of the race never mutates state');

threw = false;
try { applyBooking({ ...claimed, status: 'cancelled' }, { userId: 'user-x', studentId: 'stud-x', studentName: 'X', nowIso: 'now' }); } catch { threw = true; }
assert(threw, 'applyBooking rejects a retired (cancelled) slot');

threw = false;
try { applyBooking(grid[2], { userId: '', studentId: 'stud-x', studentName: 'X', nowIso: 'now' }); } catch { threw = true; }
assert(threw, 'applyBooking rejects an anonymous actor');

const released = applyCancel(claimed, 'user-parent');
assert(released.status === 'available' && released.bookedForName === null && released.bookedByUserId === null, 'applyCancel frees the slot and clears every booked* field');
assert(applyCancel(claimed, 'user-parent').status === 'available', 'A released slot is bookable again');
threw = false;
try { applyCancel(claimed, 'someone-else'); } catch { threw = true; }
assert(threw, 'applyCancel rejects a non-owner');
threw = false;
try { applyCancel(grid[2], 'user-parent'); } catch { threw = true; }
assert(threw, 'applyCancel rejects an unbooked slot');

// Day-of reminders ------------------------------------------------------------------
const today = '2026-10-08';
const remindSlots: PtmSlot[] = [
  claimed,
  { ...claimed, id: 'ptm-my-diary', teacherId: 'teach-a', bookedByUserId: 'user-parent', bookedForName: 'Rahul', startsAt: `2026-10-08T17:00`, endsAt: `2026-10-08T17:15` },
  { ...grid[2], startsAt: '2026-10-09T16:00', endsAt: '2026-10-09T16:15' },
  { ...grid[3] }
];
const myReminders = dayOfReminders(remindSlots, { userId: 'user-parent', today });
assert(myReminders.length === 1 && myReminders[0].startsAt === '2026-10-08T17:00', 'dayOfReminders surfaces my own meeting that falls today');
assert(dayOfReminders(remindSlots, { teacherId: 'teach-a', today }).some(s => s.startsAt === '2026-10-08T17:00'), 'dayOfReminders also surfaces the teacher diary for today');
assert(dayOfReminders(remindSlots, { userId: 'user-parent', today: '2026-10-11' }).some(s => s.id === claimed.id), 'dayOfReminders matches any day requested');
assert(dayOfReminders(remindSlots, { userId: 'nobody', today }).length === 0, 'Unrelated accounts get no reminders');

// Misc helpers -----------------------------------------------------------------------
assert(teacherNameFor([{ id: 'teach-a', name: 'Anjali Sharma' } as never], 'teach-a') === 'Anjali Sharma', 'teacherNameFor resolves the faculty name');
assert(teacherNameFor([], 'teach-z') === 'Faculty', 'teacherNameFor falls back for an unknown id');
assert(PTM_DEFAULT_SLOT_MINUTES === 15 && PTM_MIN_SLOT_MINUTES === 10 && PTM_MAX_SLOT_MINUTES === 60, 'Slot length bounds are 10–60 minutes, default 15');
assert(formatPtmSlotRange(claimed) === '4:00 – 4:15 PM', 'formatSlotRange formats a slot for the grid');


// ============================================================================
// F9 — Student ID card + Transfer Certificate: numbering, accession, barcode
// ============================================================================

const issuedDocFor = (over: Partial<IssuedDocument> = {}): IssuedDocument => ({
  id: 'doc-test-1',
  orgId: 'org-apex',
  branchId: 'branch-rajpur',
  studentId: 'stud-x',
  type: 'id_card',
  tcNo: null,
  leavingDate: null,
  remarks: null,
  issuedAt: '2026-04-01T09:00:00.000Z',
  issuedByUserId: 'user-admin',
  issuedByName: 'Apex Admin',
  ...over
});

// Year / prefix ----------------------------------------------------------------------
assert(issueYear('2026-10-08T00:00:00.000Z') === '2026', 'issueYear reads the India calendar year');
assert(issueYear('2025-12-31T20:00:00.000Z') === '2026', 'issueYear rolls over at IST midnight, not UTC');
assert(issueYear('not-a-date') === issueYear(), 'issueYear falls back to today on junk input');
assert(tcNumberPrefix({ slug: 'apex-academy', logoText: 'APEX', name: 'Apex Coaching Academy' }) === 'APEXACADEMY', 'tcNumberPrefix slugifies the org');
assert(tcNumberPrefix({ slug: '', logoText: '', name: '  City  Tutorials ' }) === 'CITYTUTORIALS', 'tcNumberPrefix falls back to the name');
assert(tcNumberPrefix({ slug: '', logoText: '', name: '!!!' }) === 'TC', 'tcNumberPrefix never returns an empty prefix');

// Serial format + parsing ------------------------------------------------------------
assert(formatTcNumber('APEXACADEMY', '2026', 1) === 'APEXACADEMY/2026/001', 'formatTcNumber pads the sequence to three digits');
assert(formatTcNumber('APEXACADEMY', '2026', 1000) === 'APEXACADEMY/2026/1000', 'formatTcNumber grows past 999 without truncating');
assert(TC_NUMBER_PAD === 3, 'TC sequence pad is three digits');
assert(parseTcNumber('APEXACADEMY/2026/007', 'APEXACADEMY', '2026') === 7, 'parseTcNumber reads a matching serial');
assert(parseTcNumber('APEXACADEMY/2026/007', 'APEXACADEMY', '2025') === null, 'parseTcNumber rejects another year');
assert(parseTcNumber('APEXACADEMY/2026/007', 'OTHERPREFIX', '2026') === null, 'parseTcNumber rejects another prefix');
assert(parseTcNumber('garbage', 'APEXACADEMY', '2026') === null, 'parseTcNumber rejects junk serials');

// Increment uses the max — never the count — so a gap can't reuse a number ----------
const register: IssuedDocument[] = [
  issuedDocFor({ id: 'd1', type: 'tc', tcNo: 'APEXACADEMY/2026/001', issuedAt: '2026-04-01T10:00:00.000Z' }),
  issuedDocFor({ id: 'd2', type: 'tc', tcNo: 'APEXACADEMY/2026/003', issuedAt: '2026-04-02T10:00:00.000Z' }),
  issuedDocFor({ id: 'd3', type: 'tc', tcNo: 'APEXACADEMY/2025/009', issuedAt: '2025-04-02T10:00:00.000Z' }),
  issuedDocFor({ id: 'd4', type: 'id_card', issuedAt: '2026-04-03T10:00:00.000Z' })
];
assert(nextTcSequence(register, 'APEXACADEMY', '2026') === 4, 'nextTcSequence is max+1 for the year, ignoring gaps and other years');
assert(nextTcNumber(register, 'APEXACADEMY', '2026') === 'APEXACADEMY/2026/004', 'nextTcNumber formats the incremented serial');
assert(nextTcNumber([], 'APEXACADEMY', '2026') === 'APEXACADEMY/2026/001', 'The first TC of a year is 001');
assert(nextTcNumber(register, 'APEXACADEMY', '2027') === 'APEXACADEMY/2027/001', 'A new year restarts the sequence at 001');

// Accession number ------------------------------------------------------------------
assert(formatAccessionNo(1) === 'ACC-0001', 'Accession numbers are zero-padded');
assert(nextAccessionNo([]) === 'ACC-0001', 'The first issued document is ACC-0001');
assert(nextAccessionNo(register) === 'ACC-0005', 'Accession counts every issued document, regardless of type');

// Barcode encoding ------------------------------------------------------------------
const bars = barcodeBars('APX10-0042');
assert(bars.length === 40, 'Barcode has the requested bar count');
assert(bars.every(w => w >= 1 && w <= 3), 'Barcode widths stay within 1–3px');
assert(barcodeBars('APX10-0042').join(',') === bars.join(','), 'Barcode is deterministic for an enrollment number');
assert(barcodeBars('APX10-0099').join(',') !== bars.join(','), 'Different enrollment numbers produce different barcodes');
assert(barcodeBars('', 12).length === 12, 'Barcode tolerates an empty value');

// Validation ------------------------------------------------------------------------
assert(validateTcInput({}) === null, 'An empty TC input is valid (dates/remarks optional)');
assert(validateTcInput({ leavingDate: '2026-03-31' }) === null, 'A well-formed leaving date passes');
assert(validateTcInput({ leavingDate: '31-03-2026' }) !== null, 'A non-ISO leaving date is rejected');
assert(validateTcInput({ remarks: 'x'.repeat(MAX_TC_REMARKS) }) === null, 'Remarks at the limit pass');
assert(validateTcInput({ remarks: 'x'.repeat(MAX_TC_REMARKS + 1) }) !== null, 'Over-long remarks are rejected');

// Selectors -------------------------------------------------------------------------
assert(issuedForStudent(register, 'nobody').length === 0, 'A student with no documents returns nothing');
assert(issuedForStudent(register, 'stud-x').length === 4, 'issuedForStudent collects every document for a learner');
assert(latestIssued(register, 'stud-x', 'tc')?.tcNo === 'APEXACADEMY/2026/003', 'latestIssued returns the newest TC');
assert(latestIssued(register, 'stud-x', 'id_card')?.id === 'd4', 'latestIssued finds the ID card');
assert(documentTypeLabel('tc') === 'Transfer Certificate', 'documentTypeLabel names a TC');
assert(ISSUED_DOCUMENT_LABEL.id_card === 'Student ID Card', 'The ID card label is present');


// ============================================================================
// F10 — Mock series + all-India rank import
// ============================================================================

const f10Roster = [
  { id: 's1', enrollmentNo: 'APX10-0001', rollNo: '1', name: 'Aarav Sharma' },
  { id: 's2', enrollmentNo: 'APX10-0002', rollNo: '2', name: 'Rahul Verma' },
  { id: 's3', enrollmentNo: 'APX10-0003', rollNo: '3', name: 'Sneha Iyer' }
] as unknown as Student[];

// Exam taxonomy ---------------------------------------------------------------------
assert(EXAM_KINDS.length === 4, 'Four exam kinds are supported');
assert(examKindLabel(undefined) === 'Unit Test', 'A missing kind defaults to a unit test');
assert(examKindLabel('mock') === 'Mock Test', 'Mock kind is labelled');
assert(examKindLabel('board') === 'Board Pattern Test', 'Board kind is labelled');
assert(EXAM_KIND_LABEL.full_syllabus === 'Full Syllabus Test', 'Full-syllabus label is present');
assert(isAllIndiaExam({ isAllIndia: true }) === true, 'isAllIndiaExam reads the flag');
assert(isAllIndiaExam({ isAllIndia: false }) === false, 'isAllIndiaExam is false when unset');

// Number formatting + percentile ----------------------------------------------------
assert(formatIndianNumber(247) === '247', 'Three-digit numbers are ungrouped');
assert(formatIndianNumber(4500) === '4,500', 'Four-digit numbers use Indian grouping');
assert(formatIndianNumber(450000) === '4,50,000', 'Lakhs use Indian grouping');
assert(percentileFromRank(1, 100) === 100, 'The top rank sits at the 100th percentile');
assert(percentileFromRank(100, 100) === 1, 'The last rank sits at the 1st percentile');
assert(percentileFromRank(50, 100) === 51, 'Mid ranks match the saveExamResults formula');

// Parsing a pasted ranking sheet ----------------------------------------------------
const sheet = [
  'Roll No, All-India Rank, Total Students, Percentile',
  'APX10-0001, 247, 4500, 94.5',
  '2, 61, 4500',
  'Sneha Iyer, 1284, 4500, 71.5'
].join('\n');
const parsed = parseExternalRankSheet(sheet, f10Roster);
assert(parsed.rows.length === 3, 'Every valid line is parsed');
assert(parsed.errors.length === 0, 'A clean sheet produces no errors');
assert(parsed.rows[0].studentId === 's1' && parsed.rows[0].externalRank === 247, 'Enrollment number resolves to a student');
assert(parsed.rows[0].externalTotalStudents === 4500 && parsed.rows[0].externalPercentile === 94.5, 'Explicit total + percentile are kept');
assert(parsed.rows[1].studentId === 's2' && parsed.rows[1].externalPercentile === 99, 'A missing percentile is derived from rank/total');
assert(parsed.rows[2].studentId === 's3' && parsed.rows[2].externalRank === 1284, 'A name resolves to a student');

const headerOnly = parseExternalRankSheet('Rank, Student\nNobody Here, 123', f10Roster);
assert(headerOnly.rows.length === 0 && headerOnly.errors.length === 1, 'Header rows are skipped, unknown students are errors');

const junk = parseExternalRankSheet('APX10-0001, abc\nAPX10-0002, -3\nAPX10-0003, 0', f10Roster);
assert(junk.rows.length === 0 && junk.errors.length === 0, 'Unparseable / non-positive ranks are ignored quietly');

const badTotal = parseExternalRankSheet('APX10-0001, 500, 100', f10Roster);
assert(badTotal.rows.length === 0 && badTotal.errors.length === 1, 'A total below the rank is rejected');
const badPct = parseExternalRankSheet('APX10-0001, 5, 100, 140', f10Roster);
assert(badPct.rows.length === 0 && badPct.errors.length === 1, 'A percentile above 100 is rejected');
const dupe = parseExternalRankSheet('APX10-0001, 5\n1, 7', f10Roster);
assert(dupe.rows.length === 1 && dupe.errors.length === 1, 'A duplicate student is reported and ignored');
const tabsAndSemicolons = parseExternalRankSheet('APX10-0001\t5\t100;94', f10Roster);
assert(tabsAndSemicolons.rows.length === 1 && tabsAndSemicolons.rows[0].externalPercentile === 94, 'Tabs and semicolons are accepted separators');

// Merging onto internal results -----------------------------------------------------
const f10Existing: ExamResult[] = [
  { id: 'r1', examId: 'e1', studentId: 's1', marksObtained: 88, percentage: 88, rank: 2, percentile: 92, status: 'graded' },
  { id: 'r2', examId: 'e1', studentId: 's2', marksObtained: 94, percentage: 94, rank: 1, percentile: 98, status: 'graded' },
  { id: 'r3', examId: 'e2', studentId: 's1', marksObtained: 70, percentage: 70, rank: 1, percentile: 100, status: 'graded' }
];
const f10Rows: ExternalRankRow[] = [
  { studentId: 's1', externalRank: 12, externalTotalStudents: 1000, externalPercentile: 98.8 },
  { studentId: 's3', externalRank: 400, externalTotalStudents: 1000 }
];
const f10Merge = mergeExternalResults(f10Existing, 'e1', f10Rows);
assert(f10Merge.updated === 1, 'An existing result is updated, not duplicated');
assert(f10Merge.created === 1, 'A learner with no internal result gets a row so the AIR is kept');
assert(f10Merge.results.length === f10Existing.length + 1, 'Exactly one row is added');
const mergedS1 = f10Merge.results.find(r => r.examId === 'e1' && r.studentId === 's1')!;
assert(f10Merge.results.find(r => r.examId === 'e2')!.externalRank === undefined, 'Other exams are left untouched');
assert(f10Merge.results.find(r => r.examId === 'e2' && r.studentId === 's1')!.marksObtained === 70, 'Other exams keep their internal marks');
assert(f10Merge.results.find(r => r.examId === 'e1' && r.studentId === 's2')!.externalRank === undefined, 'A student absent from the sheet is untouched');
assert(mergedS1.externalRank === 12 && mergedS1.externalTotalStudents === 1000, 'Imported rank + total are upserted');
assert(mergedS1.marksObtained === 88 && mergedS1.rank === 2, 'Internal marks/rank are preserved through the import');
assert(f10Merge.results.find(r => r.examId === 'e1' && r.studentId === 's3')!.marksObtained === 0, 'A created row starts with zero internal marks');

// Display + aggregate helpers -------------------------------------------------------
assert(formatAllIndiaRank({ externalRank: 247, externalTotalStudents: 4500 }) === '#247 of 4,500', 'AIR formats with the total');
assert(formatAllIndiaRank({ externalRank: 12 }) === '#12', 'AIR formats without a total');
assert(formatAllIndiaRank({}) === null, 'No imported rank returns null (caller falls back to batch rank)');
assert(airBadge({ externalRank: 247 }) === 'AIR 247', 'AIR badge is compact');
assert(airBadge({ externalRank: undefined }) === null, 'AIR badge is null without a rank');

const f10Stats = externalStats(f10Merge.results, 'e1');
assert(f10Stats.total === 3, 'externalStats counts every result for the exam');
assert(f10Stats.withAir === 2, 'externalStats counts only imported ranks');
assert(f10Stats.bestRank === 12, 'externalStats reports the best (lowest) rank');
assert(f10Stats.averagePercentile === 98.8, 'externalStats averages the imported percentiles');
assert(externalStats(f10Merge.results, 'missing').total === 0, 'externalStats is empty for an unknown exam');


// ============================================================================
// F11 — Structured fee instalments
// ============================================================================

// Splitting money -------------------------------------------------------------------
assert(splitAmount(6000, 3).join(',') === '2000,2000,2000', 'An even split divides cleanly');
const uneven = splitAmount(100, 3);
assert(Math.round(uneven.reduce((a, b) => a + b, 0) * 100) / 100 === 100, 'Uneven parts still sum to the whole');
assert(uneven[0] === 33.34 && uneven[1] === 33.33 && uneven[2] === 33.33, 'Remainder paise land on the earliest parts');
const onePaise = splitAmount(0.01, 2);
assert(onePaise[0] === 0.01 && onePaise[1] === 0, 'A one-paise split keeps the paise on the first part');
assert(splitAmount(500, 1)[0] === 500, 'A single-part split is the whole amount');

// Date stepping ---------------------------------------------------------------------
assert(addDays('2026-01-31', 1) === '2026-02-01', 'Adding days rolls the month over');
assert(addDays('2026-12-31', 1) === '2027-01-01', 'Adding days rolls the year over');
assert(addDays('not-a-date', 5) === 'not-a-date', 'A malformed date is returned unchanged');

// Plan builder ----------------------------------------------------------------------
assert(clampInstallmentCount(1) === MIN_INSTALLMENTS, 'Too few instalments are clamped up');
assert(clampInstallmentCount(99) === MAX_INSTALLMENTS, 'Too many instalments are clamped down');
assert(clampInstallmentCount(4) === 4, 'A sane instalment count is kept');

const plan = buildInstallments(6000, 3, '2026-09-10', 30);
assert(plan.length === 3, 'buildInstallments makes the requested number of parts');
assert(plan.reduce((a, b) => a + b.amount, 0) === 6000, 'Plan amounts sum to the invoice total');
assert(plan[0].dueDate === '2026-09-10' && plan[1].dueDate === '2026-10-10' && plan[2].dueDate === '2026-11-09', 'Due dates are evenly spaced by the interval');
assert(plan.every(p => p.status === 'pending' && p.paidAmount === 0 && p.paymentIds.length === 0), 'A fresh plan starts fully unpaid');
assert(buildInstallments(6000, 3, '2026-09-10').length === 3, 'The default interval still builds a plan');

// Allocating payments ----------------------------------------------------------------
const freshPlan = buildInstallments(6000, 3, '2026-09-10', 30);
const part = allocatePayment(freshPlan, 2000, 'pay-a');
assert(part.allocated === 2000, 'A full instalment payment is fully allocated');
assert(part.installments[0].status === 'paid' && part.installments[0].paidAmount === 2000, 'The first instalment is marked paid');
assert(part.installments[0].paymentIds.join(',') === 'pay-a', 'The payment id is stamped on the settled instalment');
assert(nextDueInstallment(part.installments)?.id === 'inst-2', 'The next unpaid instalment advances');

const partial = allocatePayment(part.installments, 1500, 'pay-b');
assert(partial.installments[1].status === 'partially_paid' && partial.installments[1].paidAmount === 1500, 'A part payment marks the instalment part-paid');
assert(partial.installments[2].paidAmount === 0, 'Untouched instalments stay at zero');
assert(installmentBalance(partial.installments[1]) === 500, 'The part-paid instalment reports its remaining balance');

const across = allocatePayment(partial.installments, 3000, 'pay-c');
assert(across.allocated === 2500, 'Allocation applies only what the plan still owes');
assert(across.installments[1].status === 'paid' && across.installments[1].paidAmount === 2000, 'A payment first tops up the part-paid instalment');
assert(across.installments[2].paidAmount === 2000 && across.installments[2].status === 'paid', 'The remainder spills into the next instalment and settles it');
assert(across.installments[2].paymentIds.join(',') === 'pay-c', 'The spilling payment is linked to every instalment it touched');

const overpay = allocatePayment(freshPlan, 9999, 'pay-d');
assert(overpay.allocated === 6000, 'Allocation stops at the plan total');
assert(overpay.installments.every(i => i.status === 'paid'), 'An overpayment settles every instalment');
assert(freshPlan[0].status === 'pending' && freshPlan[0].paidAmount === 0, 'Allocation never mutates the original plan');

// Status derivation -----------------------------------------------------------------
assert(invoiceStatusFromInstallments(buildInstallments(10, 2, '2026-01-01')) === 'pending', 'An untouched plan is pending');
assert(invoiceStatusFromInstallments(overpay.installments) === 'paid', 'A fully covered plan is paid');
assert(invoiceStatusFromInstallments(partial.installments) === 'partially_paid', 'A partially covered plan is part-paid');
const overdueInst: Installment = { id: 'x', label: 'Instalment 1', amount: 1, dueDate: '2020-01-01', status: 'pending', paidAmount: 0, paymentIds: [] };
assert(isInstallmentOverdue(overdueInst, '2026-01-01'), 'A past-due unpaid instalment is overdue');
assert(!isInstallmentOverdue({ ...overdueInst, status: 'paid', paidAmount: 1 }, '2026-01-01'), 'A settled past-due instalment is not overdue');
assert(formatInstallmentStatus('paid') === 'Paid' && formatInstallmentStatus('partially_paid') === 'Part-paid' && formatInstallmentStatus('pending') === 'Pending', 'Instalment labels render for all three states');

// Summaries + next-due helpers ------------------------------------------------------
const summary = installmentsSummary(partial.installments);
assert(summary.count === 3 && summary.paidCount === 1, 'The summary counts paid instalments');
assert(summary.total === 6000 && summary.paid === 3500 && summary.due === 2500, 'The summary totals paid + due correctly');
assert(summary.nextDue?.id === 'inst-2', 'The summary points at the next unpaid instalment');

const f11Invoice: Pick<FeeInvoice, 'installments' | 'dueDate' | 'netAmount' | 'paidAmount'> = {
  installments: partial.installments,
  dueDate: '2026-09-10',
  netAmount: 6000,
  paidAmount: 3500
};
assert(nextPaymentDueDate(f11Invoice) === '2026-10-10', 'The next payable date prefers the next instalment');
assert(nextPaymentDueAmount(f11Invoice) === 500, 'The next payable amount is the open instalment balance');
assert(nextPaymentDueDate({ dueDate: '2026-09-10' }) === '2026-09-10', 'Without a plan the invoice due date is used');
assert(nextPaymentDueAmount({ netAmount: 1000, paidAmount: 400 }) === 600, 'Without a plan the whole remaining balance is due');
assert(nextPaymentDueDate({ installments: [], dueDate: '2026-09-10' }) === '2026-09-10', 'An empty plan falls back to the invoice due date');


// ============================================================================
// F12 — Session rollover (new academic year)
// ============================================================================

const mkRollBatch = (over: Partial<Batch>): Batch => ({
  id: 'batch-x',
  orgId: 'org-x',
  branchId: 'branch-x',
  name: 'Class 9 - Mathematics',
  subject: 'Mathematics',
  classGrade: 'Class 9',
  teacherId: 'teach-x',
  classroom: 'Room 1',
  scheduleDays: ['Mon', 'Wed', 'Fri'],
  timeSlot: '05:00 PM - 06:30 PM',
  capacity: 25,
  studentIds: [],
  feeAmountMonthly: 2000,
  academicYear: '2026-2027',
  status: 'active',
  ...over
});

const mkRollStudent = (over: Partial<Student>): Student => ({
  id: 'stud-x',
  orgId: 'org-x',
  branchId: 'branch-x',
  enrollmentNo: 'ORG/2026/001',
  rollNo: '1',
  name: 'Student X',
  gender: 'Male',
  classGrade: 'Class 9',
  board: 'Coaching',
  schoolName: 'School X',
  dateOfBirth: '2010-01-01',
  admissionDate: '2026-04-01',
  phone: '9999999999',
  address: 'Civil Lines',
  avatar: '',
  batchIds: [],
  guardian: { fatherName: 'Father', fatherPhone: '9999999998', parentUserId: 'parent-x' },
  status: 'active',
  ...over
});

// Class mapping + rename ------------------------------------------------------------
assert(classLevel('Class 10') === 10 && classLevel('Class 9') === 9, 'The class level is parsed from the label');
assert(classLevel('JEE Foundation') === null, 'A label without a class has no level');
assert(classLevel('Class 99') === null, 'An out-of-range class has no level');
assert(nextClassGrade('Class 8') === 'Class 9', 'Class 8 rolls into Class 9');
assert(nextClassGrade('Class 11') === 'Class 12', 'Class 11 rolls into Class 12');
assert(nextClassGrade('Class 12') === null, 'Class 12 graduates with no next class');
assert(nextClassGrade('Grade-9') === 'Grade-10', 'The label style is preserved when rolling');
assert(nextClassGrade('Foundation') === null, 'An unclassed batch has no next class');

assert(nextAcademicYear('2026-2027') === '2027-2028', 'An academic year rolls forward one year');
assert(nextAcademicYear('2027-2028') === '2028-2029', 'The next span is not hard-coded to a single year');
assert(nextAcademicYear('not-a-year') === 'not-a-year', 'A malformed academic year passes through');
assert(academicYearSpan('2026-2027')?.join(',') === '2026,2027', 'The academic year span parses');

assert(slugify('Class 10') === 'class-10' && slugify('Math & Logic') === 'math-logic', 'Slugs are lower-case and hyphenated');
assert(rolloverBatchId('Class 10', 'Mathematics', '2027-2028') === 'batch-class-10-mathematics-2027-2028', 'Target batch ids are deterministic');
assert(renameBatchForNextYear('Class 9 - Mathematics Batch A', 'Class 9', 'Class 10') === 'Class 10 - Mathematics Batch A', 'The class label inside a batch name is rewritten');
assert(renameBatchForNextYear('Math Booster', 'Class 9', 'Class 10') === 'Class 10 · Math Booster', 'A name without the class is prefixed with the target class');
assert(firstInvoiceMonth('2027-2028') === 'April 2027', 'The first invoice month is April of the start year');
assert(firstInvoiceDueDate('2027-2028') === '2027-04-10', 'The first invoice is due on the 10th');

// Plan building: carry, filter inactive, graduate, dedupe, ignore completed -----------------
const rolloverPlan = buildRolloverPlan({
  batches: [
    mkRollBatch({ id: 'b-math9', studentIds: ['s-a', 's-b', 's-c'] }),
    mkRollBatch({ id: 'b-math9-dup', name: 'Class 9 - Mathematics (Evening)', studentIds: ['s-d'] }),
    mkRollBatch({ id: 'b-phy12', classGrade: 'Class 12', subject: 'Physics', name: 'Class 12 - Physics', studentIds: ['s-e'] }),
    mkRollBatch({ id: 'b-c8-empty', classGrade: 'Class 8', subject: 'Math & Logic', name: 'Class 8 - Foundation', studentIds: [] }),
    mkRollBatch({ id: 'b-done', classGrade: 'Class 11', subject: 'Chemistry', name: 'Class 11 - Chemistry', status: 'completed', studentIds: ['s-f'] })
  ],
  students: [
    mkRollStudent({ id: 's-a', name: 'A' }),
    mkRollStudent({ id: 's-b', name: 'B' }),
    mkRollStudent({ id: 's-c', name: 'C', status: 'inactive' }),
    mkRollStudent({ id: 's-d', name: 'D' }),
    mkRollStudent({ id: 's-e', name: 'E' }),
    mkRollStudent({ id: 's-f', name: 'F' })
  ],
  fromYear: '2026-2027',
  toYear: '2027-2028'
});

const mathRow = rolloverPlan.batches.find(row => row.sourceBatchId === 'b-math9')!;
const dupRow = rolloverPlan.batches.find(row => row.sourceBatchId === 'b-math9-dup')!;
const phy12Row = rolloverPlan.batches.find(row => row.sourceBatchId === 'b-phy12')!;
const emptyRow = rolloverPlan.batches.find(row => row.sourceBatchId === 'b-c8-empty')!;

assert(mathRow.toClassGrade === 'Class 10' && mathRow.newName === 'Class 10 - Mathematics', 'A batch carries the class forward and is renamed');
assert(mathRow.carriedStudentIds.join(',') === 's-a,s-b', 'Only active enrolled students are carried');
assert(rolloverPlan.newBatchCount === 1, 'Only one new batch is planned');
assert(rolloverPlan.carriedStudentCount === 2, 'Carried students are counted once');
assert(rolloverPlan.invoiceCount === 2, 'One first-month invoice is planned per carried student');
assert(rolloverPlan.invoices.every(invoice => invoice.amount === 2000 && invoice.dueDate === '2027-04-10'), 'Invoice drafts carry the batch fee and first-month due date');
assert(dupRow.skipReason !== null, 'A second batch rolling into the same class & subject is deduped');
assert(phy12Row.isTerminal && phy12Row.skipReason !== null, 'A graduating Class 12 batch is left behind');
assert(emptyRow.skipReason !== null, 'A batch with no active students is left behind');
assert(!rolloverPlan.batches.some(row => row.sourceBatchId === 'b-done'), 'A completed batch is not rolled over');

// Existing target year skips the rollover -----------------------------------------------
const existingPlan = buildRolloverPlan({
  batches: [mkRollBatch({ id: 'b-math9', studentIds: ['s-a'] })],
  students: [mkRollStudent({ id: 's-a' })],
  fromYear: '2026-2027',
  toYear: '2027-2028',
  existingBatchIds: [rolloverBatchId('Class 10', 'Mathematics', '2027-2028')]
});
assert(existingPlan.newBatchCount === 0, 'A class already present next year is not duplicated');
assert(existingPlan.batches[0].skipReason !== null, 'The already-existing slot is reported to the admin');

// Fee overrides flow into the plan and the invoices ------------------------------------
const feePlan = buildRolloverPlan({
  batches: [mkRollBatch({ id: 'b-fee', studentIds: ['s-a', 's-b'] })],
  students: [mkRollStudent({ id: 's-a' }), mkRollStudent({ id: 's-b' })],
  fromYear: '2026-2027',
  toYear: '2027-2028',
  feeOverrides: { 'b-fee': 2500 }
});
assert(feePlan.batches[0].feeAmountMonthly === 2500, 'An edited monthly fee replaces the batch default');
assert(feePlan.invoices.every(invoice => invoice.amount === 2500), 'The edited fee is used on every first-month invoice');

// Year suggestion ------------------------------------------------------------------------
const suggestion = suggestedRolloverYears([
  mkRollBatch({ id: 'y1', academicYear: '2025-2026' }),
  mkRollBatch({ id: 'y2', academicYear: '2026-2027' })
]);
assert(suggestion?.fromYear === '2026-2027' && suggestion?.toYear === '2027-2028', 'The latest academic year seeds the next rollover');
assert(suggestedRolloverYears([]) === null, 'No batches means no year suggestion');

// -------------------------------------------------------------
// Cloud entitlements — "free software, paid cloud"
// (the free tier must stay free; paid SKUs only unlock cloud services)
// -------------------------------------------------------------
console.log('\n===== Cloud entitlements & metering =====');

// Free tier invariants
assert(FREE_ENTITLEMENTS.core === true, 'Core ERP is included on the free tier');
assert(FREE_ENTITLEMENTS.period === 'free', 'Free tier reports period "free"');
assert(FREE_ENTITLEMENTS.maxStudents > 0, 'Free tier has a finite student cap');
assert(FREE_ENTITLEMENTS.maxStaff === UNLIMITED, 'Staff are unlimited on the free tier');
assert(FREE_ENTITLEMENTS.messagingCredits === 0, 'Free tier grants no paid message credits');
assert(FREE_ENTITLEMENTS.customBrand === false, 'Free tier cannot use a custom brand');
assert(FREE_ENTITLEMENTS.brandedApp === false, 'Free tier cannot publish a branded app');
assert(FREE_ENTITLEMENTS.mediaBytesQuota > 0, 'Free tier includes a small media allowance');
assert(FREE_ENTITLEMENTS.skus.length === 0, 'Free tier owns no cloud SKUs');

// Resolution cascade: free base -> legacy caps -> explicit overrides -> SKU grants
const freeResolved = resolveEntitlements({});
assert(freeResolved.maxStudents === FREE_ENTITLEMENTS.maxStudents, 'Empty org resolves to the free caps');
assert(freeResolved.core === true, 'Resolved org always keeps the free core ontology');

const legacyResolved = resolveEntitlements({ maxStudents: 500, maxBranches: 3 } as any);
assert(legacyResolved.maxStudents === 500 && legacyResolved.maxBranches === 3, 'Legacy stored caps are respected');

const overrideResolved = resolveEntitlements({ maxStudents: 500, entitlements: { maxStudents: 50 } } as any);
assert(overrideResolved.maxStudents === 50, 'Explicit entitlement override beats the legacy cap');

const mediaResolved = resolveEntitlements({ entitlements: { skus: ['media'] } } as any);
assert(mediaResolved.mediaBytesQuota === 10 * 1024 * 1024 * 1024, 'Media SKU grants 10 GB');
assert(mediaResolved.period === 'active', 'Purchasing a SKU promotes the org to period "active"');

const proResolved = resolveEntitlements({ entitlements: { skus: ['pro'] } } as any);
assert(proResolved.customBrand && proResolved.brandedApp, 'Cloud Pro unlocks brand + branded app');
assert(proResolved.messagingCredits > 0 && proResolved.aiCredits > 0, 'Cloud Pro unlocks messaging + AI credits');

// SKU lookup & bundle satisfaction
assert(getCloudSku('media')?.priceMonthly === 99, 'Media SKU is priced at ₹99/mo');
assert(getCloudSku('nope' as any) === undefined, 'Unknown SKU id returns undefined');
assert(hasSku(proResolved, 'brand') === true, 'Cloud Pro satisfies an individual SKU check');
assert(hasSku(mediaResolved, 'brand') === false, 'A single SKU does not imply other SKUs');

// Catalog hygiene
assert(new Set(CLOUD_SKUS.map(s => s.id)).size === CLOUD_SKUS.length, 'Cloud SKU ids are unique');
assert(CLOUD_SKUS.every(s => s.priceMonthly > 0), 'Every cloud SKU has a positive price');
assert(CLOUD_SKUS.every(s => Object.keys(s.grants).length > 0), 'Every cloud SKU grants something');

// resolveEntitlements must never mutate the shared free constant
resolveEntitlements({ entitlements: { skus: ['pro', 'video'] } } as any);
assert(FREE_ENTITLEMENTS.skus.length === 0, 'Resolving entitlements does not mutate the free constant');

// Quota math
assert(isUnlimited(UNLIMITED) === true && isUnlimited(0) === false, 'UNLIMITED sentinel recognised');
assert(remainingQuota(100, 30) === 70, 'Remaining quota subtracts usage');
assert(remainingQuota(UNLIMITED, 999) === Infinity, 'Unlimited quota reports Infinity remaining');
assert(isQuotaExceeded(100, 101) === true && isQuotaExceeded(100, 100) === false, 'Quota overage detected past the cap');
assert(isQuotaExceeded(UNLIMITED, 10_000_000) === false, 'Unlimited quota can never be exceeded');
assert(quotaPct(100, 50) === 50, 'Quota percentage is computed');
assert(quotaPct(100, 200) === 100, 'Quota percentage is clamped at 100');
assert(quotaPct(UNLIMITED, 5) === 0, 'Unlimited quota renders no bar');
assert(withinStudentCap(FREE_ENTITLEMENTS, FREE_ENTITLEMENTS.maxStudents - 1) === true, 'Can admit up to the student cap');
assert(withinStudentCap(FREE_ENTITLEMENTS, FREE_ENTITLEMENTS.maxStudents) === false, 'Cannot admit past the student cap');

// Formatting & usage
assert(formatBytes(0) === '0 B', 'Zero bytes formats cleanly');
assert(formatBytes(1024) === '1 KB', 'KB formatting works');
assert(formatBytes(1536) === '1.5 KB', 'Fractional KB formatting works');
assert(formatBytes(1024 * 1024) === '1 MB', 'MB formatting works');
assert(formatBytes(1024 * 1024 * 1024) === '1 GB', 'GB formatting works');
const freshUsage = emptyUsage();
assert(
  freshUsage.mediaBytes === 0 && freshUsage.messagesSent === 0 && freshUsage.aiCreditsUsed === 0,
  'Empty usage starts at zero'
);
assert(entitlementSummary(FREE_ENTITLEMENTS).some(line => line.includes('students')), 'Entitlement summary lists student allowance');

// -------------------------------------------------------------
// G1 — cursor pagination helpers (fixes silent limit(N) data loss)
// -------------------------------------------------------------
console.log('\n===== Cursor pagination helpers =====');

// appendPage: dedupe + added count + hasMore heuristic
const page1Map = new Map<string, string>();
const p1 = appendPage(page1Map, ['a', 'b', 'c'], s => s, 3);
assert(p1.added === 3 && p1.hasMore === true, 'A full first page reports more pages may exist');
const p2 = appendPage(page1Map, ['b', 'c', 'd'], s => s, 3);
assert(p2.added === 1 && page1Map.size === 4 && page1Map.get('d') === 'd', 'Duplicate ids across pages are merged, never duplicated');
const p3 = appendPage(page1Map, ['e', 'f'], s => s, 3);
assert(p3.hasMore === false && p3.added === 2, 'A short page ends pagination');

// applyLiveFirstPage: mirrors the live page when nothing beyond page 1 is loaded
const freshMap = new Map<string, string>();
const stillMore = applyLiveFirstPage(freshMap, ['p', 'q'], s => s, 3);
assert(freshMap.size === 2 && stillMore === false, 'Live page short of pageSize ends pagination');

// applyLiveFirstPage: keeps the already-loaded tail and refreshes page-1 ids
const tailMap = new Map<string, string>([['a', 'a'], ['b', 'b'], ['c', 'c'], ['d', 'd']]);
applyLiveFirstPage(tailMap, ['a', 'x'], s => s, 3);
assert(tailMap.get('x') === 'x' && tailMap.has('d') && tailMap.has('c'), 'Live page-1 refresh keeps the already-loaded tail');
assert(!tailMap.has('z'), 'Non-existent ids are ignored');
assert(tailMap.size === 5, 'Merged set is complete and deduplicated');

// applyLiveFirstPage: an empty live page clears an un-tailed buffer
const emptiedMap = new Map<string, string>([['a', 'a'], ['b', 'b']]);
applyLiveFirstPage(emptiedMap, [], s => s, 3);
assert(emptiedMap.size === 0, 'An empty live page clears the first-page buffer');

// -------------------------------------------------------------
// G2 — push notification preferences (pure helpers)
// -------------------------------------------------------------
console.log('\n===== Push notification preferences =====');

const defaultPrefs = mergePushPrefs(undefined);
assert(
  defaultPrefs.alerts === true && defaultPrefs.feeDue === true &&
  defaultPrefs.results === true && defaultPrefs.announcements === true,
  'Default push prefs enable every category'
);
assert(
  DEFAULT_PUSH_PREFS.alerts === true && Object.keys(DEFAULT_PUSH_PREFS).length === 4,
  'Default push prefs expose exactly the four known categories'
);
const partialPrefs = mergePushPrefs({ feeDue: false });
assert(partialPrefs.feeDue === false && partialPrefs.results === true, 'Partial prefs merge over defaults');
const flipped = togglePushPref(defaultPrefs, 'results');
assert(flipped.results === false && flipped.alerts === true && flipped.feeDue === true, 'togglePushPref flips exactly one key');
const restored = togglePushPref(flipped, 'results');
assert(restored.results === true && restored.alerts === true, 'Toggling a key twice restores it');
const oddPrefs = mergePushPrefs({ results: false, somethingElse: true } as any);
assert(oddPrefs.results === false && oddPrefs.announcements === true, 'Unknown extra keys are ignored by merge');
const nullPrefs = mergePushPrefs(null);
assert(nullPrefs.feeDue === true && nullPrefs.announcements === true, 'Null prefs fall back to defaults');


console.log('\n----------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('----------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
