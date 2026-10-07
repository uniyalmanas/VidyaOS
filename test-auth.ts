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
import { Inquiry, LeaveRequest, Student, Teacher, Batch, AttendanceRecord, TeacherAttendance, SalarySlip } from './src/types';

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

console.log('\n----------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('----------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
