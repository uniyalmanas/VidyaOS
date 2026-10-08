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
 * Run: npx firebase emulators:exec --only auth,firestore --project vidyut-2bcb6 "npx tsx test-rules.ts"
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
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

  console.log('\n----------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('----------------------------------------\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unexpected failure:', err);
  process.exit(1);
});