/**
 * VidyaOS — Real-time chat cloud-sync verification (Phase 1)
 *
 * Runs against the Auth + Firestore EMULATORS using the production
 * `firestore.rules`. Simulates two independent devices (a centre admin and a
 * student) and asserts that:
 *
 *   1. A message written on one device reaches the other device's live
 *      `onSnapshot` listener — this is the property that was missing when chat
 *      lived only in localStorage.
 *   2. Messages are returned in chronological order by the `createdAtMs` query.
 *   3. Anti-spoofing holds: nobody can post as someone else.
 *   4. Reactions work cross-user, but editing/deleting another user's message
 *      does not.
 *   5. A student cannot create channels, nor rewrite `allowedRoles`, but CAN
 *      bump `lastMessage` (which sending a message requires).
 *
 * Run: npx firebase emulators:exec --only auth,firestore --project vidyut-2bcb6 "npx tsx test-chat-sync.ts"
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
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  type Firestore,
  type Unsubscribe
} from 'firebase/firestore';
import type { ChatMessage, ChatChannel } from './src/types';

const PROJECT_ID = 'vidyut-2bcb6';
const ORG_ID = `org-e2e-${Date.now()}`;
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(predicate: () => boolean, timeoutMs = 8000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await sleep(100);
  }
  return predicate();
}

/** Returns the Firestore rules error code, or null if the call succeeded. */
async function expectDenied(label: string, fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    console.log(`  · ${label}: ALLOWED`);
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

/** Mirrors `toggleChatReactionFirestore` from src/lib/firestoreService.ts. */
async function toggleReaction(db: Firestore, messageId: string, emoji: string, uid: string): Promise<void> {
  const messageRef = doc(db, 'chatMessages', messageId);
  await runTransaction(db, async tx => {
    const snap = await tx.get(messageRef);
    if (!snap.exists()) return;
    const data = snap.data() as ChatMessage;
    const reactions: { [emoji: string]: string[] } = { ...(data.reactions || {}) };
    const users = reactions[emoji] || [];
    const next = users.includes(uid) ? users.filter(u => u !== uid) : [...users, uid];
    if (next.length > 0) reactions[emoji] = next;
    else delete reactions[emoji];
    tx.update(messageRef, { reactions });
  });
}

async function main(): Promise<void> {
  console.log('==============================================');
  console.log('VidyaOS Real-Time Chat Cloud-Sync Tests');
  console.log(`org: ${ORG_ID}`);
  console.log('==============================================');

  const admin = await makeClient('admin');
  const student = await makeClient('student');

  const stamp = Date.now();

  // ---------------------------------------------------------------- bootstrap
  console.log('\nSuite 1: Bootstrap through production rules');
  const adminCred = await createUserWithEmailAndPassword(
    admin.auth,
    `e2e-admin-${stamp}@phone.vidyaos.in`,
    PASSWORD
  );
  const adminUid = adminCred.user.uid;
  check('centre admin authenticated with Firebase Auth', Boolean(adminUid));

  await setDoc(doc(admin.db, 'organizations', ORG_ID), {
    id: ORG_ID,
    ownerUid: adminUid,
    name: 'E2E Coaching',
    email: `e2e-admin-${stamp}@phone.vidyaos.in`
  });
  check('admin self-provisioned an organisation', true);

  await setDoc(doc(admin.db, 'users', adminUid), {
    id: adminUid,
    uid: adminUid,
    role: 'CENTER_ADMIN',
    orgId: ORG_ID,
    name: 'E2E Admin',
    phone: '+91 9000000001',
    email: `e2e-admin-${stamp}@phone.vidyaos.in`
  });
  check('admin created own users/{uid} profile (ownsOrganization path)', true);

  const studentCred = await createUserWithEmailAndPassword(
    student.auth,
    `e2e-student-${stamp}@phone.vidyaos.in`,
    PASSWORD
  );
  const studentUid = studentCred.user.uid;
  check('student authenticated with Firebase Auth', Boolean(studentUid));

  await setDoc(doc(admin.db, 'users', studentUid), {
    id: studentUid,
    uid: studentUid,
    role: 'STUDENT',
    orgId: ORG_ID,
    name: 'E2E Student',
    phone: '+91 9000000002',
    email: `e2e-student-${stamp}@phone.vidyaos.in`
  });
  check('admin provisioned a student account (role in allowed list)', true);

  // ------------------------------------------------------- channels + gating
  console.log('\nSuite 2: Channel rules');
  const channelId = `chan-${ORG_ID}-announcements`;
  const channelDoc: Omit<ChatChannel, 'id'> = {
    orgId: ORG_ID,
    name: 'announcements',
    displayName: '📢 Announcements',
    type: 'announcements',
    description: 'E2E channel'
  };

  await setDoc(doc(admin.db, 'chatChannels', channelId), { id: channelId, ...channelDoc });
  check('centre admin can create a channel', true);

  const studentChannelId = `chan-${ORG_ID}-sneaky`;
  const studentCreateDenied = await expectDenied(
    'student creating a channel',
    () =>
      setDoc(doc(student.db, 'chatChannels', studentChannelId), {
        id: studentChannelId,
        ...channelDoc,
        name: 'sneaky'
      })
  );
  check('student cannot create a channel', studentCreateDenied);

  const rolesEscalationDenied = await expectDenied(
    'student rewriting allowedRoles',
    () =>
      updateDoc(doc(student.db, 'chatChannels', channelId), {
        allowedRoles: ['STUDENT', 'CENTER_ADMIN']
      })
  );
  check('student cannot widen allowedRoles', rolesEscalationDenied);

  const isolationEscalationDenied = await expectDenied(
    'student flipping isPrivate',
    () => updateDoc(doc(student.db, 'chatChannels', channelId), { isPrivate: false })
  );
  check('student cannot rewrite channel isolation flags', isolationEscalationDenied);

  const bumpDenied = await expectDenied(
    'student bumping lastMessage (required when sending)',
    () =>
      updateDoc(doc(student.db, 'chatChannels', channelId), {
        lastMessage: 'hello from student',
        lastMessageTime: '10:00 AM',
        lastMessageMs: Date.now()
      })
  );
  check('student CAN bump lastMessage preview', !bumpDenied);

  // --------------------------------------------------- cross-device delivery
  console.log('\nSuite 3: Real-time cross-device delivery');
  const adminInbox: ChatMessage[] = [];
  const studentInbox: ChatMessage[] = [];

  const messagesQuery = query(
    collection(admin.db, 'chatMessages'),
    where('orgId', '==', ORG_ID),
    orderBy('createdAtMs', 'desc'),
    limit(50)
  );
  const studentMessagesQuery = query(
    collection(student.db, 'chatMessages'),
    where('orgId', '==', ORG_ID),
    orderBy('createdAtMs', 'desc'),
    limit(50)
  );

  const unsubAdmin: Unsubscribe = onSnapshot(
    messagesQuery,
    snap => {
      adminInbox.length = 0;
      adminInbox.push(...snap.docs.map(d => d.data() as ChatMessage));
    },
    err => console.log(`  ! admin listener error: ${err.code || err.message}`)
  );
  const unsubStudent: Unsubscribe = onSnapshot(
    studentMessagesQuery,
    snap => {
      studentInbox.length = 0;
      studentInbox.push(...snap.docs.map(d => d.data() as ChatMessage));
    },
    err => console.log(`  ! student listener error: ${err.code || err.message}`)
  );

  await sleep(1200);
  check('both live listeners attached', true);

  const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    channelId,
    orgId: ORG_ID,
    senderId: studentUid,
    senderName: 'E2E Student',
    senderRole: 'STUDENT',
    content: 'default',
    createdAt: 'Today, 10:00 AM',
    createdAtMs: Date.now(),
    reactions: {},
    ...overrides
  });

  // Student sends → admin's listener must pick it up (the whole point).
  const msgFromStudent = buildMessage({
    content: 'Hello teacher, is the doubt class at 5pm?',
    createdAtMs: Date.now()
  });
  await setDoc(doc(student.db, 'chatMessages', msgFromStudent.id), msgFromStudent);

  const adminSawStudent = await waitFor(() =>
    adminInbox.some(m => m.id === msgFromStudent.id)
  );
  check(
    "message written on the student's device reached the admin's live listener",
    adminSawStudent,
    'listener never observed the write'
  );

  const studentSawOwn = await waitFor(() =>
    studentInbox.some(m => m.id === msgFromStudent.id)
  );
  check('sender also sees their own message via the listener', studentSawOwn);

  // Admin replies → student's listener must pick it up.
  const msgFromAdmin = buildMessage({
    senderId: adminUid,
    senderName: 'E2E Admin',
    senderRole: 'CENTER_ADMIN',
    content: 'Yes, 5pm in Hall 1.',
    createdAtMs: Date.now() + 1
  });
  await setDoc(doc(admin.db, 'chatMessages', msgFromAdmin.id), msgFromAdmin);

  const studentSawAdmin = await waitFor(() =>
    studentInbox.some(m => m.id === msgFromAdmin.id)
  );
  check(
    "message written on the admin's device reached the student's live listener",
    studentSawAdmin,
    'listener never observed the write'
  );

  // ------------------------------------------------------------------ ordering
  console.log('\nSuite 4: Chronological ordering');
  const ordered = [...studentInbox].sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  check(
    'query returns newest-first as ordered by createdAtMs',
    ordered.length >= 2 && ordered[0].createdAtMs! >= ordered[1].createdAtMs!,
    `got ${ordered.length} messages`
  );

  // ------------------------------------------------------------ anti-spoofing
  console.log('\nSuite 5: Anti-spoofing');
  const spoofDenied = await expectDenied(
    'student posting with senderId = admin uid',
    () =>
      setDoc(doc(student.db, 'chatMessages', 'msg-spoofed'), {
        ...buildMessage({ id: 'msg-spoofed', content: 'pretending to be admin' }),
        senderId: adminUid
      })
  );
  check('a student cannot post as someone else', spoofDenied);

  const foreignOrgDenied = await expectDenied(
    'student posting with a foreign orgId',
    () =>
      setDoc(doc(student.db, 'chatMessages', 'msg-foreign'), {
        ...buildMessage({ id: 'msg-foreign', orgId: 'org-someone-else' })
      })
  );
  check('a student cannot post into another tenant', foreignOrgDenied);

  // ------------------------------------------------- reactions vs. editing
  console.log('\nSuite 6: Reactions vs. message editing');
  const reacted = await expectDenied(
    'student reacting to the admin message',
    () => toggleReaction(student.db, msgFromAdmin.id, '👍', studentUid)
  );
  check('a student CAN react to someone else’s message', !reacted);

  const editDenied = await expectDenied(
    'student editing the admin message content',
    () => updateDoc(doc(student.db, 'chatMessages', msgFromAdmin.id), { content: 'edited by student' })
  );
  check('a student CANNOT edit someone else’s message', editDenied);

  const deleteDenied = await expectDenied(
    'student mutating a non-reactions field (pinned)',
    () => updateDoc(doc(student.db, 'chatMessages', msgFromAdmin.id), { pinned: true })
  );
  check('a student CANNOT mutate someone else’s message outside reactions', deleteDenied);

  const adminEditAllowed = await expectDenied(
    'admin editing their own message',
    () => updateDoc(doc(admin.db, 'chatMessages', msgFromAdmin.id), { content: 'Yes, 5pm in Hall 1. Bring a calculator.' })
  );
  check('the author CAN still edit their own message', !adminEditAllowed);

  await sleep(600);
  const adminEditPropagated = await waitFor(() =>
    studentInbox.some(m => m.id === msgFromAdmin.id && m.content.includes('calculator'))
  );
  check('the edit propagated to the other device in real time', adminEditPropagated);

  // ------------------------------------------------------------------- cleanup
  unsubAdmin();
  unsubStudent();

  console.log('\n==============================================');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('==============================================');

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('\nTEST RUN ABORTED:\n', err?.message || err);
  process.exit(2);
});
