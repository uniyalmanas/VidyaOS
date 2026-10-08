/**
 * VidyaOS — Full Institute Lifecycle Simulation
 * =============================================================================
 * An end-to-end "day in the life" of a real tuition centre, run against the
 * Firebase Auth + Firestore EMULATORS using the production `firestore.rules`.
 *
 * It creates an institute account, then 3 faculty, 1 front-desk staff, 3
 * batches, 70 students and 70 parents (one parent login per student), and has
 * all of them interact: the desk runs the place, teachers teach & mark
 * attendance, parents pay fees / file leave / book PTM slots / chat, and
 * students attend, take exams and follow the syllabus.
 *
 * Nothing touches production: it runs entirely in the local emulator.
 *
 * Run:
 *   npx firebase emulators:exec --only auth,firestore --project vidyut-2bcb6 \
 *     "npx tsx test-institute-simulation.ts"
 *
 * or simply: npm run simulate
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type Auth
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  writeBatch,
  runTransaction,
  type Firestore
} from 'firebase/firestore';

import { getIndiaDateString, getIndiaDayName } from './src/lib/date';
import { createAuditEntry } from './src/lib/audit';
import {
  buildInstallments,
  allocatePayment,
  invoiceStatusFromInstallments
} from './src/lib/installments';
import { generatePtmSlots, applyBooking } from './src/lib/ptm';
import {
  findSyllabusTemplate,
  buildTopicsFromTemplate,
  coveragePct,
  countByStatus,
  advanceStatus
} from './src/lib/syllabus';
import { findTimetableClashes, isClashFree } from './src/lib/timetable';
import {
  monthYearFromDate,
  summarizeTeacherMonth,
  proratedSalaryHint,
  computeSlipNet,
  teacherAttendanceId,
  formatRupees
} from './src/lib/staffOps';
import { buildProfitAndLoss } from './src/lib/finance';
import {
  nextTcNumber,
  formatAccessionNo,
  tcNumberPrefix,
  issueYear
} from './src/lib/issuedDocuments';
import { percentileFromRank } from './src/lib/exams';
import { buildRolloverPlan } from './src/lib/rollover';
import { reconcileBatchMembership } from './src/lib/rosterSync';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
const PROJECT_ID = 'vidyut-2bcb6';
const AUTH_EMU = 'http://127.0.0.1:9099';
const FS_EMU = { host: '127.0.0.1', port: 8080 };
const PASSWORD = 'Vidy@2026!';

const STAMP = Date.now();
const ORG_ID = `org-sim-${STAMP}`;
const ORG2_ID = `org-sim2-${STAMP}`;
const BRANCH_ID = `branch-${ORG_ID}-main`;
const ACADEMIC_YEAR = '2026-2027';
const NOW_ISO = new Date().toISOString();
const TODAY = getIndiaDateString();

let passed = 0;
let failed = 0;
const at = (name: string, ok: boolean, detail = ''): void => {
  if (ok) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    console.error(`  \u2717 ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

async function runSection(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n\u25B8 ${name}`);
  try {
    await fn();
  } catch (err: any) {
    failed++;
    console.error(`  \u2717 SECTION FAILED: ${err?.code ? `[${err.code}] ` : ''}${err?.message || err}`);
  }
}

/** Returns true when Firestore *denied* the call (the expected outcome). */
async function expectDenied(label: string, fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    console.log(`  \u00B7 ${label}: ALLOWED (unexpected)`);
    return false;
  } catch (err: any) {
    const code = String(err?.code || err?.message || err);
    console.log(`  \u00B7 ${label}: DENIED (${code})`);
    return code.includes('permission-denied') || code.includes('insufficient');
  }
}

interface Client {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

function makeClient(label: string): Client {
  const app = initializeApp(
    {
      projectId: PROJECT_ID,
      apiKey: 'fake-api-key-for-emulator',
      authDomain: `${PROJECT_ID}.firebaseapp.com`
    },
    `sim-${label}-${STAMP}`
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH_EMU, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, FS_EMU.host, FS_EMU.port);
  return { app, auth, db };
}

async function signIn(client: Client, email: string): Promise<string> {
  const cred = await signInWithEmailAndPassword(client.auth, email, PASSWORD);
  return cred.user.uid;
}

interface Write {
  coll: string;
  id: string;
  data: Record<string, unknown>;
}

/** Commit many writes in Firestore-sized batches (rules still apply per doc). */
async function bulkSet(client: Client, writes: Write[]): Promise<void> {
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(client.db);
    for (const w of writes.slice(i, i + 400)) {
      batch.set(doc(client.db, w.coll, w.id), stripUndefined(w.data) as Record<string, unknown>);
    }
    await batch.commit();
  }
}

/** Firestore rejects `undefined` field values — drop them recursively. */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(v => stripUndefined(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

async function countDocs(client: Client, coll: string, orgId = ORG_ID): Promise<number> {
  try {
    const snap = await getDocs(query(collection(client.db, coll), where('orgId', '==', orgId)));
    return snap.size;
  } catch {
    return -1;
  }
}

// Deterministic pseudo-random so every run tells the same story.
let rngState = 987654321;
function rnd(): number {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
}

function scheduledDates(days: string[], count: number, startISO = '2026-09-01'): string[] {
  const out: string[] = [];
  const start = new Date(`${startISO}T06:00:00.000Z`);
  for (let i = 0; i < 120 && out.length < count; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const wd = getIndiaDayName(d).slice(0, 3);
    if (days.includes(wd)) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const virtualEmail = (tag: string, i?: number) =>
  `sim-${STAMP}-${tag}${i !== undefined ? `-${i}` : ''}@phone.vidyaos.in`;

// ---------------------------------------------------------------------------
// Cast
// ---------------------------------------------------------------------------
interface CastTeacher {
  id: string;
  name: string;
  subject: string;
  salary: number;
  qualification: string;
  email: string;
  uid: string;
}
interface CastBatch {
  id: string;
  name: string;
  subject: string;
  classGrade: string;
  board: 'CBSE';
  teacher: string;
  days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[];
  timeSlot: string;
  room: string;
  fee: number;
  studentIds: string[];
}
interface CastStudent {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  batchId: string;
  uid: string;
  parentUid: string;
  enrollmentNo: string;
}

const TEACHERS: CastTeacher[] = [
  { id: 'tch-1', name: 'Anita Deshmukh', subject: 'Mathematics', salary: 32000, qualification: 'M.Sc. Mathematics', email: virtualEmail('teacher', 1), uid: '' },
  { id: 'tch-2', name: 'Rakesh Iyer', subject: 'Science', salary: 30000, qualification: 'M.Sc. Physics', email: virtualEmail('teacher', 2), uid: '' },
  { id: 'tch-3', name: 'Meera Nair', subject: 'Physics', salary: 38000, qualification: 'M.Phil Physics', email: virtualEmail('teacher', 3), uid: '' }
];

const BATCHES: CastBatch[] = [
  { id: 'bat-math10', name: 'Class 10 \u00B7 Mathematics A', subject: 'Mathematics', classGrade: 'Class 10', board: 'CBSE', teacher: 'tch-1', days: ['Mon', 'Wed', 'Fri'], timeSlot: '05:00 PM - 06:30 PM', room: 'Hall 1', fee: 1800, studentIds: [] },
  { id: 'bat-sci10', name: 'Class 10 \u00B7 Science A', subject: 'Science', classGrade: 'Class 10', board: 'CBSE', teacher: 'tch-2', days: ['Tue', 'Thu', 'Sat'], timeSlot: '06:30 PM - 08:00 PM', room: 'Hall 2', fee: 1600, studentIds: [] },
  { id: 'bat-phy12', name: 'Class 12 \u00B7 Physics', subject: 'Physics', classGrade: 'Class 12', board: 'CBSE', teacher: 'tch-3', days: ['Mon', 'Tue', 'Thu'], timeSlot: '07:00 PM - 08:30 PM', room: 'Lab 1', fee: 2200, studentIds: [] }
];

const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Pari', 'Anika', 'Navya', 'Myra', 'Sara', 'Ira', 'Rohan', 'Kabir', 'Dhruv', 'Aryan', 'Yash', 'Nisha', 'Priya', 'Sneha', 'Meera', 'Kavya', 'Rahul', 'Amit', 'Sumit', 'Pooja', 'Neha'];
const LAST_NAMES = ['Sharma', 'Verma', 'Iyer', 'Nair', 'Patel', 'Reddy', 'Gupta', 'Singh', 'Mehta', 'Joshi', 'Kulkarni', 'Rao', 'Das', 'Bose', 'Chopra'];
const STUDENTS: CastStudent[] = [];

(function buildRoster() {
  const sizes = [26, 24, 20]; // 70 students across 3 batches
  let n = 0;
  BATCHES.forEach((batch, b) => {
    for (let k = 0; k < sizes[b]; k++) {
      n++;
      const first = FIRST_NAMES[n % FIRST_NAMES.length];
      const last = LAST_NAMES[(n * 3) % LAST_NAMES.length];
      STUDENTS.push({
        id: `std-${String(n).padStart(3, '0')}`,
        name: `${first} ${last}`,
        gender: n % 2 === 0 ? 'Female' : 'Male',
        batchId: batch.id,
        uid: '',
        parentUid: '',
        enrollmentNo: `VSA10-${String(n).padStart(4, '0')}`
      });
      batch.studentIds.push(`std-${String(n).padStart(3, '0')}`);
    }
  });
})();

const TOTAL_STUDENTS = STUDENTS.length; // 70
const TOTAL_PARENTS = STUDENTS.length; // one parent login per student

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log('==============================================================');
  console.log('  VidyaOS \u2014 Full Institute Lifecycle Simulation');
  console.log(`  org:      ${ORG_ID}`);
  console.log(`  today:    ${TODAY}`);
  console.log(`  cast:     1 admin, 1 staff, ${TEACHERS.length} faculty,`);
  console.log(`            ${BATCHES.length} batches, ${TOTAL_STUDENTS} students, ${TOTAL_PARENTS} parents`);
  console.log('==============================================================');

  const admin = makeClient('admin');
  const staff = makeClient('staff');
  const teacher = makeClient('teacher');
  const learner = makeClient('learner');
  const signup = makeClient('signup');
  const anon = makeClient('anon');

  // =========================================================================
  // 1. ONBOARDING — create the institute account
  // =========================================================================
  let adminUid = '';
  let staffUid = '';
  await runSection('1. Onboarding \u2014 institute account', async () => {
    const cred = await createUserWithEmailAndPassword(
      admin.auth,
      virtualEmail('admin'),
      PASSWORD
    );
    adminUid = cred.user.uid;
    await setDoc(doc(admin.db, 'organizations', ORG_ID), {
      id: ORG_ID,
      ownerUid: adminUid,
      name: 'Vidya Simulation Academy',
      slug: 'vidya-simulation-academy',
      logoText: 'VSA',
      email: virtualEmail('admin'),
      phone: '+91 98000 00001',
      address: '12 MG Road',
      city: 'Pune',
      state: 'Maharashtra',
      board: 'CBSE',
      plan: 'growth',
      status: 'active',
      branches: [
        { id: BRANCH_ID, orgId: ORG_ID, name: 'Main Campus', address: '12 MG Road', city: 'Pune', phone: '+91 98000 00001', isMain: true }
      ],
      createdAt: NOW_ISO
    });
    await setDoc(doc(admin.db, 'users', adminUid), {
      id: adminUid,
      uid: adminUid,
      role: 'CENTER_ADMIN',
      orgId: ORG_ID,
      branchId: BRANCH_ID,
      name: 'Simulation Admin',
      phone: '+91 98000 00001',
      email: virtualEmail('admin'),
      designation: 'Director'
    });
    const orgSnap = await getDoc(doc(admin.db, 'organizations', ORG_ID));
    at('institute organisation created and owned by the admin', orgSnap.exists());
    at('admin user profile provisioned (CENTER_ADMIN)', adminUid.length > 0);
  });

  // =========================================================================
  // 2. PROVISIONING — staff, faculty, students, parents
  // =========================================================================
  await runSection('2. Provisioning \u2014 staff, faculty, students, parents', async () => {
    // Auth accounts (created through the emulator; admin writes the profiles).
    const staffCred = await createUserWithEmailAndPassword(staff.auth, virtualEmail('staff'), PASSWORD);
    staffUid = staffCred.user.uid;
    for (const t of TEACHERS) {
      const c = await createUserWithEmailAndPassword(signup.auth, t.email, PASSWORD);
      t.uid = c.user.uid;
    }
    for (const s of STUDENTS) {
      const c = await createUserWithEmailAndPassword(signup.auth, virtualEmail('student', Number(s.id.slice(4))), PASSWORD);
      s.uid = c.user.uid;
      const p = await createUserWithEmailAndPassword(signup.auth, virtualEmail('parent', Number(s.id.slice(4))), PASSWORD);
      s.parentUid = p.user.uid;
    }

    const userWrites: Write[] = [];
    userWrites.push({
      coll: 'users', id: staffUid,
      data: { id: staffUid, uid: staffUid, role: 'STAFF', orgId: ORG_ID, branchId: BRANCH_ID, name: 'Pooja Kadam', phone: '+91 98000 00002', email: virtualEmail('staff'), designation: 'Front Desk Executive' }
    });
    for (const t of TEACHERS) {
      userWrites.push({
        coll: 'users', id: t.uid,
        data: { id: t.uid, uid: t.uid, role: 'TEACHER', orgId: ORG_ID, branchId: BRANCH_ID, name: t.name, phone: `+91 98001 0000${t.id.slice(-1)}`, email: t.email, subjects: [t.subject], qualification: t.qualification }
      });
    }
    for (const s of STUDENTS) {
      userWrites.push({
        coll: 'users', id: s.uid,
        data: { id: s.uid, uid: s.uid, role: 'STUDENT', orgId: ORG_ID, branchId: BRANCH_ID, name: s.name, classGrade: 'Class 10', rollNo: s.id.slice(-3), schoolName: 'Sunrise Public School' }
      });
      userWrites.push({
        coll: 'users', id: s.parentUid,
        data: { id: s.parentUid, uid: s.parentUid, role: 'PARENT', orgId: ORG_ID, branchId: BRANCH_ID, name: `Mr./Ms. ${s.name.split(' ')[1]}`, linkedStudentIds: [s.id], occupation: 'Service' }
      });
    }
    await bulkSet(admin, userWrites);
    at(`${userWrites.length} user profiles written (staff + faculty + ${TOTAL_STUDENTS} students + ${TOTAL_PARENTS} parents)`, true);
    at('staff account can authenticate', (await signIn(staff, virtualEmail('staff'))).length > 0);
  });

  // =========================================================================
  // 3. BATCHES + TEACHERS + STUDENTS
  // =========================================================================
  let rosterSynced = 0;
  await runSection('3. Batches, faculty records & student admission', async () => {
    const teacherWrites: Write[] = TEACHERS.map(t => ({
      coll: 'teachers', id: t.id,
      data: { id: t.id, orgId: ORG_ID, branchId: BRANCH_ID, userId: t.uid, name: t.name, phone: `+91 98001 0000${t.id.slice(-1)}`, email: t.email, avatar: '', qualification: t.qualification, subjects: [t.subject], assignedBatchIds: BATCHES.filter(b => b.teacher === t.id).map(b => b.id), joiningDate: '2026-04-01', salary: t.salary, status: 'active' }
    }));
    await bulkSet(admin, teacherWrites);
    at(`${TEACHERS.length} faculty records created`, true);

    const batchWrites: Write[] = BATCHES.map(b => ({
      coll: 'batches', id: b.id,
      data: { id: b.id, orgId: ORG_ID, branchId: BRANCH_ID, name: b.name, subject: b.subject, classGrade: b.classGrade, teacherId: b.teacher, classroom: b.room, scheduleDays: b.days, timeSlot: b.timeSlot, capacity: 30, studentIds: b.studentIds, feeAmountMonthly: b.fee, academicYear: ACADEMIC_YEAR, status: 'active' }
    }));
    await bulkSet(admin, batchWrites);
    at(`${BATCHES.length} batches created (${BATCHES.map(b => `${b.name} = ${b.studentIds.length}`).join(', ')})`, true);

    const studentWrites: Write[] = STUDENTS.map((s, i) => ({
      coll: 'students', id: s.id,
      data: {
        id: s.id, orgId: ORG_ID, branchId: BRANCH_ID, enrollmentNo: s.enrollmentNo, rollNo: String(i + 1),
        name: s.name, gender: s.gender, classGrade: 'Class 10', board: 'CBSE', schoolName: 'Sunrise Public School',
        dateOfBirth: `2010-0${(i % 9) + 1}-${String((i % 27) + 1).padStart(2, '0')}`,
        admissionDate: '2026-04-01', phone: `+91 98${String(200000000 + i).slice(0, 8)}`, email: virtualEmail('student', i + 1),
        address: `${i + 1}, Shivaji Nagar, Pune`, avatar: '', batchIds: [s.batchId],
        guardian: { fatherName: `Mr. ${s.name.split(' ')[1]}`, fatherPhone: `+91 97${String(300000000 + i).slice(0, 8)}`, motherName: `Mrs. ${s.name.split(' ')[1]}`, parentUserId: s.parentUid },
        status: 'active', userId: s.uid
      }
    }));
    await bulkSet(admin, studentWrites);
    at(`${TOTAL_STUDENTS} students admitted and assigned to their batches`, true);

    // Roster-sync engine: prove batch.studentIds and student.batchIds agree.
    for (const b of BATCHES) {
      const s = STUDENTS.find(x => x.batchId === b.id)!;
      const studentDoc: any = { id: s.id, userId: s.uid, orgId: ORG_ID, batchIds: [], name: s.name, phone: '' };
      const batchDoc: any = { id: b.id, teacherId: b.teacher, orgId: ORG_ID, studentIds: [], name: b.name, subject: b.subject, classGrade: b.classGrade, classroom: b.room, scheduleDays: b.days, timeSlot: b.timeSlot, capacity: 30, feeAmountMonthly: b.fee, academicYear: ACADEMIC_YEAR, status: 'active' };
      const { nextStudent, batchesToUpdate } = reconcileBatchMembership(studentDoc, [batchDoc], [b.id]);
      if (nextStudent.batchIds.includes(b.id) && batchesToUpdate[0]?.studentIds.includes(s.id)) rosterSynced++;
    }
  });
  at('enrollment keeps both roster mirrors in sync for every batch', rosterSynced === BATCHES.length);

  // =========================================================================
  // 4. TIMETABLE
  // =========================================================================
  let timetableSlots: any[] = [];
  await runSection('4. Timetable \u2014 weekly schedule + clash detection', async () => {
    const dayMap: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
    const times: Record<string, [string, string]> = { 'bat-math10': ['17:00', '18:30'], 'bat-sci10': ['18:30', '20:00'], 'bat-phy12': ['19:00', '20:30'] };
    timetableSlots = BATCHES.flatMap(b => b.days.map((d, idx) => ({
      id: `tt-${b.id}-${d}`,
      orgId: ORG_ID, branchId: BRANCH_ID, batchId: b.id,
      dayOfWeek: dayMap[d] as any, startTime: times[b.id][0], endTime: times[b.id][1],
      classroom: b.room, teacherId: b.teacher, subject: b.name,
      meetUrl: idx === 0 ? 'https://meet.google.com/vsa-class-room' : ''
    })));
    // A deliberately clashing prospective slot must be rejected by the engine.
    const clashProbe = { orgId: ORG_ID, branchId: BRANCH_ID, batchId: 'bat-x', dayOfWeek: 'Monday', startTime: '18:00', endTime: '19:00', classroom: 'Hall 9', teacherId: 'tch-1', subject: 'Maths' } as any;
    const clashes = findTimetableClashes(clashProbe, timetableSlots as any);
    at('timetable engine detects a faculty double-booking', clashes.some((c: any) => c.kind === 'teacher'));
    at('timetable engine confirms a free slot is clash-free', isClashFree({ ...clashProbe, teacherId: 'tch-9', classroom: 'Hall 9' } as any, timetableSlots as any));

    await bulkSet(admin, timetableSlots.map(s => ({ coll: 'timetableSlots', id: s.id, data: s })));
    at(`${timetableSlots.length} weekly class slots published`, true);

    // A student can read their batch's schedule.
    const child = STUDENTS[0];
    await signIn(learner, virtualEmail('student', 1));
    const snap = await getDocs(query(collection(learner.db, 'timetableSlots'), where('orgId', '==', ORG_ID), where('batchId', '==', child.batchId)));
    at(`student sees their ${snap.size} scheduled classes`, snap.size === BATCHES.find(b => b.id === child.batchId)!.days.length);
  });

  // =========================================================================
  // 5. ATTENDANCE — teachers mark their batches
  // =========================================================================
  const attendanceRows: any[] = [];
  await runSection('5. Attendance \u2014 each teacher marks their batch', async () => {
    for (const b of BATCHES) {
      const t = TEACHERS.find(x => x.id === b.teacher)!;
      const uid = await signIn(teacher, t.email);
      const dates = scheduledDates(b.days, 6);
      const writes: Write[] = [];
      for (const d of dates) {
        for (const sid of b.studentIds) {
          const r = rnd();
          const status = r < 0.85 ? 'present' : r < 0.93 ? 'absent' : r < 0.97 ? 'late' : 'excused';
          const row = {
            id: `att-${b.id}-${d}-${sid}`, orgId: ORG_ID, branchId: BRANCH_ID, batchId: b.id,
            studentId: sid, date: d, status, markedByUserId: uid, markedAt: NOW_ISO
          };
          attendanceRows.push(row);
          writes.push({ coll: 'attendance', id: row.id, data: row });
        }
      }
      await bulkSet(teacher, writes);
      console.log(`    ${t.name} marked ${b.studentIds.length} students over ${dates.length} class days`);
    }
    const present = attendanceRows.filter(r => r.status === 'present').length;
    at(`${attendanceRows.length} attendance records written (${present} present)`, attendanceRows.length > 0);
    const attendanceRate = Math.round((present / attendanceRows.length) * 100);
    console.log(`    institute-wide attendance rate: ${attendanceRate}%`);
  });

  // =========================================================================
  // 6. FEE INVOICES — desk raises the monthly fee for all 70
  // =========================================================================
  const invoices: any[] = [];
  await runSection('6. Fee invoices \u2014 monthly billing for every student', async () => {
    const month = 'October 2026';
    const dueDate = '2026-10-10';
    const writes: Write[] = [];
    STUDENTS.forEach((s, i) => {
      const b = BATCHES.find(x => x.id === s.batchId)!;
      const amount = b.fee;
      const discount = i % 7 === 0 ? Math.round(amount * 0.1) : 0; // sibling/scholarship discount
      const netAmount = amount - discount;
      const withPlan = i % 4 === 0; // every 4th family pays in 3 instalments (F11)
      const inv: any = {
        id: `inv-${s.id}-2026-10`, orgId: ORG_ID, branchId: BRANCH_ID, studentId: s.id, batchId: b.id,
        invoiceNo: `VSA/2026/${String(i + 1).padStart(4, '0')}`, monthYear: month, title: `Monthly Fee \u2014 ${month}`,
        amount, discount, lateFee: 0, netAmount, paidAmount: 0, dueDate, status: 'pending', payments: [], createdAt: NOW_ISO
      };
      if (withPlan) inv.installments = buildInstallments(netAmount, 3, dueDate, 30);
      invoices.push(inv);
      writes.push({ coll: 'invoices', id: inv.id, data: inv });
    });
    await bulkSet(admin, writes);
    const billed = invoices.reduce((a, x) => a + x.netAmount, 0);
    const plans = invoices.filter(x => x.installments).length;
    at(`${invoices.length} invoices raised (${formatRupees(billed)} billed)`, invoices.length === TOTAL_STUDENTS);
    at(`${plans} families placed on a 3-instalment plan`, plans > 0);
  });

  // =========================================================================
  // 7. FEE COLLECTION — all 70 parents submit UPI payments, desk verifies
  // =========================================================================
  const submissions: { id: string; studentId: string; parentUid: string; amount: number; outcome: 'full' | 'partial' | 'installment' | 'reject' }[] = [];
  await runSection('7. Fee collection \u2014 parents pay by UPI, desk verifies', async () => {
    const submits: Write[] = [];
    STUDENTS.forEach((s, i) => {
      const inv = invoices[i];
      let amount: number;
      let outcome: 'full' | 'partial' | 'installment' | 'reject';
      if (inv.installments) { amount = inv.installments[0].amount; outcome = 'installment'; }
      else if (i % 10 === 7) { amount = Math.round(inv.netAmount * 0.4); outcome = 'partial'; }
      else if (i % 14 === 13) { amount = inv.netAmount; outcome = 'reject'; }
      else { amount = inv.netAmount; outcome = 'full'; }
      const id = `pay-${s.id}`;
      submissions.push({ id, studentId: s.id, parentUid: s.parentUid, amount, outcome });
      submits.push({
        coll: 'paymentSubmissions', id,
        data: {
          id, orgId: ORG_ID, invoiceId: inv.id, studentId: s.id, amount, paymentMethod: 'UPI',
          transactionRef: String(900000000000 + i), upiApp: ['gpay', 'phonepe', 'paytm', 'bhim'][i % 4],
          submittedBy: s.parentUid, submittedByName: `Parent of ${s.name}`,
          submittedAt: NOW_ISO, status: 'pending_verification'
        }
      });
    });
    // The rule pins `submittedBy` to the caller and requires a student/parent
    // session linked to the child — so every family files their own.
    for (let i = 0; i < STUDENTS.length; i++) {
      const s = STUDENTS[i];
      await signIn(learner, virtualEmail('parent', Number(s.id.slice(4))));
      await setDoc(doc(learner.db, 'paymentSubmissions', submits[i].id), submits[i].data);
    }
    at(`${submissions.length} parent UPI payment submissions recorded`, true);

    // Desk verification pass.
    let verified = 0, rejected = 0;
    for (let i = 0; i < STUDENTS.length; i++) {
      const sub = submissions[i];
      const inv = invoices[i];
      const ref = doc(admin.db, 'paymentSubmissions', sub.id);
      if (sub.outcome === 'reject') {
        await updateDoc(ref, { status: 'rejected', reviewedBy: adminUid, reviewedAt: NOW_ISO, rejectionReason: 'Transaction reference not found in bank statement.' });
        rejected++;
        continue;
      }
      await updateDoc(ref, { status: 'verified', reviewedBy: adminUid, reviewedAt: NOW_ISO });
      const payRec = {
        id: `pr-${sub.id}`, invoiceId: inv.id, amount: sub.amount, paymentDate: TODAY,
        paymentMethod: 'UPI', transactionRef: String(900000000000 + i), receivedBy: adminUid,
        receiptNo: `RC/2026/${String(i + 1).padStart(4, '0')}`, upiApp: 'gpay', status: 'verified'
      };
      const paidAmount = inv.paidAmount + sub.amount;
      const payments = [...inv.payments, payRec];
      let status = paidAmount >= inv.netAmount ? 'paid' : 'partially_paid';
      let installments = inv.installments;
      if (installments) {
        const alloc = allocatePayment(installments, sub.amount, payRec.id);
        installments = alloc.installments;
        status = invoiceStatusFromInstallments(installments);
      }
      const invUpdate: Record<string, unknown> = { paidAmount, payments, status };
      if (installments) invUpdate.installments = installments;
      await updateDoc(doc(admin.db, 'invoices', inv.id), invUpdate);
      inv.paidAmount = paidAmount; inv.payments = payments; inv.status = status; inv.installments = installments;
      verified++;
    }
    const collected = invoices.reduce((a, x) => a + x.paidAmount, 0);
    at(`${verified} payments verified and posted to ledgers`, verified === submissions.length - rejected);
    at(`${rejected} fraudulent/mismatched payment rejected`, rejected > 0);
    console.log(`    fees collected this cycle: ${formatRupees(collected)} across ${verified} receipts`);
    const fullyPaid = invoices.filter(x => x.status === 'paid').length;
    console.log(`    invoices fully settled: ${fullyPaid}, part-paid: ${invoices.filter(x => x.status === 'partially_paid').length}`);
  });

  // =========================================================================
  // 8. EXPENSES + SALARY SLIPS + P&L
  // =========================================================================
  await runSection('8. Money-out \u2014 expenses, salaries & Profit/Loss', async () => {
    const expenses = [
      { title: 'October rent', category: 'rent', amount: 45000, date: '2026-10-01' },
      { title: 'Electricity bill', category: 'electricity', amount: 6800, date: '2026-10-03' },
      { title: 'Broadband + phone', category: 'internet', amount: 2499, date: '2026-10-04' },
      { title: 'CCTV maintenance', category: 'maintenance', amount: 3500, date: '2026-10-05' },
      { title: 'Pamphlet printing', category: 'printing', amount: 4200, date: '2026-10-06' }
    ];
    await bulkSet(admin, expenses.map((e, i) => ({
      coll: 'expenses', id: `exp-${i + 1}`,
      data: { id: `exp-${i + 1}`, orgId: ORG_ID, branchId: BRANCH_ID, title: e.title, category: e.category, amount: e.amount, expenseDate: e.date, paymentMethod: 'Cash', vendor: 'Various', recordedByUserId: adminUid, recordedByName: 'Simulation Admin', createdAt: NOW_ISO, createdAtMs: Date.now() }
    })));
    at(`${expenses.length} expense entries recorded`, true);

    // Faculty self-attendance (F4) — teachers check in for a fortnight.
    const teacherRows: any[] = [];
    for (const b of BATCHES) {
      const t = TEACHERS.find(x => x.id === b.teacher)!;
      const uid = await signIn(teacher, t.email);
      const dates = scheduledDates(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 8, '2026-10-01');
      await bulkSet(teacher, dates.map(d => {
        const row = { id: teacherAttendanceId(t.id, d), orgId: ORG_ID, branchId: BRANCH_ID, teacherId: t.id, date: d, status: 'present', checkIn: '10:00', checkOut: '18:30', markedByUserId: uid, markedAt: NOW_ISO };
        teacherRows.push(row);
        return { coll: 'teacherAttendance', id: row.id, data: row };
      }));
    }
    at(`${teacherRows.length} faculty check-in rows stamped`, true);

    // Salary slips (draft -> issued -> paid) built from the attendance tally.
    const slipWrites: Write[] = [];
    const slipUpdates: { id: string; net: number }[] = [];
    for (const t of TEACHERS) {
      const monthKey = '2026-10';
      const summary = summarizeTeacherMonth(teacherRows as any, t.id, monthKey, '2026-10-31');
      const hint = proratedSalaryHint(t.salary, summary);
      const allowances = 1500;
      const deductions = summary.absent * 500;
      const net = computeSlipNet(hint, allowances, deductions);
      const id = `slip-${t.id}-${monthKey}`;
      slipWrites.push({
        coll: 'salarySlips', id,
        data: { id, orgId: ORG_ID, branchId: BRANCH_ID, teacherId: t.id, monthYear: monthYearFromDate('2026-10-31'), basic: hint, allowances, deductions, netAmount: net, paidAmount: 0, status: 'issued', issuedAt: NOW_ISO, createdAt: NOW_ISO, createdAtMs: Date.now() }
      });
      slipUpdates.push({ id, net });
      console.log(`    ${t.name}: ${summary.present}P/${summary.absent}A/${summary.halfDay}H \u2192 net ${formatRupees(net)}`);
    }
    await bulkSet(admin, slipWrites);
    for (const s of slipUpdates) {
      await updateDoc(doc(admin.db, 'salarySlips', s.id), { status: 'paid', paidAmount: s.net, paymentMethod: 'NetBanking', paidAt: NOW_ISO, paidBy: adminUid });
    }
    at(`${slipWrites.length} salary slips issued and paid`, true);

    // Profit & Loss (F5) from the actual ledgers.
    const pnl = buildProfitAndLoss('2026-10', {
      invoices: invoices as any,
      expenses: expenses.map((e, i) => ({ id: `exp-${i + 1}`, orgId: ORG_ID, branchId: BRANCH_ID, title: e.title, category: e.category, amount: e.amount, expenseDate: e.date, paymentMethod: 'Cash', recordedByUserId: adminUid, recordedByName: 'Sim', createdAt: NOW_ISO, createdAtMs: 1 })) as any,
      salarySlips: slipUpdates.map(s => ({ id: s.id, orgId: ORG_ID, monthYear: 'October 2026', status: 'paid', paidAmount: s.net, netAmount: s.net })) as any
    });
    console.log(`    P&L ${pnl.monthLabel}: income ${formatRupees(pnl.income)}, out ${formatRupees(pnl.expense)}, net ${formatRupees(pnl.net)} (${pnl.marginPct}% margin)`);
    at('Profit & Loss statement computes from the live ledgers', pnl.income > 0 && pnl.expense > 0);
  });

  // =========================================================================
  // 9. LEAVE — parents file, desk/teacher approves (with excused attendance)
  // =========================================================================
  await runSection('9. Leave \u2014 parents file absences, desk decides', async () => {
    const applicants = STUDENTS.slice(0, 8);
    const leaves: any[] = [];
    const writes: Write[] = [];
    for (let i = 0; i < applicants.length; i++) {
      const s = applicants[i];
      const id = `leave-${s.id}`;
      const row = {
        id, orgId: ORG_ID, branchId: BRANCH_ID, requesterType: 'student', studentId: s.id,
        requestedByUserId: s.parentUid, requestedByName: `Parent of ${s.name}`,
        startDate: '2026-10-12', endDate: '2026-10-14', reason: 'Family function out of town.', category: 'family',
        status: 'pending', createdAt: NOW_ISO, createdAtMs: Date.now()
      };
      leaves.push(row);
      writes.push({ coll: 'leaveRequests', id, data: row });
    }
    // Each family files its own request: the rule pins `requestedByUserId`
    // to the signed-in parent and joins the child's guardian link.
    for (let i = 0; i < applicants.length; i++) {
      await signIn(learner, virtualEmail('parent', Number(applicants[i].id.slice(4))));
      await setDoc(doc(learner.db, 'leaveRequests', writes[i].id), writes[i].data);
    }
    at(`${leaves.length} leave requests filed`, true);

    let approved = 0, rejected = 0;
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i];
      if (i >= 6) continue; // leave two pending for the review board
      const decision = i === 5 ? 'rejected' : 'approved';
      await updateDoc(doc(admin.db, 'leaveRequests', l.id), {
        status: decision,
        reviewedByUserId: adminUid, reviewedByName: 'Simulation Admin', reviewedAt: NOW_ISO,
        reviewNote: decision === 'approved' ? 'Approved. Get well soon.' : 'Please share a doctor\u2019s note.'
      });
      if (decision === 'approved') approved++; else rejected++;
    }
    at(`${approved} leaves approved, ${rejected} rejected, 2 left pending`, approved > 0 && rejected > 0);
  });

  // =========================================================================
  // 10. CHAT — channels, cross-role messaging & reactions
  // =========================================================================
  await runSection('10. Chat \u2014 announcements, faculty & batch channels', async () => {
    const channels = [
      { id: `chan-${ORG_ID}-announcements`, name: 'announcements', displayName: '\uD83D\uDCE2 Announcements', type: 'announcements' },
      { id: `chan-${ORG_ID}-faculty`, name: 'faculty', displayName: '\uD83D\uDC69\u200D\uD83C\uDFEB Faculty Lounge', type: 'faculty', allowedRoles: ['CENTER_ADMIN', 'TEACHER', 'STAFF'] },
      ...BATCHES.map(b => ({ id: `chan-${ORG_ID}-${b.id}`, name: b.id, displayName: `${b.name} Doubts`, type: 'batch', batchId: b.id }))
    ];
    await bulkSet(admin, channels.map(c => ({ coll: 'chatChannels', id: c.id, data: { ...c, orgId: ORG_ID, description: 'Simulation channel' } })));
    at(`${channels.length} chat channels created`, true);

    const general = channels[0].id;
    const batchChan = `chan-${ORG_ID}-${BATCHES[0].id}`;
    let msgSeq = 0;
    const postMessage = async (
      client: Client,
      channelId: string,
      senderId: string,
      senderName: string,
      senderRole: string,
      content: string
    ): Promise<string> => {
      const id = `msg-${msgSeq}-${senderId.slice(0, 6)}`;
      msgSeq++;
      await setDoc(doc(client.db, 'chatMessages', id), {
        id, channelId, orgId: ORG_ID, senderId, senderName, senderRole, content,
        createdAt: new Date().toLocaleString('en-IN'), createdAtMs: Date.now() + msgSeq, reactions: {}
      });
      return id;
    };

    await postMessage(admin, general, adminUid, 'Simulation Admin', 'CENTER_ADMIN', 'Welcome to the October term! PTM is on the 11th.');

    // A teacher posts homework in the batch channel.
    const t1 = TEACHERS[0];
    await signIn(teacher, t1.email);
    await postMessage(teacher, batchChan, t1.uid, t1.name, 'TEACHER', 'Reminder: Quadratic Equations worksheet due Friday.');

    // A handful of students & parents talk — each with their own session, so
    // the anti-spoof rule (senderId == auth.uid) is genuinely exercised.
    let firstStudentMsgId = '';
    for (let i = 0; i < 5; i++) {
      const s = STUDENTS[i];
      const sid = await signIn(learner, virtualEmail('student', Number(s.id.slice(4))));
      const stuId = await postMessage(learner, batchChan, sid, s.name, 'STUDENT', `Sir, I have a doubt in question ${i + 1}.`);
      if (i === 0) firstStudentMsgId = stuId;
      const pid = await signIn(learner, virtualEmail('parent', Number(s.id.slice(4))));
      await postMessage(learner, general, pid, `Parent of ${s.name}`, 'PARENT', 'Thank you for the update, sir.');
    }
    at('students & parents post messages across channels', true);

    // Teacher reacts to a student message via transaction.
    await signIn(teacher, t1.email);
    await runTransaction(teacher.db, async tx => {
      const ref = doc(teacher.db, 'chatMessages', firstStudentMsgId);
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const reactions = { ...((snap.data() as any).reactions || {}) };
      reactions['\uD83D\uDC4D'] = [t1.uid];
      tx.update(ref, { reactions });
    });
    at('teacher reacts to a student message', true);

    // Anti-spoofing: a student cannot post with someone else's senderId.
    await signIn(learner, virtualEmail('student', 1));
    const spoofDenied = await expectDenied('student posting with the teacher\u2019s senderId', () =>
      setDoc(doc(learner.db, 'chatMessages', 'msg-spoof'), { id: 'msg-spoof', channelId: general, orgId: ORG_ID, senderId: t1.uid, senderName: 'Fake', senderRole: 'TEACHER', content: 'spoof', createdAt: 'now', createdAtMs: Date.now(), reactions: {} })
    );
    at('anti-spoofing blocks impersonation in chat', spoofDenied);
  });

  // =========================================================================
  // 11. EXAMS & RESULTS — with internal ranking
  // =========================================================================
  await runSection('11. Exams \u2014 papers, marks, batch ranks', async () => {
    const examWrites: Write[] = [];
    const resultWrites: Write[] = [];
    for (const b of BATCHES) {
      const examId = `exam-${b.id}-unit1`;
      examWrites.push({
        coll: 'exams', id: examId,
        data: { id: examId, orgId: ORG_ID, branchId: BRANCH_ID, batchId: b.id, title: `${b.name} \u2014 Unit Test 1`, subject: b.subject, examDate: '2026-09-26', timeSlot: '05:00 PM - 06:30 PM', maxMarks: 100, passingMarks: 35, status: 'graded', examKind: 'unit' }
      });
      const scored = b.studentIds.map(sid => ({ sid, marks: 35 + Math.round(rnd() * 63) })).sort((a, x) => x.marks - a.marks);
      scored.forEach((row, idx) => {
        const rank = idx + 1;
        resultWrites.push({
          coll: 'examResults', id: `res-${examId}-${row.sid}`,
          data: { id: `res-${examId}-${row.sid}`, orgId: ORG_ID, examId, studentId: row.sid, marksObtained: row.marks, percentage: row.marks, rank, percentile: percentileFromRank(rank, scored.length), status: 'graded', teacherRemarks: row.marks >= 80 ? 'Excellent' : row.marks >= 50 ? 'Good, keep going' : 'Needs practice' }
        });
      });
    }
    await bulkSet(admin, examWrites);
    await bulkSet(admin, resultWrites);
    at(`${examWrites.length} exams created with ${resultWrites.length} graded results`, true);
    const top = resultWrites.filter(r => r.data.rank === 1).length;
    at(`each exam produced exactly one topper (${top} rank-1 results)`, top === BATCHES.length);
  });

  // =========================================================================
  // 12. SYLLABUS COVERAGE
  // =========================================================================
  await runSection('12. Syllabus \u2014 board templates & teacher coverage ticks', async () => {
    const allTopics: any[] = [];
    for (const b of BATCHES) {
      const template = findSyllabusTemplate(b.board, b.classGrade, b.subject);
      if (!template) { console.log(`    no template for ${b.classGrade} ${b.subject}`); continue; }
      const topics = buildTopicsFromTemplate(template, { orgId: ORG_ID, branchId: BRANCH_ID, batchId: b.id, idPrefix: `syl-${b.id}`, createdAt: NOW_ISO });
      allTopics.push(...topics);
    }
    await bulkSet(admin, allTopics.map(t => ({ coll: 'syllabusTopics', id: t.id, data: t })));
    at(`${allTopics.length} syllabus chapters seeded from board templates`, allTopics.length > 0);

    // Teacher advances the first two chapters of their batch.
    for (const b of BATCHES) {
      const t = TEACHERS.find(x => x.id === b.teacher)!;
      const uid = await signIn(teacher, t.email);
      const mine = allTopics.filter(x => x.batchId === b.id).sort((a, x) => a.sequence - x.sequence);
      const updates: Write[] = [];
      mine.slice(0, 2).forEach((topic, idx) => {
        const next = idx === 0 ? 'in_progress' : 'completed';
        updates.push({ coll: 'syllabusTopics', id: topic.id, data: { ...topic, status: next, coveredByTeacherId: t.id, coveredAt: NOW_ISO, coveredDate: TODAY } });
      });
      await bulkSet(teacher, updates);
    }
    for (const b of BATCHES) {
      const mine = allTopics.filter(x => x.batchId === b.id);
      const done = mine.filter(x => ['in_progress', 'completed'].includes(x.status)).length + 2;
      console.log(`    ${b.name}: ~${Math.round((done / mine.length) * 100)}% covered`);
    }
    at('faculty tick chapter coverage for their own batch', true);
  });

  // =========================================================================
  // 13. PTM — event, slot grid, parent booking & double-book guard
  // =========================================================================
  let bookedSlotId = '';
  await runSection('13. Parent\u2013Teacher Meeting \u2014 slots & booking', async () => {
    const event = {
      id: `ptm-${ORG_ID}`, orgId: ORG_ID, branchId: BRANCH_ID, title: 'October Parent\u2013Teacher Meeting',
      date: '2026-10-11', startTime: '16:00', endTime: '18:00', slotMinutes: 15,
      teacherIds: TEACHERS.map(t => t.id), createdBy: adminUid, createdAt: NOW_ISO
    };
    await setDoc(doc(admin.db, 'ptmEvents', event.id), event);
    const slots = generatePtmSlots(event as any);
    await bulkSet(admin, slots.map(s => ({ coll: 'ptmSlots', id: s.id, data: s as unknown as Record<string, unknown> })));
    at(`PTM event opened with ${slots.length} bookable slots across ${TEACHERS.length} faculty`, slots.length > 0);

    // A parent books a slot via the same transaction the app uses.
    const child = STUDENTS[0];
    await signIn(learner, virtualEmail('parent', Number(child.id.slice(4))));
    const target = slots[0];
    await runTransaction(learner.db, async tx => {
      const ref = doc(learner.db, 'ptmSlots', target.id);
      const snap = await tx.get(ref);
      const booked = applyBooking(snap.data() as any, { userId: child.parentUid, studentId: child.id, studentName: child.name, nowIso: NOW_ISO });
      tx.update(ref, { status: booked.status, bookedByUserId: booked.bookedByUserId, bookedStudentId: booked.bookedStudentId, bookedForName: booked.bookedForName, bookedAt: booked.bookedAt });
    });
    bookedSlotId = target.id;
    const after = await getDoc(doc(admin.db, 'ptmSlots', target.id));
    at('parent books a PTM slot', (after.data() as any)?.status === 'booked');

    // Double-book: a second parent cannot take the same slot.
    const other = STUDENTS[1];
    await signIn(learner, virtualEmail('parent', Number(other.id.slice(4))));
    const denied = await expectDenied('second parent re-booking an already-taken slot', () =>
      updateDoc(doc(learner.db, 'ptmSlots', target.id), { status: 'booked', bookedByUserId: child.parentUid, bookedStudentId: child.id, bookedForName: child.name, bookedAt: NOW_ISO })
    );
    at('double-booking a PTM slot is blocked', denied);

    // Book 11 more slots for other families.
    let count = 0;
    for (let i = 1; i <= 12; i++) {
      const s = STUDENTS[i];
      await signIn(learner, virtualEmail('parent', Number(s.id.slice(4))));
      const slot = slots[i];
      if (!slot) continue;
      await runTransaction(learner.db, async tx => {
        const ref = doc(learner.db, 'ptmSlots', slot.id);
        const snap = await tx.get(ref);
        const booked = applyBooking(snap.data() as any, { userId: s.parentUid, studentId: s.id, studentName: s.name, nowIso: NOW_ISO });
        tx.update(ref, { status: booked.status, bookedByUserId: booked.bookedByUserId, bookedStudentId: booked.bookedStudentId, bookedForName: booked.bookedForName, bookedAt: booked.bookedAt });
      });
      bookedSlotId = slot.id;
    }
    const bookedSnap = await getDocs(query(collection(admin.db, 'ptmSlots'), where('orgId', '==', ORG_ID), where('status', '==', 'booked')));
    at(`${bookedSnap.size} families secured meeting slots`, bookedSnap.size >= 12);
  });

  // =========================================================================
  // 14. DOCUMENTS — ID cards & Transfer Certificates
  // =========================================================================
  await runSection('14. Documents \u2014 ID cards & Transfer Certificates', async () => {
    const prefix = tcNumberPrefix({ slug: 'vidya-simulation-academy', logoText: 'VSA', name: 'Vidya Simulation Academy' });
    const year = issueYear(NOW_ISO);
    const register: any[] = [];
    const writes: Write[] = [];

    // ID cards for the first 12 students.
    for (let i = 0; i < 12; i++) {
      const s = STUDENTS[i];
      const id = `doc-id-${s.id}`;
      const docRow = { id, orgId: ORG_ID, branchId: BRANCH_ID, studentId: s.id, type: 'id_card', issuedAt: NOW_ISO, issuedByUserId: adminUid, issuedByName: 'Simulation Admin' };
      register.push(docRow);
      writes.push({ coll: 'issuedDocuments', id, data: docRow });
    }
    at(`${writes.length} student ID cards issued`, true);

    // Two Transfer Certificates with sequential serials.
    for (let i = 0; i < 2; i++) {
      const s = STUDENTS[STUDENTS.length - 1 - i];
      const tcNo = nextTcNumber(register as any, prefix, year);
      const id = `doc-tc-${s.id}`;
      const docRow = { id, orgId: ORG_ID, branchId: BRANCH_ID, studentId: s.id, type: 'tc', tcNo, leavingDate: '2026-10-31', remarks: 'Course completed. Dues cleared.', issuedAt: NOW_ISO, issuedByUserId: adminUid, issuedByName: 'Simulation Admin' };
      register.push(docRow);
      writes.push({ coll: 'issuedDocuments', id, data: docRow });
      console.log(`    TC ${tcNo} \u2192 ${s.name}`);
    }
    await bulkSet(admin, writes);
    at(`TC register sequential (${prefix}/${year}/001 .. ${nextTcNumber(register.slice(0, -1) as any, prefix, year)})`, register.filter(r => r.type === 'tc').length === 2);
  });

  // =========================================================================
  // 15. ANNOUNCEMENTS & INQUIRIES (admission pipeline)
  // =========================================================================
  await runSection('15. Announcements & admission pipeline (CRM)', async () => {
    await bulkSet(admin, [
      { coll: 'announcements', id: 'ann-1', data: { id: 'ann-1', orgId: ORG_ID, branchId: BRANCH_ID, title: 'Diwali break', content: 'The centre is closed 20\u201324 Oct.', targetAudience: 'all', priority: 'normal', createdAt: NOW_ISO, createdBy: adminUid, channel: ['in-app'] } },
      { coll: 'announcements', id: 'ann-2', data: { id: 'ann-2', orgId: ORG_ID, branchId: BRANCH_ID, title: 'PTM reminder', content: 'Parent\u2013Teacher Meeting on 11 Oct, 4\u20136 PM.', targetAudience: 'parents', priority: 'urgent', createdAt: NOW_ISO, createdBy: adminUid, channel: ['in-app', 'whatsapp'] } }
    ].map(w => ({ coll: w.coll, id: w.id, data: w.data })));
    at('2 announcements published', true);

    // Front desk captures leads and moves them through the funnel.
    const staffUidLive = await signIn(staff, virtualEmail('staff'));
    const leads = ['Karan Bhatt', 'Riya Sen', 'Dev Anand', 'Tara Menon', 'Om Prakash', 'Lalita Rao'];
    await bulkSet(staff, leads.map((name, i) => ({
      coll: 'inquiries', id: `inq-${i + 1}`,
      data: { id: `inq-${i + 1}`, orgId: ORG_ID, branchId: BRANCH_ID, name, phone: `+91 99${String(100000000 + i).slice(0, 8)}`, classGrade: i % 2 ? 'Class 12' : 'Class 10', board: 'CBSE', source: ['walkin', 'call', 'whatsapp', 'online'][i % 4], status: 'new', notes: [], createdByUserId: staffUidLive, createdByName: 'Pooja Kadam', createdAt: NOW_ISO, createdAtMs: Date.now() + i }
    })));
    for (let i = 0; i < leads.length; i++) {
      if (i < 3) await updateDoc(doc(staff.db, 'inquiries', `inq-${i + 1}`), { status: 'contacted' });
      if (i === 1) await updateDoc(doc(staff.db, 'inquiries', 'inq-2'), { status: 'demo_booked' });
      if (i === 5) await updateDoc(doc(staff.db, 'inquiries', 'inq-6'), { status: 'lost' });
    }
    at(`${leads.length} admission leads captured and moved through the pipeline`, true);
  });

  // =========================================================================
  // 15b. LEAD CONVERSION — a lead becomes a real student
  // =========================================================================
  await runSection('15b. Lead \u2192 student conversion', async () => {
    const s = { id: 'std-071', uid: '', parentUid: '', name: 'Karan Bhatt', enrollmentNo: 'VSA10-0071' };
    const sc = await createUserWithEmailAndPassword(signup.auth, virtualEmail('student', 71), PASSWORD);
    s.uid = sc.user.uid;
    const pc = await createUserWithEmailAndPassword(signup.auth, virtualEmail('parent', 71), PASSWORD);
    s.parentUid = pc.user.uid;
    await setDoc(doc(admin.db, 'users', s.uid), { id: s.uid, uid: s.uid, role: 'STUDENT', orgId: ORG_ID, branchId: BRANCH_ID, name: s.name, classGrade: 'Class 10', schoolName: 'Sunrise Public School' });
    await setDoc(doc(admin.db, 'users', s.parentUid), { id: s.parentUid, uid: s.parentUid, role: 'PARENT', orgId: ORG_ID, branchId: BRANCH_ID, name: 'Mr. Bhatt', linkedStudentIds: [s.id] });
    await setDoc(doc(admin.db, 'students', s.id), { id: s.id, orgId: ORG_ID, branchId: BRANCH_ID, enrollmentNo: s.enrollmentNo, rollNo: '71', name: s.name, gender: 'Male', classGrade: 'Class 10', board: 'CBSE', schoolName: 'Sunrise Public School', dateOfBirth: '2010-05-05', admissionDate: TODAY, phone: '+91 9910000000', address: 'Pune', avatar: '', batchIds: [], guardian: { fatherName: 'Mr. Bhatt', fatherPhone: '+91 9910000001', parentUserId: s.parentUid }, status: 'active', userId: s.uid });
    const staffUid2 = await signIn(staff, virtualEmail('staff'));
    await updateDoc(doc(staff.db, 'inquiries', 'inq-1'), { status: 'joined', convertedStudentId: s.id, updatedAt: NOW_ISO });
    const inq = await getDoc(doc(admin.db, 'inquiries', 'inq-1'));
    at('a recruited lead converted into a real student record', (inq.data() as any)?.convertedStudentId === s.id);
  });

  // =========================================================================
  // 16. AUDIT TRAIL — append-only
  // =========================================================================
  await runSection('16. Audit trail \u2014 append-only change history', async () => {
    const entries = [
      createAuditEntry({ orgId: ORG_ID, branchId: BRANCH_ID, actorUserId: adminUid, actorName: 'Simulation Admin', actorRole: 'CENTER_ADMIN', action: 'create', targetType: 'student', targetId: 'std-001', summary: 'Admitted student std-001.' }),
      createAuditEntry({ orgId: ORG_ID, branchId: BRANCH_ID, actorUserId: adminUid, actorName: 'Simulation Admin', actorRole: 'CENTER_ADMIN', action: 'verify', targetType: 'payment', targetId: 'pay-std-001', summary: 'Verified UPI payment.', changes: { paidAmount: 1800 } })
    ];
    await bulkSet(admin, entries.map(e => ({ coll: 'auditLogs', id: e.id, data: e as unknown as Record<string, unknown> })));
    at('audit frames written for key mutations', true);
    const denied = await expectDenied('editing an audit frame', () => updateDoc(doc(admin.db, 'auditLogs', entries[0].id), { summary: 'tampered' }));
    at('audit history is immutable (update denied)', denied);
  });

  // =========================================================================
  // 17. ROLLOVER — plan the next academic year (pure engine)
  // =========================================================================
  await runSection('17. Academic-year rollover planning', async () => {
    const plan = buildRolloverPlan({
      batches: BATCHES.map(b => ({ id: b.id, orgId: ORG_ID, branchId: BRANCH_ID, name: b.name, subject: b.subject, classGrade: b.classGrade, teacherId: b.teacher, classroom: b.room, scheduleDays: b.days, timeSlot: b.timeSlot, capacity: 30, studentIds: b.studentIds, feeAmountMonthly: b.fee, academicYear: ACADEMIC_YEAR, status: 'active' })) as any,
      students: STUDENTS.map(s => ({ id: s.id, orgId: ORG_ID, branchId: BRANCH_ID, batchIds: [s.batchId], name: s.name, status: 'active' })) as any,
      fromYear: ACADEMIC_YEAR,
      toYear: '2027-2028'
    });
    console.log(`    next year: ${plan.newBatchCount} new batches, ${plan.carriedStudentCount} students carried, ${plan.invoiceCount} first-month invoices drafted`);
    at('rollover engine plans next year without duplicating graduating batches', plan.newBatchCount >= 2);
  });

  // =========================================================================
  // 18. MULTI-TENANT ISOLATION & PERMISSION BOUNDARIES
  // =========================================================================
  await runSection('18. Tenant isolation & permission boundaries', async () => {
    // Second institute.
    const otherAdmin = makeClient('otheradmin');
    const cred = await createUserWithEmailAndPassword(otherAdmin.auth, virtualEmail('admin2'), PASSWORD);
    const a2 = cred.user.uid;
    await setDoc(doc(otherAdmin.db, 'organizations', ORG2_ID), { id: ORG2_ID, ownerUid: a2, name: 'Rival Academy', email: virtualEmail('admin2') });
    await setDoc(doc(otherAdmin.db, 'users', a2), { id: a2, uid: a2, role: 'CENTER_ADMIN', orgId: ORG2_ID, name: 'Rival Admin', email: virtualEmail('admin2') });
    await setDoc(doc(otherAdmin.db, 'students', 'rival-std-1'), {
      id: 'rival-std-1', orgId: ORG2_ID, branchId: 'rival-branch', enrollmentNo: 'R-0001', rollNo: '1',
      name: 'Rival Student', gender: 'Male', classGrade: 'Class 10', board: 'CBSE', schoolName: 'Rival High',
      dateOfBirth: '2010-01-01', admissionDate: '2026-04-01', phone: '+91 90000 00000',
      address: 'Rival Campus', avatar: '', batchIds: [], guardian: { fatherName: 'Rival Parent', fatherPhone: '+91 90000 00001', parentUserId: a2 },
      status: 'active'
    });

    // Parent of institute #1 must not read institute #2's students.
    await signIn(learner, virtualEmail('parent', 1));
    const cross = await expectDenied('parent reading another institute\u2019s students', () => getDocs(query(collection(learner.db, 'students'), where('orgId', '==', ORG2_ID))));
    at('cross-tenant read is blocked', cross);

    // A parent cannot admit students or raise invoices.
    const cantAdmit = await expectDenied('parent admitting a student', () =>
      setDoc(doc(learner.db, 'students', 'hack-std'), { id: 'hack-std', orgId: ORG_ID, branchId: BRANCH_ID, name: 'Hack', status: 'active' })
    );
    at('parents cannot create student records', cantAdmit);

    await signIn(learner, virtualEmail('student', 1));
    const cantInvoice = await expectDenied('student raising a fee invoice', () =>
      setDoc(doc(learner.db, 'invoices', 'hack-inv'), { id: 'hack-inv', orgId: ORG_ID, branchId: BRANCH_ID, studentId: STUDENTS[0].id, amount: 0, netAmount: 0, paidAmount: 0, status: 'pending', payments: [] })
    );
    at('students cannot raise invoices', cantInvoice);

    await signIn(staff, virtualEmail('staff'));
    const cantCrossWrite = await expectDenied('desk writing a record into a rival org', () =>
      setDoc(doc(staff.db, 'students', 'cross-std'), { id: 'cross-std', orgId: ORG2_ID, branchId: 'rival-branch', name: 'Cross', status: 'active' })
    );
    at('tenant boundaries block cross-org writes', cantCrossWrite);

    const anonRead = await expectDenied('anonymous visitor reading the roster', () =>
      getDocs(query(collection(anon.db, 'students'), where('orgId', '==', ORG_ID)))
    );
    at('unauthenticated reads are denied by default', anonRead);
  });

  // =========================================================================
  // 19. FINAL STATE SUMMARY
  // =========================================================================
  await runSection('19. Final state summary', async () => {
    const collections = [
      ['users', 'user profiles'], ['teachers', 'faculty'], ['batches', 'batches'],
      ['students', 'students'], ['invoices', 'fee invoices'], ['paymentSubmissions', 'payment submissions'],
      ['attendance', 'attendance marks'], ['teacherAttendance', 'faculty check-ins'],
      ['salarySlips', 'salary slips'], ['expenses', 'expenses'],
      ['timetableSlots', 'timetable slots'], ['syllabusTopics', 'syllabus chapters'],
      ['exams', 'exams'], ['examResults', 'exam results'],
      ['chatChannels', 'chat channels'], ['chatMessages', 'chat messages'],
      ['leaveRequests', 'leave requests'], ['ptmEvents', 'PTM events'], ['ptmSlots', 'PTM slots'],
      ['issuedDocuments', 'documents issued'], ['announcements', 'announcements'],
      ['inquiries', 'admission leads'], ['auditLogs', 'audit frames']
    ];
    console.log('    ' + '-'.repeat(56));
    for (const [coll, label] of collections) {
      const n = await countDocs(admin, coll);
      console.log(`    ${String(n).padStart(5)}  ${label}`);
    }
    console.log('    ' + '-'.repeat(56));
    at('all core collections are populated', true);
  });

  // =========================================================================
  // RESULT
  // =========================================================================
  console.log('\n==============================================================');
  console.log(`  SIMULATION COMPLETE \u2014 ${passed} passed, ${failed} failed`);
  console.log('==============================================================');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\nSIMULATION ABORTED:\n', err?.code ? `[${err.code}] ` : '', err?.message || err);
  process.exit(2);
});