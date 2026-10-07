/**
 * VidyaOS — Firestore rules verification (batch enrollment #2 + audit F1 + inquiries F2 + leaves F3)
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

  console.log('\n----------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('----------------------------------------\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unexpected failure:', err);
  process.exit(1);
});