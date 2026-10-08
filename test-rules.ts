/**
 * VidyaOS — Firestore rules verification (batch enrollment #2 + audit F1 + inquiries F2 + leaves F3 + staff ops F4)
 *
 * Runs against the Auth + Firestore EMULATORS using the production
 * `firestore.rules`. Verifies:
 *
 *   Batch enrollment (feature #2):
 *   1. A TEACHER may update ONLY `batchIds` on a student of their own org (the
 *      `student.batchIds` mirror that keeps enrollment in sync).
 *   2. A TEACHER may NOT change any other field — including pairing a
 *      `batchIds` change with another field — nor touch a student from a
 *      different coaching centre.
 *   3. The app's exact write path (a full-document `set()` where only
 *      `batchIds` differs) is allowed for a teacher.
 *   4. CENTER_ADMIN/STAFF keep full record-edit rights as before.
 *
 *   Audit log (F1):
 *   5. Staff/admin may write + read `auditLogs`; teachers cannot (read or
 *      write), an entry cannot claim another user as its actor, entries are
 *      immutable (no update/delete), and history is tenant-isolated.
 *
 *   Leave requests (F3):
 *   6. Filing is own-record only (student self / parent link / faculty self),
 *      staff file on anyone's behalf; requests are born pending, filers refine
 *      while pending, reviewers decide exactly once with their own attribution,
 *      deletion is desk-only, and the collection is tenant-isolated.
 *
 *   Staff ops (F4):
 *   7. `teacherAttendance` — one row per teacher per day; a faculty member may
 *      create/update only their OWN row (the join proves teachers/{id}.userId
 *      is the caller), identity fields are pinned, `markedByUserId` cannot be
 *      forged, and only the desk may clear a cell. `salarySlips` — every
 *      tenant member reads, only staff/admin write; slips are born
 *      draft/issued/paid, identity is pinned on update, and both collections
 *      are tenant-isolated.
 *
 *   Syllabus coverage (F7):
 *   8. `syllabusTopics` — every tenant member reads (students/parents render
 *      progress from it), only instructors/admins write: students and the
 *      front desk are denied, the status vocabulary is validated, the tenant
 *      is pinned on update, and both reads and writes are tenant-isolated.
 *
 *   PTM scheduler (F8):
 *   9. `ptmEvents` — desk-only windows (staff/admin), well-formed (a real
 *      date, clock window, valid slot length, and a non-empty teacher list),
 *      tenant-isolated. `ptmSlots` — the grid is born of desk generation and
 *      must cite a real event; every tenant member reads except faculty, who
 *      only see their OWN diary column (single-doc AND list queries must pin
 *      their teacherId); booking is a transaction-guarded field-lock: only an
 *      isLinkedToStudent claim flips 'available' → 'booked', only the owner
 *      releases it, a double-book is denied, and cross-org access is blocked.
 *
 * Run: npx firebase emulators:exec --only auth,firestore --project vidyut-2bcb6 "npx tsx test-rules.ts"
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
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  type Firestore
} from 'firebase/firestore';

const PROJECT_ID = 'vidyut-2bcb6';
const ORG_ID = `org-rules-${Date.now()}`;
const OTHER_ORG_ID = `org-rules-other-${Date.now()}`;
const PASSWORD = 'TestPass123!';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Returns the Firestore rules error code, or null if the call succeeded. */
async function expectDenied(label: string, fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    console.log(`  · ${label}: ALLOWED (unexpected)`);
    return false;
  } catch (err: any) {
    const code = err?.code || err?.message || String(err);
    console.log(`  · ${label}: DENIED (${code})`);
    return String(code).includes('permission-denied');
  }
}

interface Client {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

async function makeClient(label: string): Promise<Client> {
  const app = initializeApp(
    {
      projectId: PROJECT_ID,
      apiKey: 'fake-api-key-for-emulator',
      authDomain: `${PROJECT_ID}.firebaseapp.com`
    },
    `e2e-${label}-${Date.now()}`
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { app, auth, db };
}

async function main(): Promise<void> {
  console.log('==============================================');
  console.log('VidyaOS Batch-Enrollment Rules Tests');
  console.log(`org: ${ORG_ID} | other-org: ${OTHER_ORG_ID}`);
  console.log('==============================================');

  const admin = await makeClient('admin');
  const adminOther = await makeClient('admin-other');
  const teacher = await makeClient('teacher');
  const staff = await makeClient('staff');
  const student = await makeClient('student');

  const stamp = Date.now();

  // ---------------------------------------------------------------- bootstrap
  console.log('\nSuite 1: Bootstrap two centres and a faculty account');
  const adminCred = await createUserWithEmailAndPassword(
    admin.auth,
    `rules-admin-${stamp}@phone.vidyaos.in`,
    PASSWORD
  );
  const adminUid = adminCred.user.uid;
  await setDoc(doc(admin.db, 'organizations', ORG_ID), {
    id: ORG_ID,
    ownerUid: adminUid,
    name: 'Rules Org'
  });
  await setDoc(doc(admin.db, 'users', adminUid), {
    id: adminUid,
    uid: adminUid,
    role: 'CENTER_ADMIN',
    orgId: ORG_ID,
    name: 'Rules Admin',
    phone: '+91 9000000011'
  });
  check('admin provisioned own org + profile', true);

  const otherCred = await createUserWithEmailAndPassword(
    adminOther.auth,
    `rules-admin-other-${stamp}@phone.vidyaos.in`,
    PASSWORD
  );
  const otherUid = otherCred.user.uid;
  await setDoc(doc(adminOther.db, 'organizations', OTHER_ORG_ID), {
    id: OTHER_ORG_ID,
    ownerUid: otherUid,
    name: 'Other Rules Org'
  });
  await setDoc(doc(adminOther.db, 'users', otherUid), {
    id: otherUid,
    uid: otherUid,
    role: 'CENTER_ADMIN',
    orgId: OTHER_ORG_ID,
    name: 'Other Admin',
    phone: '+91 9000000044'
  });
  check('second centre provisioned', true);

  // Admin admits a student into ORG_ID and OTHER_ORG_ID gets one of its own.
  await setDoc(doc(admin.db, 'students', 'stud-rules-1'), {
    id: 'stud-rules-1',
    orgId: ORG_ID,
    name: 'Rules Student',
    classGrade: 'Class 10',
    phone: '+91 9000000022',
    batchIds: []
  });
  await setDoc(doc(adminOther.db, 'students', 'stud-rules-other'), {
    id: 'stud-rules-other',
    orgId: OTHER_ORG_ID,
    name: 'Other Student',
    classGrade: 'Class 11',
    phone: '+91 9000000055',
    batchIds: []
  });
  check('both centres admit a student', true);

  const teacherCred = await createUserWithEmailAndPassword(
    teacher.auth,
    `rules-teacher-${stamp}@phone.vidyaos.in`,
    PASSWORD
  );
  const teacherUid = teacherCred.user.uid;
  // The centre admin provisions the faculty account — a teacher cannot
  // self-register under the users rule, exactly like production.
  await setDoc(doc(admin.db, 'users', teacherUid), {
    id: teacherUid,
    uid: teacherUid,
    role: 'TEACHER',
    orgId: ORG_ID,
    name: 'Rules Teacher',
    phone: '+91 9000000033'
  });
  check('admin provisioned the faculty profile', true);

  const studentCred = await createUserWithEmailAndPassword(
    student.auth,
    `rules-student-user-${stamp}@phone.vidyaos.in`,
    PASSWORD
  );
  const studentUid = studentCred.user.uid;
  await setDoc(doc(admin.db, 'users', studentUid), {
    id: studentUid,
    uid: studentUid,
    role: 'STUDENT',
    orgId: ORG_ID,
    name: 'Rules Student User',
    phone: '+91 9000000066'
  });
  check('admin provisioned a student profile', true);

  // ---------------------------------------------------------------- the rules
  console.log('\nSuite 2: Faculty may move students between their own org\'s batches');
  const ownStudentRef = doc(teacher.db, 'students', 'stud-rules-1');

  await updateDoc(ownStudentRef, { batchIds: ['batch-rules-1'] });
  check('teacher can update student.batchIds (enrollment mirror)', true);

  const phoneDenied = await expectDenied('teacher changes phone', () =>
    updateDoc(ownStudentRef, { phone: '+91 9000000099' })
  );
  check('teacher cannot change fields beyond batchIds', phoneDenied);

  const combinedDenied = await expectDenied('teacher changes batchIds + phone together', () =>
    updateDoc(ownStudentRef, { batchIds: [], phone: '+91 9000000099' })
  );
  check('teacher cannot pair batchIds with any other field', combinedDenied);

  const otherOrgDenied = await expectDenied('teacher touches other-org student', () =>
    updateDoc(doc(teacher.db, 'students', 'stud-rules-other'), { batchIds: ['batch-x'] })
  );
  check('teacher cannot enroll a student from another centre', otherOrgDenied);

  console.log('\nSuite 3: App write path and admin rights');
  // The app writes the WHOLE student + batch docs via writeBatch. The student
  // set() replaces the full document; rules judge it by the changed keys, so
  // only the batchIds line must differ from what is already stored.
  await setDoc(ownStudentRef, {
    id: 'stud-rules-1',
    orgId: ORG_ID,
    name: 'Rules Student',
    classGrade: 'Class 10',
    phone: '+91 9000000022',
    batchIds: ['batch-rules-2']
  });
  check('full-document set with only batchIds changed is allowed (app write path)', true);

  await updateDoc(doc(admin.db, 'students', 'stud-rules-1'), {
    batchIds: ['batch-rules-3'],
    phone: '+91 9000000199',
    classGrade: 'Class 12'
  });
  check('center admin can still edit the full student record', true);

  // ---------------------------------------------------------------- audit log (F1)
  console.log('\nSuite 4: Audit log — append-only history, staff/admin visibility');
  const auditId = `audit-rules-${stamp}`;
  const auditRef = doc(admin.db, 'auditLogs', auditId);
  await setDoc(auditRef, {
    id: auditId,
    orgId: ORG_ID,
    branchId: 'branch-rules',
    actorUserId: adminUid,
    actorName: 'Rules Admin',
    actorRole: 'CENTER_ADMIN',
    action: 'create',
    targetType: 'student',
    targetId: 'stud-rules-1',
    summary: 'Admitted rules student.',
    createdAt: new Date().toISOString(),
    createdAtMs: Date.now()
  });
  check('center admin can write an audit entry', true);

  let adminRead = false;
  try {
    adminRead = (await getDoc(auditRef)).exists();
  } catch {
    adminRead = false;
  }
  check('center admin can read audit history', adminRead);

  const teacherCreateDenied = await expectDenied('teacher writes an audit entry', () =>
    setDoc(doc(teacher.db, 'auditLogs', `audit-teacher-${stamp}`), {
      id: `audit-teacher-${stamp}`,
      orgId: ORG_ID,
      actorUserId: teacherUid,
      actorName: 'Rules Teacher',
      actorRole: 'TEACHER',
      action: 'create',
      targetType: 'student',
      targetId: 'stud-rules-1',
      summary: 'Not permitted.',
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now()
    })
  );
  check('teacher cannot create audit entries (staff/admin only)', teacherCreateDenied);

  const teacherReadDenied = await expectDenied('teacher reads audit history', () =>
    getDoc(doc(teacher.db, 'auditLogs', auditId))
  );
  check('teacher cannot read audit history', teacherReadDenied);

  const spoofDenied = await expectDenied('actor spoofing is rejected', () =>
    setDoc(doc(teacher.db, 'auditLogs', `audit-spoof-${stamp}`), {
      id: `audit-spoof-${stamp}`,
      orgId: ORG_ID,
      actorUserId: adminUid,
      actorName: 'Rules Admin',
      actorRole: 'CENTER_ADMIN',
      action: 'create',
      targetType: 'student',
      targetId: 'stud-rules-1',
      summary: 'Spoofed attribution.',
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now()
    })
  );
  check('an entry cannot claim another user as its actor', spoofDenied);

  const updateDenied = await expectDenied('audit entry is edited', () =>
    updateDoc(auditRef, { summary: 'tampered' })
  );
  check('audit entries can never be updated', updateDenied);

  const deleteDenied = await expectDenied('audit entry is deleted', () =>
    deleteDoc(auditRef)
  );
  check('audit entries can never be deleted', deleteDenied);

  const crossOrgReadDenied = await expectDenied('other-centre admin reads foreign audit', () =>
    getDoc(doc(adminOther.db, 'auditLogs', auditId))
  );
  check('audit history is tenant-isolated', crossOrgReadDenied);

  // ---------------------------------------------------------------- inquiries (F2)
  console.log('\nSuite 5: Inquiry pipeline — staff/admin writes, teachers read-only, tenant-isolated');
  const inquiryDoc = (id: string, uid: string, name: string, extra: Record<string, unknown> = {}) => ({
    id,
    orgId: ORG_ID,
    branchId: 'branch-rules',
    name,
    phone: '+91 9000' + String(100000 + ((stamp + id.length) % 900000)),
    classGrade: 'Class 10',
    board: 'CBSE',
    status: 'new',
    notes: [],
    createdByUserId: uid,
    createdByName: name,
    createdAt: new Date().toISOString(),
    createdAtMs: Date.now(),
    ...extra
  });

  // Declared here so Suite 6 (leave reviews) can reuse the same desk account.
  let staffUid = '';

  let suite5Step = 'staff sign-in';
  try {
    const staffCred = await createUserWithEmailAndPassword(
      staff.auth,
      `rules-staff-${stamp}@phone.vidyaos.in`,
      PASSWORD
    );
    staffUid = staffCred.user.uid;

    suite5Step = 'provision staff profile';
    await setDoc(doc(admin.db, 'users', staffUid), {
      id: staffUid,
      uid: staffUid,
      role: 'STAFF',
      orgId: ORG_ID,
      name: 'Rules Staff',
      phone: '+91 9000000066'
    });
    check('staff profile provisioned', true);

    const inqId = `inq-rules-${stamp}`;
    const inqRef = doc(admin.db, 'inquiries', inqId);

    suite5Step = 'admin creates inquiry';
    await setDoc(inqRef, inquiryDoc(inqId, adminUid, 'Rules Admin'));
    check('center admin can create an inquiry', true);

    suite5Step = 'staff creates inquiry';
    const staffWriteDenied = await expectDenied('staff writes an inquiry', () =>
      setDoc(doc(staff.db, 'inquiries', `inq-staff-${stamp}`), inquiryDoc(`inq-staff-${stamp}`, staffUid, 'Rules Staff'))
    );
    check('center staff can create an inquiry (front desk function)', !staffWriteDenied);

    suite5Step = 'teacher reads inquiry';
    let teacherRead = false;
    try {
      teacherRead = (await getDoc(doc(teacher.db, 'inquiries', inqId))).exists();
    } catch {
      teacherRead = false;
    }
    check('teacher can read leads (tenant member view)', teacherRead);

    suite5Step = 'teacher creates inquiry';
    const teacherInquiryCreateDenied = await expectDenied('teacher creates an inquiry', () =>
      setDoc(doc(teacher.db, 'inquiries', `inq-teacher-${stamp}`), inquiryDoc(`inq-teacher-${stamp}`, teacherUid, 'Rules Teacher'))
    );
    check('teacher cannot create inquiries', teacherInquiryCreateDenied);

    suite5Step = 'teacher updates inquiry';
    const teacherUpdateDenied = await expectDenied('teacher moves a lead status', () =>
      updateDoc(doc(teacher.db, 'inquiries', inqId), { status: 'contacted' })
    );
    check('teacher cannot update inquiries (pipeline is staff/admin)', teacherUpdateDenied);

    suite5Step = 'teacher deletes inquiry';
    const teacherDeleteDenied = await expectDenied('teacher deletes an inquiry', () =>
      deleteDoc(doc(teacher.db, 'inquiries', inqId))
    );
    check('teacher cannot delete inquiries', teacherDeleteDenied);

    suite5Step = 'admin moves inquiry to demo_booked';
    await updateDoc(inqRef, { status: 'demo_booked', followUpDate: '2026-10-10', updatedAt: new Date().toISOString() });
    check('staff/admin can move a lead through the pipeline', true);

    suite5Step = 'staff marks inquiry lost';
    await updateDoc(doc(staff.db, 'inquiries', inqId), { status: 'lost' });
    check('staff can mark a lead lost (the Every-Day desk flow)', true);

    suite5Step = 'cross-org inquiry write';
    const crossOrgWriteDenied = await expectDenied('other-centre admin captures a lead into this org', () =>
      setDoc(doc(adminOther.db, 'inquiries', `inq-foreign-${stamp}`), inquiryDoc(`inq-foreign-${stamp}`, adminUid, 'Rules Admin'))
    );
    check('inquiries are tenant-isolated on write', crossOrgWriteDenied);

    suite5Step = 'cross-org inquiry read';
    const crossOrgReadDeniedInq = await expectDenied('other-centre admin reads foreign leads', () =>
      getDoc(doc(adminOther.db, 'inquiries', inqId))
    );
    check('inquiries are tenant-isolated on read', crossOrgReadDeniedInq);
  } catch (err) {
    console.error(`\nSuite 5 failed at step: "${suite5Step}"`);
    throw err;
  }

  // -------------------------------------------------------------- leaves (F3)
  console.log('\nSuite 6: Leave requests — own-record filing, pending-only decisions, tenant isolation');
  let suite6Step = 'provision learner + guardian accounts';
  try {
    const studentUser = await makeClient('student');
    const parentUser = await makeClient('parent');

    const studentCred = await createUserWithEmailAndPassword(
      studentUser.auth,
      `rules-student-${stamp}@phone.vidyaos.in`,
      PASSWORD
    );
    const studentUid = studentCred.user.uid;
    const parentCred = await createUserWithEmailAndPassword(
      parentUser.auth,
      `rules-parent-${stamp}@phone.vidyaos.in`,
      PASSWORD
    );
    const parentUid = parentCred.user.uid;

    // The centre admin links both accounts to the admitted student, and
    // provisions the faculty record the teacher's leave is filed against.
    await setDoc(doc(admin.db, 'users', studentUid), {
      id: studentUid,
      uid: studentUid,
      role: 'STUDENT',
      orgId: ORG_ID,
      name: 'Rules Student',
      phone: '+91 9000000077'
    });
    await setDoc(doc(admin.db, 'users', parentUid), {
      id: parentUid,
      uid: parentUid,
      role: 'PARENT',
      orgId: ORG_ID,
      name: 'Rules Parent',
      phone: '+91 9000000088'
    });
    await updateDoc(doc(admin.db, 'students', 'stud-rules-1'), {
      userId: studentUid,
      guardian: {
        fatherName: 'Rules Parent',
        fatherPhone: '+91 9000000088',
        parentUserId: parentUid
      }
    });
    await setDoc(doc(admin.db, 'teachers', 'teach-rules-1'), {
      id: 'teach-rules-1',
      orgId: ORG_ID,
      branchId: 'branch-rules',
      userId: teacherUid,
      name: 'Rules Teacher',
      phone: '+91 9000000033',
      email: 'rules-teacher@example.com',
      avatar: '',
      qualification: 'M.Sc',
      subjects: ['Mathematics'],
      assignedBatchIds: [],
      joiningDate: '2026-04-01',
      status: 'active'
    });
    // A second student of the SAME org nobody is linked to — the "file for
    // someone else" negative target.
    await setDoc(doc(admin.db, 'students', 'stud-rules-2'), {
      id: 'stud-rules-2',
      orgId: ORG_ID,
      name: 'Unlinked Student',
      classGrade: 'Class 9',
      phone: '+91 9000000091',
      batchIds: []
    });
    check('learner, guardian and faculty records linked by the admin', true);

    const leaveDoc = (id: string, uid: string, extra: Record<string, unknown> = {}) => ({
      id,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      requesterType: 'student',
      studentId: 'stud-rules-1',
      requestedByUserId: uid,
      requestedByName: 'Rules Student',
      startDate: '2026-11-02',
      endDate: '2026-11-03',
      reason: 'Fever since last night — doctor has advised rest.',
      category: 'sick',
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
      ...extra
    });

    suite6Step = 'student files own leave';
    const leaveAId = `leave-a-${stamp}`;
    const leaveARef = doc(studentUser.db, 'leaveRequests', leaveAId);
    await setDoc(leaveARef, leaveDoc(leaveAId, studentUid));
    check('a student may file leave for their own linked record', true);

    suite6Step = 'student files for another student';
    const crossStudentDenied = await expectDenied('student files leave for an unlinked student', () =>
      setDoc(doc(studentUser.db, 'leaveRequests', `leave-x-${stamp}`),
        leaveDoc(`leave-x-${stamp}`, studentUid, { studentId: 'stud-rules-2' }))
    );
    check('a student cannot file leave for somebody else', crossStudentDenied);

    suite6Step = 'parent files linked child leave';
    const leaveBId = `leave-b-${stamp}`;
    const leaveBRef = doc(parentUser.db, 'leaveRequests', leaveBId);
    await setDoc(leaveBRef, leaveDoc(leaveBId, parentUid, { requestedByName: 'Rules Parent' }));
    check('a parent may file leave for their linked child', true);

    suite6Step = 'teacher files own leave';
    const leaveCId = `leave-c-${stamp}`;
    await setDoc(doc(teacher.db, 'leaveRequests', leaveCId),
      leaveDoc(leaveCId, teacherUid, {
        requesterType: 'teacher',
        teacherId: 'teach-rules-1',
        requestedByName: 'Rules Teacher'
      }));
    check('faculty may file their own leave', true);

    suite6Step = 'staff files on behalf';
    const leaveDId = `leave-d-${stamp}`;
    const leaveDRef = doc(staff.db, 'leaveRequests', leaveDId);
    await setDoc(leaveDRef, leaveDoc(leaveDId, staffUid, { studentId: 'stud-rules-2', requestedByName: 'Rules Staff' }));
    check('staff may file leave on a student\'s behalf (front desk)', true);

    suite6Step = 'born-approved create';
    const bornApprovedDenied = await expectDenied('a request is created already-approved', () =>
      setDoc(doc(studentUser.db, 'leaveRequests', `leave-bad-${stamp}`),
        leaveDoc(`leave-bad-${stamp}`, studentUid, { status: 'approved', reviewedByUserId: studentUid }))
    );
    check('a request can only be born pending', bornApprovedDenied);

    suite6Step = 'teacher reads register';
    let teacherLeaveRead = false;
    try {
      teacherLeaveRead = (await getDoc(leaveARef)).exists();
    } catch {
      teacherLeaveRead = false;
    }
    check('faculty can read the leave board (tenant member view)', teacherLeaveRead);

    suite6Step = 'student refines pending request';
    await updateDoc(leaveARef, {
      startDate: '2026-11-03',
      endDate: '2026-11-04',
      reason: 'Still down with fever — rest extended by the doctor.',
      updatedAt: new Date().toISOString()
    });
    check('the filer may refine their own request while it is pending', true);

    suite6Step = 'student self-approves';
    const selfApproveDenied = await expectDenied('student approves their own request', () =>
      updateDoc(leaveARef, {
        status: 'approved',
        reviewedByUserId: studentUid,
        reviewedAt: new Date().toISOString()
      })
    );
    check('a student cannot approve their own request', selfApproveDenied);

    suite6Step = 'teacher approves';
    // The decision must run signed in as the REVIEWER: `leaveARef` is bound to
    // the filer's client, and the rules require reviewedByUserId == auth.uid.
    await updateDoc(doc(teacher.db, 'leaveRequests', leaveAId), {
      status: 'approved',
      reviewedByUserId: teacherUid,
      reviewedByName: 'Rules Teacher',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    check('faculty may approve a pending request', true);

    suite6Step = 're-decide decided request';
    const reDecideDenied = await expectDenied('teacher flips an approved request to rejected', () =>
      updateDoc(doc(teacher.db, 'leaveRequests', leaveAId), {
        status: 'rejected',
        reviewedByUserId: teacherUid,
        reviewedAt: new Date().toISOString()
      })
    );
    check('a decided request cannot be re-decided', reDecideDenied);

    suite6Step = 'reviewer alters dates';
    const alterDatesDenied = await expectDenied('staff approves but rewrites the dates', () =>
      updateDoc(doc(staff.db, 'leaveRequests', leaveBId), {
        status: 'approved',
        reviewedByUserId: staffUid,
        reviewedAt: new Date().toISOString(),
        startDate: '2026-11-09'
      })
    );
    check('a reviewer cannot alter the dates they are deciding on', alterDatesDenied);

    suite6Step = 'reviewer attribution spoof';
    const reviewSpoofDenied = await expectDenied('staff attributes the approval to the admin', () =>
      updateDoc(doc(staff.db, 'leaveRequests', leaveBId), {
        status: 'approved',
        reviewedByUserId: adminUid,
        reviewedByName: 'Rules Admin',
        reviewedAt: new Date().toISOString()
      })
    );
    check('a decision cannot be attributed to somebody else', reviewSpoofDenied);

    suite6Step = 'staff approves cleanly';
    await updateDoc(doc(staff.db, 'leaveRequests', leaveBId), {
      status: 'approved',
      reviewedByUserId: staffUid,
      reviewedByName: 'Rules Staff',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    check('staff may approve a pending request with review fields only', true);

    suite6Step = 'student deletes request';
    const studentDeleteDenied = await expectDenied('student deletes a leave request', () =>
      deleteDoc(leaveARef)
    );
    check('students cannot delete leave requests', studentDeleteDenied);

    suite6Step = 'teacher deletes request';
    const teacherDeleteDenied = await expectDenied('teacher deletes a leave request', () =>
      deleteDoc(doc(teacher.db, 'leaveRequests', leaveCId))
    );
    check('faculty cannot delete leave requests', teacherDeleteDenied);

    suite6Step = 'admin deletes request';
    await deleteDoc(doc(admin.db, 'leaveRequests', leaveDId));
    check('the centre admin may remove a stale request', true);

    suite6Step = 'cross-org read';
    const crossOrgLeaveReadDenied = await expectDenied('other-centre admin reads foreign leave', () =>
      getDoc(doc(adminOther.db, 'leaveRequests', leaveAId))
    );
    check('leave register is tenant-isolated on read', crossOrgLeaveReadDenied);

    suite6Step = 'cross-org write';
    const crossOrgLeaveWriteDenied = await expectDenied('other-centre admin files into this org', () =>
      setDoc(doc(adminOther.db, 'leaveRequests', `leave-foreign-${stamp}`),
        leaveDoc(`leave-foreign-${stamp}`, otherUid))
    );
    check('leave register is tenant-isolated on write', crossOrgLeaveWriteDenied);
  } catch (err) {
    console.error(`\nSuite 6 failed at step: "${suite6Step}"`);
    throw err;
  }

  // ---------------------------------------------------------------- staff ops (F4)
  console.log('\nSuite 7: Staff ops — faculty self-attendance, desk-only salary slips');
  let suite7Step = 'provision a colleague faculty record';

  try {
    // `teach-rules-1` (linked to teacherUid) was provisioned in Suite 6. Add a
    // second faculty record linked to a DIFFERENT uid — the "touch somebody
    // else's row" negative target.
    await setDoc(doc(admin.db, 'teachers', 'teach-rules-2'), {
      id: 'teach-rules-2',
      orgId: ORG_ID,
      branchId: 'branch-rules',
      userId: `someone-else-${stamp}`,
      name: 'Colleague Faculty',
      phone: '+91 9000000066',
      email: 'colleague@example.com',
      avatar: '',
      qualification: 'B.Ed',
      subjects: ['Physics'],
      assignedBatchIds: [],
      joiningDate: '2026-04-01',
      status: 'active'
    });
    check('admin provisions a second faculty record (linked elsewhere)', true);

    const attDoc = (id: string, teacherId: string, uid: string, extra: Record<string, unknown> = {}) => ({
      id,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      teacherId,
      date: '2026-10-07',
      status: 'present',
      checkIn: '10:05',
      markedByUserId: uid,
      markedAt: '2026-10-07T04:35:00.000Z',
      ...extra
    });

    // --- faculty self-attendance ----------------------------------------------
    suite7Step = 'teacher stamps own row';
    const ownAttId = `tatt-teach-rules-1-${stamp}`;
    const ownAttRef = doc(teacher.db, 'teacherAttendance', ownAttId);
    await setDoc(ownAttRef, attDoc(ownAttId, 'teach-rules-1', teacherUid));
    check('faculty may stamp their own attendance row', true);

    suite7Step = 'teacher reads own row';
    const ownAttRead = await getDoc(ownAttRef);
    check('faculty can read the attendance register (tenant member)', ownAttRead.exists());

    suite7Step = 'teacher checks out (app full-overwrite path)';
    await setDoc(ownAttRef, attDoc(ownAttId, 'teach-rules-1', teacherUid, { checkOut: '13:30' }));
    check('faculty may update their own row (check-out overwrite)', true);

    suite7Step = 'teacher stamps colleague row';
    const colleagueAttDenied = await expectDenied("teacher stamps a colleague's attendance row", () =>
      setDoc(doc(teacher.db, 'teacherAttendance', `tatt-colleague-${stamp}`),
        attDoc(`tatt-colleague-${stamp}`, 'teach-rules-2', teacherUid))
    );
    check("faculty cannot write another teacher's row", colleagueAttDenied);

    suite7Step = 'admin stamps colleague row';
    const colleagueAttId = `tatt-colleague-${stamp}`;
    await setDoc(doc(admin.db, 'teacherAttendance', colleagueAttId),
      attDoc(colleagueAttId, 'teach-rules-2', adminUid));
    check('the desk may stamp any faculty row', true);

    suite7Step = 'teacher updates colleague row';
    const colleagueUpdateDenied = await expectDenied("teacher updates a colleague's row", () =>
      updateDoc(doc(teacher.db, 'teacherAttendance', colleagueAttId), { remarks: 'not mine' })
    );
    check("faculty cannot update another teacher's row", colleagueUpdateDenied);

    suite7Step = 'teacher spoofs markedByUserId';
    const spoofAttDenied = await expectDenied('teacher stamps a row attributed to the admin', () =>
      setDoc(doc(teacher.db, 'teacherAttendance', `tatt-spoof-${stamp}`),
        attDoc(`tatt-spoof-${stamp}`, 'teach-rules-1', adminUid))
    );
    check('faculty cannot forge the marking user', spoofAttDenied);

    suite7Step = 'teacher re-points own row date';
    const moveDateDenied = await expectDenied('teacher moves their row to another date', () =>
      updateDoc(ownAttRef, { date: '2026-10-08' })
    );
    check('the (teacher, day) identity is pinned on update', moveDateDenied);

    suite7Step = 'teacher re-attributes own row';
    const reattributeDenied = await expectDenied('teacher re-attributes their row to the admin', () =>
      updateDoc(ownAttRef, { markedByUserId: adminUid })
    );
    check('a faculty update cannot hand the row to somebody else', reattributeDenied);

    suite7Step = 'teacher deletes own row';
    const teacherAttDeleteDenied = await expectDenied('teacher deletes their own row', () =>
      deleteDoc(ownAttRef)
    );
    check('only the desk can clear an attendance cell', teacherAttDeleteDenied);

    suite7Step = 'staff stamps a row';
    const staffAttId = `tatt-staff-${stamp}`;
    const staffAttRef = doc(staff.db, 'teacherAttendance', staffAttId);
    await setDoc(staffAttRef, attDoc(staffAttId, 'teach-rules-1', staffUid, { status: 'half_day' }));
    check('front desk may stamp attendance on a teacher\'s behalf', true);

    suite7Step = 'staff corrects a row';
    await updateDoc(staffAttRef, { status: 'absent', remarks: 'Left early — half day corrected' });
    check('front desk may correct a row', true);

    suite7Step = 'staff clears a cell';
    await deleteDoc(staffAttRef);
    check('front desk may clear an attendance cell', true);

    // --- salary slips ----------------------------------------------------------
    suite7Step = 'teacher composes a slip';
    const teacherSlipDenied = await expectDenied('teacher creates a salary slip', () =>
      setDoc(doc(teacher.db, 'salarySlips', `slip-teacher-${stamp}`), {
        id: `slip-teacher-${stamp}`,
        orgId: ORG_ID,
        branchId: 'branch-rules',
        teacherId: 'teach-rules-1',
        monthYear: 'October 2026',
        basic: 30000,
        allowances: 0,
        deductions: 0,
        netAmount: 30000,
        paidAmount: 0,
        status: 'issued',
        issuedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now()
      })
    );
    check('faculty cannot create salary slips', teacherSlipDenied);

    suite7Step = 'admin composes an invalid slip';
    const badSlipDenied = await expectDenied('slip is created with an unknown status', () =>
      setDoc(doc(admin.db, 'salarySlips', `slip-bad-${stamp}`), {
        id: `slip-bad-${stamp}`,
        orgId: ORG_ID,
        branchId: 'branch-rules',
        teacherId: 'teach-rules-1',
        monthYear: 'October 2026',
        basic: 30000,
        allowances: 0,
        deductions: 0,
        netAmount: 30000,
        paidAmount: 0,
        status: 'pending_payment',
        issuedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now()
      })
    );
    check('slips can only be born draft / issued / paid', badSlipDenied);

    suite7Step = 'staff composes a draft slip';
    const slipId = `slip-rules-${stamp}`;
    const slipRef = doc(staff.db, 'salarySlips', slipId);
    await setDoc(slipRef, {
      id: slipId,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      teacherId: 'teach-rules-1',
      monthYear: 'October 2026',
      basic: 30000,
      allowances: 2000,
      deductions: 500,
      netAmount: 31500,
      paidAmount: 0,
      status: 'draft',
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now()
    });
    check('front desk may compose a draft salary slip', true);

    suite7Step = 'teacher reads the slip';
    let teacherSlipRead = false;
    try {
      teacherSlipRead = (await getDoc(doc(teacher.db, 'salarySlips', slipId))).exists();
    } catch {
      teacherSlipRead = false;
    }
    check('faculty can read their own salary slip (tenant member view)', teacherSlipRead);

    suite7Step = 'teacher updates the slip';
    const teacherSlipUpdateDenied = await expectDenied('teacher marks their own slip paid', () =>
      updateDoc(doc(teacher.db, 'salarySlips', slipId), {
        status: 'paid',
        paidAmount: 31500,
        paidAt: new Date().toISOString(),
        paidBy: teacherUid
      })
    );
    check('faculty cannot touch salary slips', teacherSlipUpdateDenied);

    suite7Step = 'teacher deletes the slip';
    const teacherSlipDeleteDenied = await expectDenied('teacher deletes a salary slip', () =>
      deleteDoc(doc(teacher.db, 'salarySlips', slipId))
    );
    check('faculty cannot delete salary slips', teacherSlipDeleteDenied);

    suite7Step = 'staff issues the draft';
    await updateDoc(slipRef, { status: 'issued', issuedAt: new Date().toISOString() });
    check('draft → issued is a valid desk transition', true);

    suite7Step = 'staff pays the slip';
    await updateDoc(slipRef, {
      status: 'paid',
      paidAmount: 31500,
      paymentMethod: 'UPI',
      paidAt: new Date().toISOString(),
      paidBy: staffUid
    });
    check('issued → paid records the settlement', true);

    suite7Step = 'staff rewrites slip identity';
    const slipIdentityDenied = await expectDenied('staff re-points a paid slip at another teacher', () =>
      updateDoc(slipRef, { teacherId: 'teach-rules-2' })
    );
    check('slip identity (teacher/month) is pinned on update', slipIdentityDenied);

    // --- tenant isolation ------------------------------------------------------
    suite7Step = 'cross-org attendance read';
    const crossOrgAttReadDenied = await expectDenied('other-centre admin reads foreign attendance', () =>
      getDoc(doc(adminOther.db, 'teacherAttendance', colleagueAttId))
    );
    check('attendance register is tenant-isolated on read', crossOrgAttReadDenied);

    suite7Step = 'cross-org slip write';
    const crossOrgSlipWriteDenied = await expectDenied('other-centre admin writes a foreign slip', () =>
      setDoc(doc(adminOther.db, 'salarySlips', `slip-foreign-${stamp}`), {
        id: `slip-foreign-${stamp}`,
        orgId: ORG_ID,
        branchId: 'branch-rules',
        teacherId: 'teach-rules-1',
        monthYear: 'October 2026',
        basic: 30000,
        allowances: 0,
        deductions: 0,
        netAmount: 30000,
        paidAmount: 0,
        status: 'issued',
        issuedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now()
      })
    );
    check('salary slips are tenant-isolated on write', crossOrgSlipWriteDenied);
  } catch (err) {
    console.error(`\nSuite 7 failed at step: "${suite7Step}"`);
    throw err;
  }

  // ------------------------------------------------------------------ expenses (F5)
  console.log('\nSuite 8: Expenses — desk-only money-out ledger, tenant-isolated');
  let suite8Step = 'provision an expense';

  try {
    const expenseDoc = (
      id: string,
      uid: string,
      extra: Record<string, unknown> = {}
    ) => ({
      id,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      title: 'Centre rent',
      category: 'rent',
      amount: 25000,
      expenseDate: '2026-10-01',
      paymentMethod: 'NetBanking',
      vendor: 'Rules Property LLP',
      recordedByUserId: uid,
      recordedByName: 'Rules Recorder',
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
      ...extra
    });

    // --- writes are desk-only --------------------------------------------------
    suite8Step = 'teacher records an expense';
    const teacherCreateDenied = await expectDenied('teacher creates an expense', () =>
      setDoc(doc(teacher.db, 'expenses', `exp-teacher-${stamp}`), expenseDoc(`exp-teacher-${stamp}`, teacherUid))
    );
    check('faculty cannot record money out', teacherCreateDenied);

    suite8Step = 'staff records an expense';
    const expenseId = `exp-rules-${stamp}`;
    const expenseRef = doc(staff.db, 'expenses', expenseId);
    await setDoc(expenseRef, expenseDoc(expenseId, staffUid));
    check('front desk may record an expense', true);

    suite8Step = 'teacher reads an expense';
    let teacherRead = false;
    try {
      teacherRead = (await getDoc(doc(teacher.db, 'expenses', expenseId))).exists();
    } catch {
      teacherRead = false;
    }
    check('faculty can read the ledger (tenant member view)', teacherRead);

    // --- create validation -----------------------------------------------------
    suite8Step = 'zero amount';
    const zeroDenied = await expectDenied('expense created with zero amount', () =>
      setDoc(doc(admin.db, 'expenses', `exp-zero-${stamp}`), expenseDoc(`exp-zero-${stamp}`, adminUid, { amount: 0 }))
    );
    check('a zero amount is rejected', zeroDenied);

    suite8Step = 'unknown category';
    const categoryDenied = await expectDenied('expense created with an unknown category', () =>
      setDoc(doc(admin.db, 'expenses', `exp-cat-${stamp}`), expenseDoc(`exp-cat-${stamp}`, adminUid, { category: 'gadgets' }))
    );
    check('categories are limited to the known list', categoryDenied);

    suite8Step = 'over-cap amount';
    const overCapDenied = await expectDenied('expense created above the sanity cap', () =>
      setDoc(doc(admin.db, 'expenses', `exp-big-${stamp}`), expenseDoc(`exp-big-${stamp}`, adminUid, { amount: 20000000 }))
    );
    check('an over-cap amount is rejected', overCapDenied);

    suite8Step = 'forged recorder';
    const forgedDenied = await expectDenied('staff records an expense attributed to someone else', () =>
      setDoc(doc(staff.db, 'expenses', `exp-forge-${stamp}`), expenseDoc(`exp-forge-${stamp}`, adminUid))
    );
    check('the recorder is pinned to the caller', forgedDenied);

    // --- updates are desk-only and identity-pinned ----------------------------
    suite8Step = 'teacher fixes an expense';
    const teacherUpdateDenied = await expectDenied('teacher edits an expense', () =>
      updateDoc(doc(teacher.db, 'expenses', expenseId), { title: 'not mine' })
    );
    check('faculty cannot edit the ledger', teacherUpdateDenied);

    suite8Step = 'staff fixes a typo';
    await updateDoc(expenseRef, { title: 'Centre rent (corrected)', amount: 26000 });
    check('front desk may correct an expense', true);

    suite8Step = 'staff re-points the recorder';
    const reattributeDenied = await expectDenied('staff re-attributes an expense to the admin', () =>
      updateDoc(expenseRef, { recordedByUserId: adminUid })
    );
    check('an expense cannot be handed to another recorder', reattributeDenied);

    suite8Step = 'staff moves the expense org';
    const moveOrgDenied = await expectDenied('staff moves an expense to another centre', () =>
      updateDoc(expenseRef, { orgId: OTHER_ORG_ID })
    );
    check('the tenant of an expense is pinned on update', moveOrgDenied);

    // --- deletes are desk-only -------------------------------------------------
    suite8Step = 'teacher deletes an expense';
    const teacherDeleteDenied = await expectDenied('teacher deletes an expense', () =>
      deleteDoc(doc(teacher.db, 'expenses', expenseId))
    );
    check('faculty cannot delete from the ledger', teacherDeleteDenied);

    suite8Step = 'staff deletes an expense';
    await deleteDoc(expenseRef);
    check('front desk may remove an expense', true);

    // --- tenant isolation ------------------------------------------------------
    suite8Step = 'cross-org expense write';
    const crossOrgWriteDenied = await expectDenied('other-centre admin writes a foreign expense', () =>
      setDoc(doc(adminOther.db, 'expenses', `exp-foreign-${stamp}`), {
        ...expenseDoc(`exp-foreign-${stamp}`, otherUid),
        orgId: ORG_ID
      })
    );
    check('expenses are tenant-isolated on write', crossOrgWriteDenied);

    suite8Step = 'cross-org expense read';
    const foreignId = `exp-foreign-read-${stamp}`;
    await setDoc(doc(admin.db, 'expenses', foreignId), expenseDoc(foreignId, adminUid));
    const crossOrgReadDenied = await expectDenied('other-centre admin reads a foreign expense', () =>
      getDoc(doc(adminOther.db, 'expenses', foreignId))
    );
    check('expenses are tenant-isolated on read', crossOrgReadDenied);
  } catch (err) {
    console.error(`\nSuite 8 failed at step: "${suite8Step}"`);
    throw err;
  }

  // ---------------------------------------------------------------- timetable (F6)
  console.log('\nSuite 9: Timetable — weekly schedule with an optional live class link');
  let suite9Step = 'setup';
  try {
    const slotDoc = (id: string, extra: Record<string, unknown> = {}) => ({
      id,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      batchId: 'batch-rules-1',
      dayOfWeek: 'Monday',
      startTime: '17:00',
      endTime: '18:30',
      classroom: 'Hall 1',
      teacherId: 'teach-rules',
      subject: 'Class 10 Mathematics',
      meetUrl: 'https://meet.google.com/abc-defg-hij',
      ...extra
    });

    // --- reads: every tenant member -------------------------------------------
    suite9Step = 'staff publishes a class';
    const slotId = `tt-rules-${stamp}`;
    const slotRef = doc(staff.db, 'timetableSlots', slotId);
    await setDoc(slotRef, slotDoc(slotId));
    check('front desk may publish a class', true);

    suite9Step = 'teacher reads the schedule';
    const teacherSlotRead = (await getDoc(doc(teacher.db, 'timetableSlots', slotId))).exists();
    check('faculty can read the schedule (tenant member view)', teacherSlotRead);

    suite9Step = 'student reads the schedule';
    const studentSlotRead = (await getDoc(doc(student.db, 'timetableSlots', slotId))).exists();
    check('a student can read the schedule for the Join Class button', studentSlotRead);

    // --- writes: desk only ----------------------------------------------------
    suite9Step = 'teacher publishes a class';
    const teacherCreateDenied = await expectDenied('teacher publishes a class', () =>
      setDoc(doc(teacher.db, 'timetableSlots', `tt-teacher-${stamp}`), slotDoc(`tt-teacher-${stamp}`))
    );
    check('faculty cannot publish a class', teacherCreateDenied);

    suite9Step = 'student publishes a class';
    const studentCreateDenied = await expectDenied('student publishes a class', () =>
      setDoc(doc(student.db, 'timetableSlots', `tt-student-${stamp}`), slotDoc(`tt-student-${stamp}`))
    );
    check('a student cannot publish a class', studentCreateDenied);

    // --- create validation ----------------------------------------------------
    suite9Step = 'unknown weekday';
    const badDayDenied = await expectDenied('slot on an unknown weekday', () =>
      setDoc(doc(admin.db, 'timetableSlots', `tt-day-${stamp}`), slotDoc(`tt-day-${stamp}`, { dayOfWeek: 'Sunday' }))
    );
    check('Sunday is not a schedulable day', badDayDenied);

    suite9Step = 'missing batch';
    const noBatch = slotDoc(`tt-nobatch-${stamp}`);
    delete (noBatch as Record<string, unknown>).batchId;
    const noBatchDenied = await expectDenied('slot with no batch', () =>
      setDoc(doc(admin.db, 'timetableSlots', `tt-nobatch-${stamp}`), noBatch)
    );
    check('a slot must name a batch', noBatchDenied);

    suite9Step = 'over-long class link';
    const longUrlDenied = await expectDenied('slot with an over-long link', () =>
      setDoc(
        doc(admin.db, 'timetableSlots', `tt-long-${stamp}`),
        slotDoc(`tt-long-${stamp}`, { meetUrl: `https://meet.google.com/${'a'.repeat(600)}` })
      )
    );
    check('an over-long class link is rejected', longUrlDenied);

    // --- updates are desk-only and identity-pinned ----------------------------
    suite9Step = 'teacher edits a class';
    const teacherUpdateDenied = await expectDenied('teacher edits a class', () =>
      updateDoc(doc(teacher.db, 'timetableSlots', slotId), { subject: 'not mine' })
    );
    check('faculty cannot edit an existing class', teacherUpdateDenied);

    suite9Step = 'staff corrects a class';
    await updateDoc(slotRef, { subject: 'Class 10 Mathematics (corrected)', meetUrl: 'https://us02web.zoom.us/j/9876543210' });
    check('front desk may correct a class', true);

    suite9Step = 'staff moves the class org';
    const moveOrgDenied = await expectDenied('staff moves a class to another centre', () =>
      updateDoc(slotRef, { orgId: OTHER_ORG_ID })
    );
    check('the tenant of a class is pinned on update', moveOrgDenied);

    // --- deletes are desk-only -------------------------------------------------
    suite9Step = 'teacher deletes a class';
    const teacherDeleteDenied = await expectDenied('teacher deletes a class', () =>
      deleteDoc(doc(teacher.db, 'timetableSlots', slotId))
    );
    check('faculty cannot delete a class', teacherDeleteDenied);

    suite9Step = 'staff deletes a class';
    await deleteDoc(slotRef);
    check('front desk may remove a class', true);

    // --- tenant isolation ------------------------------------------------------
    suite9Step = 'cross-org timetable write';
    const crossOrgWriteDenied = await expectDenied('other-centre admin writes a foreign class', () =>
      setDoc(doc(adminOther.db, 'timetableSlots', `tt-foreign-${stamp}`), {
        ...slotDoc(`tt-foreign-${stamp}`),
        orgId: ORG_ID
      })
    );
    check('the timetable is tenant-isolated on write', crossOrgWriteDenied);

    suite9Step = 'cross-org timetable read';
    const foreignSlotId = `tt-foreign-read-${stamp}`;
    await setDoc(doc(admin.db, 'timetableSlots', foreignSlotId), slotDoc(foreignSlotId));
    const crossOrgReadDenied = await expectDenied('other-centre admin reads a foreign class', () =>
      getDoc(doc(adminOther.db, 'timetableSlots', foreignSlotId))
    );
    check('the timetable is tenant-isolated on read', crossOrgReadDenied);
  } catch (err) {
    console.error(`\nSuite 9 failed at step: "${suite9Step}"`);
    throw err;
  }

  // ---------------------------------------------------------------- syllabus (F7)
  console.log('\nSuite 10: Syllabus coverage — instructors/admin seed and tick, everyone reads');
  let suite10Step = 'setup';
  try {
    const topicDoc = (id: string, extra: Record<string, unknown> = {}) => ({
      id,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      batchId: 'batch-rules-1',
      subject: 'Mathematics',
      classGrade: 'Class 10',
      board: 'CBSE',
      chapter: 'Chapter 1',
      title: 'Real Numbers',
      sequence: 1,
      status: 'not_started',
      createdAt: new Date().toISOString(),
      ...extra
    });

    // --- reads: every tenant member ------------------------------------------
    suite10Step = 'admin seeds a syllabus';
    const topicId = `syl-rules-${stamp}`;
    const topicRef = doc(admin.db, 'syllabusTopics', topicId);
    await setDoc(topicRef, topicDoc(topicId));
    check('an admin may seed a syllabus', true);

    suite10Step = 'teacher reads the syllabus';
    const teacherRead = (await getDoc(doc(teacher.db, 'syllabusTopics', topicId))).exists();
    check('faculty can read the syllabus', teacherRead);

    suite10Step = 'student reads the syllabus';
    const studentRead = (await getDoc(doc(student.db, 'syllabusTopics', topicId))).exists();
    check('a student can read coverage for their progress bar', studentRead);

    // --- writes: instructors/admins only -------------------------------------
    suite10Step = 'teacher seeds a syllabus';
    const teacherTopicId = `syl-teacher-${stamp}`;
    await setDoc(doc(teacher.db, 'syllabusTopics', teacherTopicId), topicDoc(teacherTopicId));
    check('faculty may seed a syllabus', true);

    suite10Step = 'staff seeds a syllabus';
    const staffCreateDenied = await expectDenied('front desk seeds a syllabus', () =>
      setDoc(doc(staff.db, 'syllabusTopics', `syl-staff-${stamp}`), topicDoc(`syl-staff-${stamp}`))
    );
    check('the front desk cannot write the syllabus', staffCreateDenied);

    suite10Step = 'student seeds a syllabus';
    const studentCreateDenied = await expectDenied('student seeds a syllabus', () =>
      setDoc(doc(student.db, 'syllabusTopics', `syl-student-${stamp}`), topicDoc(`syl-student-${stamp}`))
    );
    check('a student cannot write the syllabus', studentCreateDenied);

    // --- create validation ----------------------------------------------------
    suite10Step = 'unknown status';
    const badStatusDenied = await expectDenied('chapter with an unknown status', () =>
      setDoc(doc(admin.db, 'syllabusTopics', `syl-status-${stamp}`), topicDoc(`syl-status-${stamp}`, { status: 'maybe' }))
    );
    check('an unknown coverage status is rejected', badStatusDenied);

    suite10Step = 'missing title';
    const noTitle = topicDoc(`syl-notitle-${stamp}`);
    delete (noTitle as Record<string, unknown>).title;
    const noTitleDenied = await expectDenied('chapter with no title', () =>
      setDoc(doc(admin.db, 'syllabusTopics', `syl-notitle-${stamp}`), noTitle)
    );
    check('a chapter must have a title', noTitleDenied);

    suite10Step = 'missing batch';
    const noBatch = topicDoc(`syl-nobatch-${stamp}`);
    delete (noBatch as Record<string, unknown>).batchId;
    const noBatchDenied = await expectDenied('chapter with no batch', () =>
      setDoc(doc(admin.db, 'syllabusTopics', `syl-nobatch-${stamp}`), noBatch)
    );
    check('a chapter must name a batch', noBatchDenied);

    suite10Step = 'missing sequence';
    const noSeq = topicDoc(`syl-noseq-${stamp}`);
    delete (noSeq as Record<string, unknown>).sequence;
    const noSeqDenied = await expectDenied('chapter with no sequence', () =>
      setDoc(doc(admin.db, 'syllabusTopics', `syl-noseq-${stamp}`), noSeq)
    );
    check('a chapter must carry a sequence number', noSeqDenied);

    // --- updates: instructors/admins only, tenant pinned ----------------------
    suite10Step = 'student ticks a chapter';
    const studentUpdateDenied = await expectDenied('student ticks a chapter', () =>
      updateDoc(doc(student.db, 'syllabusTopics', topicId), { status: 'completed' })
    );
    check('a student cannot tick coverage', studentUpdateDenied);

    suite10Step = 'staff ticks a chapter';
    const staffUpdateDenied = await expectDenied('front desk ticks a chapter', () =>
      updateDoc(doc(staff.db, 'syllabusTopics', topicId), { status: 'completed' })
    );
    check('the front desk cannot tick coverage', staffUpdateDenied);

    suite10Step = 'teacher ticks a chapter';
    await updateDoc(doc(teacher.db, 'syllabusTopics', topicId), {
      status: 'completed',
      coveredByTeacherId: 'teach-rules-1'
    });
    check('faculty may tick a chapter', true);

    suite10Step = 'teacher sets a bad status';
    const badUpdateDenied = await expectDenied('teacher sets an unknown status', () =>
      updateDoc(doc(teacher.db, 'syllabusTopics', topicId), { status: 'weird' })
    );
    check('an update cannot set an unknown status', badUpdateDenied);

    suite10Step = 'teacher moves the chapter org';
    const moveOrgDenied = await expectDenied('teacher moves a chapter to another centre', () =>
      updateDoc(doc(teacher.db, 'syllabusTopics', topicId), { orgId: OTHER_ORG_ID })
    );
    check('the tenant of a chapter is pinned on update', moveOrgDenied);

    // --- deletes: instructors/admins only -------------------------------------
    suite10Step = 'student deletes a chapter';
    const studentDeleteDenied = await expectDenied('student deletes a chapter', () =>
      deleteDoc(doc(student.db, 'syllabusTopics', topicId))
    );
    check('a student cannot delete a chapter', studentDeleteDenied);

    suite10Step = 'teacher deletes a chapter';
    await deleteDoc(doc(teacher.db, 'syllabusTopics', topicId));
    check('faculty may remove a chapter', true);

    // --- tenant isolation -----------------------------------------------------
    suite10Step = 'cross-org syllabus write';
    const crossWriteDenied = await expectDenied('other-centre admin seeds a foreign syllabus', () =>
      setDoc(doc(adminOther.db, 'syllabusTopics', `syl-foreign-${stamp}`), {
        ...topicDoc(`syl-foreign-${stamp}`),
        orgId: ORG_ID
      })
    );
    check('the syllabus is tenant-isolated on write', crossWriteDenied);

    suite10Step = 'cross-org syllabus read';
    const foreignTopicId = `syl-foreign-read-${stamp}`;
    await setDoc(doc(admin.db, 'syllabusTopics', foreignTopicId), topicDoc(foreignTopicId));
    const crossReadDenied = await expectDenied('other-centre admin reads a foreign syllabus', () =>
      getDoc(doc(adminOther.db, 'syllabusTopics', foreignTopicId))
    );
    check('the syllabus is tenant-isolated on read', crossReadDenied);
  } catch (err) {
    console.error(`\nSuite 10 failed at step: "${suite10Step}"`);
    throw err;
  }

  console.log('\nSuite 11: PTM scheduler — desk opens windows, families book inside the field-lock');
  let suite11Step = 'setup';
  try {
    // A second faculty record owned by somebody the teacher client is NOT, so
    // the "not my diary" read is a real negative (the teacher client is linked
    // to teach-rules-1 via its userId — provisioned in Suite 6).
    await setDoc(doc(admin.db, 'teachers', 'teach-rules-2'), {
      id: 'teach-rules-2',
      orgId: ORG_ID,
      branchId: 'branch-rules',
      userId: 'somebody-else-uid',
      name: 'Other Rules Teacher',
      phone: '+91 9000000099',
      email: 'other-teacher@example.com',
      avatar: '',
      qualification: 'M.Sc',
      subjects: ['Physics'],
      assignedBatchIds: [],
      joiningDate: '2026-04-01',
      status: 'active'
    });

    // Re-sign into the accounts Suite 6 linked to students/stud-rules-1: the
    // learner (userId) and the guardian (guardian.parentUserId), so claims pass
    // `isLinkedToStudent`.
    const studentBooker = await makeClient('ptm-student');
    await signInWithEmailAndPassword(
      studentBooker.auth,
      `rules-student-${stamp}@phone.vidyaos.in`,
      PASSWORD
    );
    const parentBooker = await makeClient('ptm-parent');
    await signInWithEmailAndPassword(
      parentBooker.auth,
      `rules-parent-${stamp}@phone.vidyaos.in`,
      PASSWORD
    );
    const studentBookerUid = studentBooker.auth.currentUser!.uid;
    const parentBookerUid = parentBooker.auth.currentUser!.uid;

    const eventDoc = (id: string, extra: Record<string, unknown> = {}) => ({
      id,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      title: 'Rules PTM',
      date: '2026-11-15',
      startTime: '16:00',
      endTime: '18:00',
      slotMinutes: 15,
      teacherIds: ['teach-rules-1', 'teach-rules-2'],
      notes: 'Term progress review.',
      createdBy: adminUid,
      createdAt: new Date().toISOString(),
      ...extra
    });
    const slotDoc = (id: string, teacherId: string, extra: Record<string, unknown> = {}) => ({
      id,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      eventId: 'ptm-event-rules',
      teacherId,
      startsAt: '2026-11-15T16:00',
      endsAt: '2026-11-15T16:15',
      status: 'available',
      ...extra
    });
    // Full-document set() — exactly the app's transactional write path.
    const claimDoc = (slot: Record<string, unknown>, uid: string, studentId: string, name: string) => ({
      ...slot,
      status: 'booked',
      bookedByUserId: uid,
      bookedStudentId: studentId,
      bookedForName: name,
      bookedAt: new Date().toISOString()
    });
    const releaseDoc = (slot: Record<string, unknown>) => ({
      ...slot,
      status: 'available',
      bookedByUserId: null,
      bookedStudentId: null,
      bookedForName: null,
      bookedAt: null
    });

    // --- events: desk-only ---------------------------------------------------
    suite11Step = 'admin opens a PTM window';
    await setDoc(doc(admin.db, 'ptmEvents', 'ptm-event-rules'), eventDoc('ptm-event-rules'));
    check('an admin may open a PTM event', true);

    suite11Step = 'teacher opens a PTM window';
    const teacherEventDenied = await expectDenied('teacher opens a PTM event', () =>
      setDoc(doc(teacher.db, 'ptmEvents', `ptm-t-${stamp}`), eventDoc(`ptm-t-${stamp}`))
    );
    check('faculty cannot open a PTM event', teacherEventDenied);

    suite11Step = 'student opens a PTM window';
    const studentEventDenied = await expectDenied('student opens a PTM event', () =>
      setDoc(doc(student.db, 'ptmEvents', `ptm-s-${stamp}`), eventDoc(`ptm-s-${stamp}`))
    );
    check('a student cannot open a PTM event', studentEventDenied);

    suite11Step = 'malformed event';
    const noTeachersDenied = await expectDenied('admin opens a PTM event with no teachers', () =>
      setDoc(doc(admin.db, 'ptmEvents', 'ptm-bad-1'), eventDoc('ptm-bad-1', { teacherIds: [] }))
    );
    check('an event must invite at least one teacher', noTeachersDenied);
    const badDateDenied = await expectDenied('admin opens a PTM event with an invalid date', () =>
      setDoc(doc(admin.db, 'ptmEvents', 'ptm-bad-2'), eventDoc('ptm-bad-2', { date: '11-15-2026' }))
    );
    check('a non-ISO event date is rejected', badDateDenied);

    suite11Step = 'cross-org event write';
    const crossEventDenied = await expectDenied('foreign admin opens a PTM event in this centre', () =>
      setDoc(doc(adminOther.db, 'ptmEvents', 'ptm-foreign'), eventDoc('ptm-foreign'))
    );
    check('PTM events are tenant-isolated on write', crossEventDenied);

    // --- slots: born of desk generation, event-join enforced -----------------
    suite11Step = 'desk cuts the grid';
    await setDoc(doc(admin.db, 'ptmSlots', 'ptm-slot-1'), slotDoc('ptm-slot-1', 'teach-rules-1'));
    await setDoc(doc(admin.db, 'ptmSlots', 'ptm-slot-2'), slotDoc('ptm-slot-2', 'teach-rules-2'));
    await setDoc(doc(admin.db, 'ptmSlots', 'ptm-slot-3'), slotDoc('ptm-slot-3', 'teach-rules-1'));
    await setDoc(doc(admin.db, 'ptmSlots', 'ptm-slot-4'), slotDoc('ptm-slot-4', 'teach-rules-1'));
    check('staff/admin may cut slots for an event that exists', true);

    suite11Step = 'staff cuts a slot';
    await setDoc(doc(staff.db, 'ptmSlots', 'ptm-slot-5'), slotDoc('ptm-slot-5', 'teach-rules-1'));
    check('the front desk may cut slots too', true);

    suite11Step = 'orphan slot';
    const orphanDenied = await expectDenied('admin cuts a slot inside a missing event', () =>
      setDoc(doc(admin.db, 'ptmSlots', 'ptm-orphan'),
        slotDoc('ptm-orphan', 'teach-rules-1', { eventId: 'ptm-no-such-event' }))
    );
    check('a slot must cite a real event', orphanDenied);

    suite11Step = 'student cuts a slot';
    const studentSlotCreateDenied = await expectDenied('student cuts a slot', () =>
      setDoc(doc(studentBooker.db, 'ptmSlots', 'ptm-student-slot'), slotDoc('ptm-student-slot', 'teach-rules-1'))
    );
    check('a learner cannot cut slots', studentSlotCreateDenied);

    // --- reads: non-faculty see the grid, faculty only their own column ------
    suite11Step = 'learner reads the grid';
    const learnerRead = (await getDoc(doc(studentBooker.db, 'ptmSlots', 'ptm-slot-1'))).exists();
    check('a learner can read the booking grid', learnerRead);

    suite11Step = 'teacher reads own column';
    const teacherOwnRead = (await getDoc(doc(teacher.db, 'ptmSlots', 'ptm-slot-1'))).exists();
    check('faculty can read their own diary column', teacherOwnRead);

    suite11Step = 'teacher reads another column';
    const teacherOtherReadDenied = await expectDenied('faculty reads another teacher column', () =>
      getDoc(doc(teacher.db, 'ptmSlots', 'ptm-slot-2'))
    );
    check('faculty cannot read another teacher diary', teacherOtherReadDenied);

    suite11Step = 'teacher list queries';
    const teacherListDenied = await expectDenied('faculty reads the whole grid as an unpinned list', () =>
      getDocs(query(collection(teacher.db, 'ptmSlots'), where('orgId', '==', ORG_ID)))
    );
    check('a faculty list query must pin their own teacherId', teacherListDenied);
    const teacherOwnList = await getDocs(
      query(
        collection(teacher.db, 'ptmSlots'),
        where('orgId', '==', ORG_ID),
        where('teacherId', '==', 'teach-rules-1')
      )
    );
    check('a pinned faculty list query (own teacherId) is provable', !teacherOwnList.empty);

    suite11Step = 'cross-org read';
    const crossSlotReadDenied = await expectDenied('foreign admin reads the grid', () =>
      getDoc(doc(adminOther.db, 'ptmSlots', 'ptm-slot-1'))
    );
    check('the slot grid is tenant-isolated on read', crossSlotReadDenied);

    // --- booking: claim free slot inside the field-lock ----------------------
    suite11Step = 'learner claims a slot';
    await setDoc(doc(studentBooker.db, 'ptmSlots', 'ptm-slot-1'),
      claimDoc(slotDoc('ptm-slot-1', 'teach-rules-1'), studentBookerUid, 'stud-rules-1', 'Rules Student'));
    check('a learner may claim a free slot for their own record', true);

    suite11Step = 'parent claims a slot';
    await setDoc(doc(parentBooker.db, 'ptmSlots', 'ptm-slot-2'),
      claimDoc(slotDoc('ptm-slot-2', 'teach-rules-2'), parentBookerUid, 'stud-rules-1', 'Rules Student'));
    check('a parent may claim a free slot for their linked child', true);

    suite11Step = 'double-book';
    const doubleBookDenied = await expectDenied('a second family claims an already-booked slot', () =>
      setDoc(doc(parentBooker.db, 'ptmSlots', 'ptm-slot-1'),
        claimDoc(slotDoc('ptm-slot-1', 'teach-rules-1'), parentBookerUid, 'stud-rules-1', 'Rules Student'))
    );
    check('a booked slot cannot be double-booked', doubleBookDenied);

    suite11Step = 'forged booker';
    const forgedDenied = await expectDenied('a claim stamped with another user id', () =>
      setDoc(doc(studentBooker.db, 'ptmSlots', 'ptm-slot-3'),
        claimDoc(slotDoc('ptm-slot-3', 'teach-rules-1'), 'somebody-else-uid', 'stud-rules-1', 'Rules Student'))
    );
    check('a claim must be stamped with the caller uid', forgedDenied);

    suite11Step = 'unlinked child';
    const unlinkedDenied = await expectDenied('a claim for a student you are not linked to', () =>
      setDoc(doc(studentBooker.db, 'ptmSlots', 'ptm-slot-3'),
        claimDoc(slotDoc('ptm-slot-3', 'teach-rules-1'), studentBookerUid, 'stud-rules-2', 'Unlinked Student'))
    );
    check('a claim must cite a linked student', unlinkedDenied);

    suite11Step = 'field-lock';
    const windowTweakDenied = await expectDenied('a claim that also moves the slot time', () =>
      setDoc(doc(studentBooker.db, 'ptmSlots', 'ptm-slot-4'),
        claimDoc({ ...slotDoc('ptm-slot-4', 'teach-rules-1'), startsAt: '2026-11-15T16:15', endsAt: '2026-11-15T16:30' },
          studentBookerUid, 'stud-rules-1', 'Rules Student'))
    );
    check('a booking cannot touch the slot identity keys', windowTweakDenied);
    const teacherSwapDenied = await expectDenied('a claim that swaps the teacher', () =>
      setDoc(doc(studentBooker.db, 'ptmSlots', 'ptm-slot-4'),
        claimDoc({ ...slotDoc('ptm-slot-4', 'teach-rules-1'), teacherId: 'teach-rules-2' },
          studentBookerUid, 'stud-rules-1', 'Rules Student'))
    );
    check('a booking cannot move the slot to another teacher', teacherSwapDenied);

    // --- release --------------------------------------------------------------
    suite11Step = 'non-owner release';
    const nonOwnerCancelDenied = await expectDenied('a learner releases the parent booking', () =>
      setDoc(doc(studentBooker.db, 'ptmSlots', 'ptm-slot-2'),
        releaseDoc(slotDoc('ptm-slot-2', 'teach-rules-2')))
    );
    check('only the booker may release their own booking', nonOwnerCancelDenied);

    suite11Step = 'owner release';
    await setDoc(doc(parentBooker.db, 'ptmSlots', 'ptm-slot-2'),
      releaseDoc(slotDoc('ptm-slot-2', 'teach-rules-2')));
    check('the booker may release their own booking — slot is free again', true);

    suite11Step = 'rebook after release';
    await setDoc(doc(parentBooker.db, 'ptmSlots', 'ptm-slot-2'),
      claimDoc(slotDoc('ptm-slot-2', 'teach-rules-2'), parentBookerUid, 'stud-rules-1', 'Rules Student'));
    check('a released slot is bookable again', true);

    // --- desk override ---------------------------------------------------------
    suite11Step = 'desk override';
    await setDoc(doc(staff.db, 'ptmSlots', 'ptm-slot-1'),
      releaseDoc(slotDoc('ptm-slot-1', 'teach-rules-1')));
    check('the desk may override any cell (clear a booking) inside the field-lock', true);

    // --- deletes ---------------------------------------------------------------
    suite11Step = 'student deletes a slot';
    const studentSlotDeleteDenied = await expectDenied('student deletes a slot', () =>
      deleteDoc(doc(studentBooker.db, 'ptmSlots', 'ptm-slot-3'))
    );
    check('a learner cannot delete slots', studentSlotDeleteDenied);

    suite11Step = 'teacher deletes the event';
    const teacherEventDeleteDenied = await expectDenied('teacher deletes the PTM event', () =>
      deleteDoc(doc(teacher.db, 'ptmEvents', 'ptm-event-rules'))
    );
    check('faculty cannot delete a PTM event', teacherEventDeleteDenied);

    suite11Step = 'desk deletes event';
    await deleteDoc(doc(admin.db, 'ptmSlots', 'ptm-slot-4'));
    await deleteDoc(doc(admin.db, 'ptmEvents', 'ptm-event-rules'));
    check('the desk may remove a PTM event and its grid', true);
  } catch (err) {
    console.error(`\nSuite 11 failed at step: "${suite11Step}"`);
    throw err;
  }

  console.log('\nSuite 12: Issued documents (F9) — append-only ID card / TC register');
  try {
    const issuedDoc = (id: string, over: Record<string, unknown> = {}) => ({
      id,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      studentId: 'stud-rules-1',
      type: 'id_card',
      tcNo: null,
      leavingDate: null,
      remarks: null,
      issuedAt: '2026-04-01T09:00:00.000Z',
      issuedByUserId: adminUid,
      issuedByName: 'Rules Admin',
      ...over
    });

    // Sign the learner's linked account in so `isLinkedToStudent` is meaningful.
    const studentReader = await makeClient('issued-student');
    await signInWithEmailAndPassword(
      studentReader.auth,
      `rules-student-${stamp}@phone.vidyaos.in`,
      PASSWORD
    );

    // --- desk issues -----------------------------------------------------------
    suite11Step = 'admin issues an ID card';
    await setDoc(doc(admin.db, 'issuedDocuments', 'doc-issued-id'), issuedDoc('doc-issued-id'));
    check('staff/admin may record an ID card in the register', true);

    suite11Step = 'admin issues a TC';
    await setDoc(
      doc(admin.db, 'issuedDocuments', 'doc-issued-tc'),
      issuedDoc('doc-issued-tc', { type: 'tc', tcNo: 'RULES/2026/001', leavingDate: '2026-03-31', remarks: 'Dues cleared.' })
    );
    check('staff/admin may record a numbered Transfer Certificate', true);

    // A doc for another learner in the same centre, for the read test below.
    await setDoc(
      doc(admin.db, 'issuedDocuments', 'doc-issued-other'),
      issuedDoc('doc-issued-other', { studentId: 'stud-rules-2' })
    );

    // --- learners / faculty cannot create -------------------------------------
    suite11Step = 'student creates';
    const studentCreateDenied = await expectDenied('a learner creates a register row', () =>
      setDoc(doc(studentReader.db, 'issuedDocuments', 'doc-student-try'), issuedDoc('doc-student-try'))
    );
    check('a learner cannot create an issued document', studentCreateDenied);

    suite11Step = 'teacher creates';
    const teacherCreateDenied = await expectDenied('a teacher creates a register row', () =>
      setDoc(doc(teacher.db, 'issuedDocuments', 'doc-teacher-try'), issuedDoc('doc-teacher-try'))
    );
    check('faculty cannot create an issued document (desk-only)', teacherCreateDenied);

    // --- well-formedness -------------------------------------------------------
    suite11Step = 'TC without a serial';
    const tcNoMissingDenied = await expectDenied('a TC with no serial', () =>
      setDoc(doc(admin.db, 'issuedDocuments', 'doc-bad-tc'), issuedDoc('doc-bad-tc', { type: 'tc', tcNo: null }))
    );
    check('a Transfer Certificate must carry a serial', tcNoMissingDenied);

    suite11Step = 'ID card with a serial';
    const idCardTcNoDenied = await expectDenied('an ID card carrying a serial', () =>
      setDoc(doc(admin.db, 'issuedDocuments', 'doc-bad-id'), issuedDoc('doc-bad-id', { tcNo: 'RULES/2026/099' }))
    );
    check('an ID card must not carry a serial', idCardTcNoDenied);

    suite11Step = 'forged operator';
    const forgedActorDenied = await expectDenied('an entry claiming someone else as issuer', () =>
      setDoc(doc(admin.db, 'issuedDocuments', 'doc-forged'), issuedDoc('doc-forged', { issuedByUserId: 'somebody-else' }))
    );
    check('the issuer stamp cannot be forged', forgedActorDenied);

    suite11Step = 'unknown type';
    const badTypeDenied = await expectDenied('an unknown document type', () =>
      setDoc(doc(admin.db, 'issuedDocuments', 'doc-bad-type'), issuedDoc('doc-bad-type', { type: 'bonus' }))
    );
    check('only id_card/tc document types are accepted', badTypeDenied);

    // --- read scoping ----------------------------------------------------------
    suite11Step = 'student reads own';
    const ownSnap = await getDoc(doc(studentReader.db, 'issuedDocuments', 'doc-issued-id'));
    check('a learner may read their own issued document', ownSnap.exists());

    suite11Step = 'student reads other learner';
    const otherReadDenied = await expectDenied('a learner reads another learner’s document', () =>
      getDoc(doc(studentReader.db, 'issuedDocuments', 'doc-issued-other'))
    );
    check('a learner cannot read another learner’s documents', otherReadDenied);

    suite11Step = 'cross-org read';
    const crossOrgReadDenied = await expectDenied('another centre reads the register', () =>
      getDoc(doc(adminOther.db, 'issuedDocuments', 'doc-issued-id'))
    );
    check('the register is tenant-isolated', crossOrgReadDenied);

    // --- append-only -----------------------------------------------------------
    suite11Step = 'update';
    const updateDenied = await expectDenied('admin edits a register row', () =>
      updateDoc(doc(admin.db, 'issuedDocuments', 'doc-issued-id'), { remarks: 'tampered' })
    );
    check('register rows cannot be updated (serial is immutable)', updateDenied);

    suite11Step = 'delete';
    const deleteDenied = await expectDenied('admin deletes a register row', () =>
      deleteDoc(doc(admin.db, 'issuedDocuments', 'doc-issued-id'))
    );
    check('a register row cannot be deleted (serial is never reused)', deleteDenied);
  } catch (err) {
    console.error(`\nSuite 12 failed at step: "${suite11Step}"`);
    throw err;
  }

  console.log('\nSuite 13: Exam results (F10) — instructors/admin publish marks + imported AIR');
  let suite13Step = 'setup';
  try {
    const examResult = (id: string, over: Record<string, unknown> = {}) => ({
      id,
      examId: 'exam-rules-1',
      studentId: 'stud-rules-1',
      marksObtained: 88,
      percentage: 88,
      rank: 2,
      percentile: 92,
      teacherRemarks: 'Strong national standing.',
      status: 'graded',
      externalRank: 247,
      externalTotalStudents: 4500,
      externalPercentile: 94.5,
      orgId: ORG_ID,
      ...over
    });

    const airReader = await makeClient('air-student');
    await signInWithEmailAndPassword(
      airReader.auth,
      `rules-student-${stamp}@phone.vidyaos.in`,
      PASSWORD
    );

    suite13Step = 'admin publishes imported AIR';
    await setDoc(doc(admin.db, 'examResults', 'res-air-rules'), examResult('res-air-rules'));
    check('staff/admin may publish a result carrying an all-India rank', true);

    suite13Step = 'teacher publishes imported AIR';
    await setDoc(
      doc(teacher.db, 'examResults', 'res-air-teacher'),
      examResult('res-air-teacher', { studentId: 'stud-rules-2' })
    );
    check('faculty may publish a result carrying an all-India rank', true);

    suite13Step = 'student writes';
    const studentWriteDenied = await expectDenied('a learner writes an exam result', () =>
      setDoc(doc(airReader.db, 'examResults', 'res-air-student'), examResult('res-air-student'))
    );
    check('a learner cannot fabricate an exam result (AIR stays imported)', studentWriteDenied);

    suite13Step = 'cross-org write';
    const crossOrgWriteDenied = await expectDenied('another centre writes a result', () =>
      setDoc(doc(adminOther.db, 'examResults', 'res-air-other'), examResult('res-air-other', { orgId: ORG_ID }))
    );
    check('exam results are tenant-isolated', crossOrgWriteDenied);

    suite13Step = 'read';
    const airRead = await getDoc(doc(airReader.db, 'examResults', 'res-air-rules'));
    check('a learner may read their centre’s published result', airRead.exists());
  } catch (err) {
    console.error(`\nSuite 13 failed at step: "${suite13Step}"`);
    throw err;
  }

  console.log('\nSuite 14: Fee installments (F11) — plan persists, submissions stay within the balance');
  let suite14Step = 'setup';
  try {
    const invoiceDoc = (id: string, over: Record<string, unknown> = {}) => ({
      id,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      studentId: 'stud-rules-1',
      invoiceNo: `INV/2026-27/R-${id}`,
      monthYear: 'Term 2026-27',
      title: 'Term Fee (3 instalments)',
      amount: 6000,
      discount: 0,
      lateFee: 0,
      netAmount: 6000,
      paidAmount: 2000,
      dueDate: '2026-09-10',
      status: 'partially_paid',
      createdAt: '2026-09-01',
      payments: [],
      installments: [
        { id: 'inst-1', label: 'Instalment 1', amount: 2000, dueDate: '2026-09-10', status: 'paid', paidAmount: 2000, paymentIds: ['pay-rules-1'] },
        { id: 'inst-2', label: 'Instalment 2', amount: 2000, dueDate: '2026-10-10', status: 'pending', paidAmount: 0, paymentIds: [] },
        { id: 'inst-3', label: 'Instalment 3', amount: 2000, dueDate: '2026-11-10', status: 'pending', paidAmount: 0, paymentIds: [] }
      ],
      ...over
    });

    suite14Step = 'admin raises an instalmented invoice';
    await setDoc(doc(admin.db, 'invoices', 'inv-f11-rules'), invoiceDoc('inv-f11-rules'));
    check('an admin may create an invoice carrying an instalment plan', true);

    suite14Step = 'foreign admin raises an invoice';
    const crossInvoiceDenied = await expectDenied('another centre creates an invoice in this centre', () =>
      setDoc(doc(adminOther.db, 'invoices', 'inv-f11-foreign'), invoiceDoc('inv-f11-foreign'))
    );
    check('invoices are tenant-isolated on write', crossInvoiceDenied);

    const learner = await makeClient('fee-learner');
    await signInWithEmailAndPassword(
      learner.auth,
      `rules-student-${stamp}@phone.vidyaos.in`,
      PASSWORD
    );
    const learnerUid = learner.auth.currentUser!.uid;

    const submissionDoc = (id: string, amount: number, over: Record<string, unknown> = {}) => ({
      id,
      orgId: ORG_ID,
      invoiceId: 'inv-f11-rules',
      studentId: 'stud-rules-1',
      amount,
      paymentMethod: 'UPI',
      transactionRef: '428198273619',
      submittedBy: learnerUid,
      submittedByName: 'Rules Student',
      submittedAt: new Date().toISOString(),
      status: 'pending_verification',
      ...over
    });

    suite14Step = 'learner submits against the open balance';
    await setDoc(doc(learner.db, 'paymentSubmissions', 'sub-f11-balance-ok'), submissionDoc('sub-f11-balance-ok', 4000));
    check('a learner may submit a payment up to the open invoice balance', true);

    suite14Step = 'learner overpays';
    const overpayDenied = await expectDenied('learner submits above netAmount - paidAmount', () =>
      setDoc(doc(learner.db, 'paymentSubmissions', 'sub-f11-overpay'), submissionDoc('sub-f11-overpay', 5000))
    );
    check('a payment submission above the open balance is denied', overpayDenied);

    suite14Step = 'foreign-centre invoice';
    await setDoc(doc(adminOther.db, 'invoices', 'inv-f11-other'), {
      ...invoiceDoc('inv-f11-other'),
      orgId: OTHER_ORG_ID,
      studentId: 'stud-rules-other'
    });
    const foreignSubmissionDenied = await expectDenied('learner submits against a foreign-centre invoice', () =>
      setDoc(doc(learner.db, 'paymentSubmissions', 'sub-f11-foreign'), submissionDoc('sub-f11-foreign', 100, {
        invoiceId: 'inv-f11-other',
        orgId: OTHER_ORG_ID
      }))
    );
    check('a learner cannot submit against another centre\'s invoice', foreignSubmissionDenied);
  } catch (err) {
    console.error(`\nSuite 14 failed at step: "${suite14Step}"`);
    throw err;
  }

  console.log('\nSuite 15: Session rollover (F12) — next-year batches + first-month invoices reuse existing roles');
  let suite15Step = 'setup';
  try {
    const batchDoc = (id: string, over: Record<string, unknown> = {}) => ({
      id,
      orgId: ORG_ID,
      branchId: 'branch-rules',
      name: 'Class 10 - Mathematics',
      subject: 'Mathematics',
      classGrade: 'Class 10',
      teacherId: 'teach-rules',
      classroom: 'Room 1',
      scheduleDays: ['Mon', 'Wed', 'Fri'],
      timeSlot: '05:00 PM - 06:30 PM',
      capacity: 25,
      studentIds: ['stud-rules-1'],
      feeAmountMonthly: 2000,
      academicYear: '2026-2027',
      status: 'active',
      ...over
    });

    suite15Step = 'admin creates the current-year batch';
    await setDoc(doc(admin.db, 'batches', 'batch-f12-current'), batchDoc('batch-f12-current'));
    check('an admin may create the batch that will be rolled over', true);

    suite15Step = 'admin creates the next-year batch';
    await setDoc(
      doc(admin.db, 'batches', 'batch-f12-next'),
      batchDoc('batch-f12-next', {
        id: 'batch-f12-next',
        name: 'Class 11 - Mathematics',
        classGrade: 'Class 11',
        academicYear: '2027-2028'
      })
    );
    check('an admin may create the next-year rollover batch', true);

    suite15Step = 'teacher archives the old batch';
    await updateDoc(doc(teacher.db, 'batches', 'batch-f12-current'), { status: 'completed' });
    check('faculty may archive an old batch as completed during rollover', true);

    suite15Step = 'admin raises the first-month invoice';
    await setDoc(doc(admin.db, 'invoices', 'inv-f12-first'), {
      id: 'inv-f12-first',
      orgId: ORG_ID,
      branchId: 'branch-rules',
      studentId: 'stud-rules-1',
      batchId: 'batch-f12-next',
      invoiceNo: 'INV/2027-28/001',
      monthYear: 'April 2027',
      title: 'April 2027 Tuition Fee - Class 11 Mathematics',
      amount: 2000,
      discount: 0,
      lateFee: 0,
      netAmount: 2000,
      paidAmount: 0,
      dueDate: '2027-04-10',
      status: 'pending',
      createdAt: '2027-04-01',
      payments: []
    });
    check('an admin may raise a first-month rollover invoice', true);

    suite15Step = 'foreign admin creates a batch here';
    const foreignBatchDenied = await expectDenied('another centre creates a batch in this centre', () =>
      setDoc(doc(adminOther.db, 'batches', 'batch-f12-foreign'), batchDoc('batch-f12-foreign'))
    );
    check('rollover batches stay tenant-isolated', foreignBatchDenied);

    suite15Step = 'teacher creates a batch';
    const teacherBatchDenied = await expectDenied('faculty creates a rollover batch', () =>
      setDoc(doc(teacher.db, 'batches', 'batch-f12-teacher'), batchDoc('batch-f12-teacher'))
    );
    check('faculty cannot create batches (rollover stays desk-side)', teacherBatchDenied);

    suite15Step = 'learner creates a batch';
    const learnerBatchDenied = await expectDenied('a learner creates a batch', () =>
      setDoc(doc(student.db, 'batches', 'batch-f12-student'), batchDoc('batch-f12-student'))
    );
    check('a learner cannot create a rollover batch', learnerBatchDenied);

    suite15Step = 'learner raises an invoice';
    const learnerInvoiceDenied = await expectDenied('a learner raises a rollover invoice', () =>
      setDoc(doc(student.db, 'invoices', 'inv-f12-student'), {
        id: 'inv-f12-student',
        orgId: ORG_ID,
        branchId: 'branch-rules',
        studentId: 'stud-rules-1',
        monthYear: 'April 2027',
        title: 'Fabricated fee',
        amount: 0,
        discount: 0,
        lateFee: 0,
        netAmount: 0,
        paidAmount: 0,
        dueDate: '2027-04-10',
        status: 'pending',
        createdAt: '2027-04-01',
        payments: []
      })
    );
    check('a learner cannot raise a rollover invoice', learnerInvoiceDenied);
  } catch (err) {
    console.error(`\nSuite 15 failed at step: "${suite15Step}"`);
    throw err;
  }

  console.log('\n----------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('----------------------------------------\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unexpected failure:', err);
  process.exit(1);
});