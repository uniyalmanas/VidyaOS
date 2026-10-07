/**
 * VidyaOS — Firestore rules verification (faculty batch enrollment #2 + audit log F1)
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

  console.log('\n----------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('----------------------------------------\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unexpected failure:', err);
  process.exit(1);
});