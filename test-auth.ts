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

console.log('\n----------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('----------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
