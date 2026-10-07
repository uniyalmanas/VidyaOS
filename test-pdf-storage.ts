/**
 * VidyaOS PDF Storage Verification Suite
 *
 * Runs against the local Firebase Emulators (Auth + Firestore + Storage) and
 * exercises the REAL security rules in firestore.rules / storage.rules plus
 * the exact storage path the Admin Dashboard uploads to.
 *
 *   npx firebase emulators:start --only auth,firestore,storage --project vidyut-2bcb6
 *   npx tsx test-pdf-storage.ts
 */
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

const PROJECT_ID = 'vidyut-2bcb6';
// Set SKIP_NEGATIVE=1 to run only the authorized happy-path suites. Useful for
// confirming whether a storage.rules evaluation warning comes from the
// deliberate denial tests (Suite 4) rather than from real upload flows.
const SKIP_NEGATIVE = process.env.SKIP_NEGATIVE === '1';
// Unique-per-run test tenant: the emulator keeps data in memory between runs,
// so a fixed ID would collide with a previous run's organization doc.
const ORG_ID = `org-pdf-test-${Date.now()}`;
const AUTH_EMU = 'http://127.0.0.1:9099';
const FS_EMU = { host: '127.0.0.1', port: 8080 };
const ST_EMU = { host: '127.0.0.1', port: 9199 };

let passed = 0;
let failed = 0;
const check = (cond: boolean, name: string) => {
  if (cond) {
    console.log(`  \u2713 PASS: ${name}`);
    passed++;
  } else {
    console.error(`  \u2717 FAIL: ${name}`);
    failed++;
  }
};

/** Minimal but genuinely valid PDF bytes. */
function makePdf(bytes = 4096): Blob {
  const header = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n';
  const body = 'trailer<</Root 1 0 R>>\n%%EOF\n';
  const filler = 'x'.repeat(Math.max(0, bytes - header.length - body.length));
  return new Blob([header + filler + body], { type: 'application/pdf' });
}

function makeBigPdf(megabytes: number): Blob {
  return makePdf(megabytes * 1024 * 1024);
}

async function main() {
  console.log('\n==============================================');
  console.log('VidyaOS PDF / Cloud Storage Verification Suite');
  console.log('==============================================\n');

  for (const a of getApps()) await deleteApp(a);

  const app = initializeApp({
    apiKey: 'fake-api-key',
    projectId: PROJECT_ID,
    authDomain: 'localhost',
    storageBucket: `${PROJECT_ID}.appspot.com`,
  });

  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH_EMU, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, FS_EMU.host, FS_EMU.port);
  const storage = getStorage(app);
  connectStorageEmulator(storage, ST_EMU.host, ST_EMU.port);

  const email = `pdf-admin-${Date.now()}@test.vidyaos.in`;
  const password = 'Str0ng!Passw0rd';

  // ---------------------------------------------------------------
  console.log('Suite 1: Auth + tenancy bootstrap (as required by the rules)');
  // ---------------------------------------------------------------
  // firestore.rules bootstrap chain:
  //   1. any signed-in user may create an organization they own  (L148-150)
  //   2. users/{uid} create requires ownsOrganization(orgId)    (L102-107)
  //   3. studyMaterials create requires isCenterInstructorOrAdmin (L388)
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  check(!!uid, 'Admin test user created in Firebase Auth');

  try {
    await setDoc(doc(db, 'organizations', ORG_ID), {
      id: ORG_ID,
      ownerUid: uid,
      name: 'PDF Storage Test Center',
      email,
      status: 'active',
      plan: 'growth',
      createdAt: new Date().toISOString(),
    });
    check(true, 'Organization created (self-service onboarding path, firestore.rules L148)');
  } catch (e: any) {
    check(false, `Organization create denied: ${e?.message || e}`);
  }

  // storage.rules reads users/$(uid) for role + orgId checks.
  try {
    await setDoc(doc(db, 'users', uid), {
      uid,
      name: 'PDF Test Admin',
      email,
      role: 'CENTER_ADMIN',
      orgId: ORG_ID,
      status: 'active',
    });
    const userSnap = await getDoc(doc(db, 'users', uid));
    check(userSnap.exists() && userSnap.data().role === 'CENTER_ADMIN', 'CENTER_ADMIN user doc created (ownsOrganization path, firestore.rules L102)');
  } catch (e: any) {
    check(false, `User doc create denied: ${e?.message || e}`);
  }

  // ---------------------------------------------------------------
  console.log('\nSuite 2: PDF upload to the exact path AdminDashboard uses');
  // ---------------------------------------------------------------
  // Mirrors AdminDashboard.tsx handleUploadMaterial():
  //   const path = `study-materials/${currentOrg.id}/${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
  const fileName = `study-materials/${ORG_ID}/${Date.now()}_Algebra_Formula_Booklet.pdf`;
  const pdf = makePdf(64 * 1024); // 64 KB, well under the 25MB rule limit

  let downloadUrl = '';
  try {
    const snap = await uploadBytes(ref(storage, fileName), pdf, { contentType: 'application/pdf' });
    downloadUrl = await getDownloadURL(snap.ref);
    check(true, `PDF uploaded to Firebase Cloud Storage at "${fileName}"`);
  } catch (e: any) {
    check(false, `PDF upload failed: ${e?.message || e}`);
  }

  check(!!downloadUrl && downloadUrl.length > 0, 'Public download URL returned by getDownloadURL');
  // Production URLs point at firebasestorage/storage.googleapis.com;
  // the emulator serves from 127.0.0.1:9199. Both are valid Cloud Storage URLs.
  check(
    downloadUrl.includes('firebasestorage') ||
      downloadUrl.includes('storage.googleapis.com') ||
      downloadUrl.includes('storage:9199') ||
      /127\.0\.0\.1:9199/.test(downloadUrl),
    'Download URL points at Cloud Storage (prod bucket or local emulator)'
  );

  // The URL must be readable by the same signed-in tenant member.
  if (downloadUrl) {
    try {
      const res = await fetch(downloadUrl);
      const buf = new Uint8Array(await res.arrayBuffer());
      check(res.status === 200, `Download URL fetchable (HTTP ${res.status})`);
      const head = new TextDecoder().decode(buf.slice(0, 8));
      check(head.startsWith('%PDF-'), 'Downloaded bytes are a real PDF (%PDF- header intact)');
      check(buf.length === pdf.size, `Byte length preserved (${buf.length} bytes)`);
    } catch (e: any) {
      check(false, `Download failed: ${e?.message || e}`);
    }
  }

  // ---------------------------------------------------------------
  console.log('\nSuite 3: Non-PDF content types the app advertises');
  // ---------------------------------------------------------------
  for (const [label, type, blob] of [
    ['DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', new Blob([new Uint8Array(1024)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })],
    ['ZIP', 'application/zip', new Blob([new Uint8Array(1024)], { type: 'application/zip' })],
    ['MP4', 'video/mp4', new Blob([new Uint8Array(1024)], { type: 'video/mp4' })],
    ['plain text', 'text/plain', new Blob(['notes'], { type: 'text/plain' })],
  ] as [string, string, Blob][]) {
    try {
      await uploadBytes(ref(storage, `study-materials/${ORG_ID}/${Date.now()}_file.${label.toLowerCase()}`), blob, { contentType: type });
      check(true, `${label} upload accepted (${type})`);
    } catch (e: any) {
      check(false, `${label} upload rejected: ${e?.message || e}`);
    }
  }

  // ---------------------------------------------------------------
  console.log('\nSuite 4: Security rule enforcement (negative tests)');
  // ---------------------------------------------------------------
  if (SKIP_NEGATIVE) {
    console.log('  (skipped: SKIP_NEGATIVE=1)');
  } else {
  // 4a. Oversized file (> 25MB rule limit)
  try {
    await uploadBytes(ref(storage, `study-materials/${ORG_ID}/${Date.now()}_huge.pdf`), makeBigPdf(26), { contentType: 'application/pdf' });
    check(false, '26MB file should have been rejected by isValidFileSize()');
  } catch {
    check(true, '26MB file rejected (25MB size limit enforced)');
  }

  // 4b. Disallowed content type (executable)
  try {
    await uploadBytes(ref(storage, `study-materials/${ORG_ID}/${Date.now()}.exe`), new Blob([new Uint8Array(64)], { type: 'application/x-msdownload' }), { contentType: 'application/x-msdownload' });
    check(false, 'Disallowed MIME type should have been rejected');
  } catch {
    check(true, 'Disallowed MIME type rejected by isPermittedContentType()');
  }

  // 4c. Cross-tenant path (wrong orgId) -> must be denied
  try {
    await uploadBytes(ref(storage, `study-materials/org-other-tenant/${Date.now()}_steal.pdf`), makePdf(), { contentType: 'application/pdf' });
    check(false, 'Cross-tenant upload should have been denied');
  } catch {
    check(true, 'Cross-tenant upload denied (tenant isolation enforced)');
  }

  // 4d. Unauthenticated write -> must be denied
  await signOut(auth);
  try {
    await uploadBytes(ref(storage, `study-materials/${ORG_ID}/${Date.now()}_anon.pdf`), makePdf(), { contentType: 'application/pdf' });
    check(false, 'Anonymous upload should have been denied');
  } catch {
    check(true, 'Anonymous upload denied (authentication required)');
  }
  }

  // ---------------------------------------------------------------
  console.log('\nSuite 5: Firestore persistence of material metadata');
  // ---------------------------------------------------------------
  await signInWithEmailAndPassword(auth, email, password);
  const matId = `mat-${Date.now()}`;
  // Mirrors firestoreService.ts persistStudyMaterialToFirestore()
  const materialDoc = {
    id: matId,
    orgId: ORG_ID,
    title: 'Algebra Formula Booklet',
    subject: 'Mathematics',
    type: 'pdf',
    fileUrl: downloadUrl || '#',
    fileSize: '0.1 MB',
    uploadedByTeacherId: 'teach-admin',
    uploadedAt: new Date().toISOString().split('T')[0],
  };
  let persisted = false;
  try {
    await setDoc(doc(db, 'studyMaterials', matId), materialDoc);
    const snap = await getDoc(doc(db, 'studyMaterials', matId));
    persisted = snap.exists() && snap.data().fileUrl === downloadUrl;
  } catch (e: any) {
    console.error('   firestore error:', e?.message || e);
  }
  check(persisted, 'Study material metadata + fileUrl persisted to Firestore collection "studyMaterials"');

  // Cleanup
  try {
    if (downloadUrl) {
      const u = new URL(downloadUrl);
      const enc = u.pathname.split('/o/')[1];
      if (enc) await deleteObject(ref(storage, decodeURIComponent(enc.split('?')[0])));
    }
  } catch {
    /* best-effort cleanup */
  }
  await deleteApp(app);

  console.log('\n----------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('----------------------------------------------\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('\nSUITE CRASHED:', e?.message || e);
  process.exit(2);
});
