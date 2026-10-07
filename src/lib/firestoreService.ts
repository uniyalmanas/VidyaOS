import {
  auth,
  db,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  writeBatch,
  runTransaction,
  handleFirestoreError,
  OperationType,
  cleanFirestoreData
} from './firebase';
import {
  Organization,
  User,
  Student,
  Batch,
  Teacher,
  FeeInvoice,
  PaymentSubmission,
  PaymentRecord,
  AttendanceRecord,
  Exam,
  ExamResult,
  Assignment,
  StudyMaterial,
  Announcement,
  ChatChannel,
  ChatMessage,
  AuditLogEntry,
  Inquiry
} from '../types';
import {
  MOCK_ORGANIZATIONS,
  MOCK_USERS,
  MOCK_STUDENTS,
  MOCK_BATCHES,
  MOCK_TEACHERS,
  MOCK_INVOICES,
  MOCK_ATTENDANCE,
  MOCK_EXAMS,
  MOCK_EXAM_RESULTS,
  MOCK_ASSIGNMENTS,
  MOCK_STUDY_MATERIALS,
  MOCK_ANNOUNCEMENTS,
  MOCK_AUDIT_LOGS,
  MOCK_INQUIRIES
} from '../data/mockData';

function developmentFallback<T extends object>(items: T[], orgId?: string): T[] {
  if (!import.meta.env.DEV) return [];
  if (!orgId) return items;
  return items.filter((item): item is T & { orgId: string } =>
    'orgId' in item && item.orgId === orgId
  );
}

function isExpectedFirestoreFallbackError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /permission|permissions|denied|unauthenticated|insufficient|offline|unavailable|network/i.test(message);
}

function logListenerFallback(scope: string, error: unknown) {
  if (import.meta.env.DEV && !isExpectedFirestoreFallbackError(error)) {
    console.warn(`${scope} listener notice:`, error);
  }
}

function shouldUseMockFallbackOnly(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    const stored = localStorage.getItem('vidyaos_auth_session');
    if (!stored) return false;
    const session = JSON.parse(stored);
    return !!session?.user && session.loginMethod === 'demo_preset' && !auth.currentUser;
  } catch (_error) {
    return false;
  }
}

function readDeletedIds(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === 'string' && value.length > 0));
  } catch {
    return new Set();
  }
}

function filterDeletedItems<T extends { id: string }>(items: T[], storageKey: string): T[] {
  const deleted = readDeletedIds(storageKey);
  if (deleted.size === 0) return items;
  return items.filter(item => !deleted.has(item.id));
}

// Track if initial seeding has already been attempted in this session
let isSeedingInProgress = false;
let seedingAlreadyCompleted = false;

/**
 * Initializes Firestore collections with baseline coaching data once in development if empty.
 */
export async function seedInitialFirestoreDataIfEmpty() {
  if (!import.meta.env.DEV || isSeedingInProgress || seedingAlreadyCompleted || !auth.currentUser) return;
  isSeedingInProgress = true;

  try {
    const orgsSnap = await getDocs(query(collection(db, 'organizations'), limit(1)));
    if (orgsSnap.empty) {
      console.log('Seeding initial coaching & education center data to Firestore via atomic batches...');

      const batch = writeBatch(db);

      // Seed Organizations
      for (const org of MOCK_ORGANIZATIONS) {
        batch.set(doc(db, 'organizations', org.id), org);
      }

      // Seed Users without passwords in public collections
      for (const user of MOCK_USERS) {
        const safeUser = { ...user } as any;
        delete safeUser.password;
        batch.set(doc(db, 'users', user.id), safeUser);
      }

      // Seed Batches
      for (const b of MOCK_BATCHES) {
        batch.set(doc(db, 'batches', b.id), b);
      }

      // Seed Teachers
      for (const teacher of MOCK_TEACHERS) {
        batch.set(doc(db, 'teachers', teacher.id), teacher);
      }

      await batch.commit();

      // Seed second batch for students and invoices
      const batch2 = writeBatch(db);
      for (const stud of MOCK_STUDENTS) {
        batch2.set(doc(db, 'students', stud.id), stud);
      }
      for (const inv of MOCK_INVOICES) {
        batch2.set(doc(db, 'invoices', inv.id), inv);
      }
      for (const att of MOCK_ATTENDANCE) {
        batch2.set(doc(db, 'attendance', att.id), att);
      }
      for (const exam of MOCK_EXAMS) {
        batch2.set(doc(db, 'exams', exam.id), exam);
      }
      for (const res of MOCK_EXAM_RESULTS) {
        batch2.set(doc(db, 'examResults', res.id), res);
      }
      for (const ann of MOCK_ANNOUNCEMENTS) {
        batch2.set(doc(db, 'announcements', ann.id), ann);
      }
      await batch2.commit();

      console.log('Initial Firestore seeding completed successfully with zero credentials leaks.');
    }
    seedingAlreadyCompleted = true;
  } catch (error) {
    console.warn('Firestore seeding skipped or restricted by rules/offline:', error);
  } finally {
    isSeedingInProgress = false;
  }
}

// ----------------------------------------------------
// REAL-TIME SCOPED LISTENERS (Bounded reads & query performance)
// ----------------------------------------------------

export function subscribeToOrganizations(
  onData: (orgs: Organization[]) => void,
  orgId?: string,
  isPlatformOwner = false
) {
  try {
    if (shouldUseMockFallbackOnly()) {
      onData(developmentFallback(MOCK_ORGANIZATIONS, orgId));
      return () => {};
    }
    if (isPlatformOwner) {
      return onSnapshot(
        query(collection(db, 'organizations'), limit(50)),
        snapshot => onData(snapshot.docs.map(document => document.data() as Organization)),
        error => {
          logListenerFallback('Real-time organizations', error);
          onData(developmentFallback(MOCK_ORGANIZATIONS));
        }
      );
    }
    if (!orgId) {
      onData(developmentFallback(MOCK_ORGANIZATIONS));
      return () => {};
    }
    return onSnapshot(
      doc(db, 'organizations', orgId),
      (snapshot) => {
        onData(snapshot.exists()
          ? [snapshot.data() as Organization]
          : developmentFallback(MOCK_ORGANIZATIONS, orgId));
        if (!snapshot.exists() && import.meta.env.DEV) seedInitialFirestoreDataIfEmpty();
      },
      (error) => {
        logListenerFallback('Real-time organizations', error);
        onData(developmentFallback(MOCK_ORGANIZATIONS, orgId));
      }
    );
  } catch (e) {
    if (import.meta.env.DEV) console.error('Could not start organizations listener:', e);
    onData(developmentFallback(MOCK_ORGANIZATIONS, orgId));
    return () => {};
  }
}

export function subscribeToUsers(onData: (users: User[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = developmentFallback(MOCK_USERS, orgId);
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(collection(db, 'users'), where('orgId', '==', orgId), limit(100))
      : query(collection(db, 'users'), limit(100));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as User);
          onData(list);
        } else {
          const fallback = developmentFallback(MOCK_USERS, orgId);
          onData(fallback);
        }
      },
      (error) => {
        logListenerFallback('Real-time users', error);
        const fallback = developmentFallback(MOCK_USERS, orgId);
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_USERS, orgId);
    if (import.meta.env.DEV) console.error('Could not start users listener:', e);
    onData(fallback);
    return () => {};
  }
}

export function subscribeToStudents(onData: (students: Student[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = filterDeletedItems(developmentFallback(MOCK_STUDENTS, orgId), 'vidyaos_deleted_student_ids');
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(collection(db, 'students'), where('orgId', '==', orgId), limit(250))
      : query(collection(db, 'students'), limit(250));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = filterDeletedItems(snapshot.docs.map(d => d.data() as Student), 'vidyaos_deleted_student_ids');
          onData(list);
        } else {
          const fallback = filterDeletedItems(developmentFallback(MOCK_STUDENTS, orgId), 'vidyaos_deleted_student_ids');
          onData(fallback);
        }
      },
      (error) => {
        logListenerFallback('Real-time students', error);
        const fallback = filterDeletedItems(developmentFallback(MOCK_STUDENTS, orgId), 'vidyaos_deleted_student_ids');
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_STUDENTS, orgId);
    if (import.meta.env.DEV) console.error('Could not start students listener:', e);
    onData(fallback);
    return () => {};
  }
}

export function subscribeToBatches(onData: (batches: Batch[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = filterDeletedItems(developmentFallback(MOCK_BATCHES, orgId), 'vidyaos_deleted_batch_ids');
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(collection(db, 'batches'), where('orgId', '==', orgId), limit(100))
      : query(collection(db, 'batches'), limit(100));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = filterDeletedItems(snapshot.docs.map(d => d.data() as Batch), 'vidyaos_deleted_batch_ids');
          onData(list);
        } else {
          const fallback = filterDeletedItems(developmentFallback(MOCK_BATCHES, orgId), 'vidyaos_deleted_batch_ids');
          onData(fallback);
        }
      },
      (error) => {
        logListenerFallback('Real-time batches', error);
        const fallback = filterDeletedItems(developmentFallback(MOCK_BATCHES, orgId), 'vidyaos_deleted_batch_ids');
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_BATCHES, orgId);
    if (import.meta.env.DEV) console.error('Could not start batches listener:', e);
    onData(fallback);
    return () => {};
  }
}

export function subscribeToTeachers(onData: (teachers: Teacher[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = developmentFallback(MOCK_TEACHERS, orgId);
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(collection(db, 'teachers'), where('orgId', '==', orgId), limit(100))
      : query(collection(db, 'teachers'), limit(100));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as Teacher);
          onData(list);
        } else {
          const fallback = developmentFallback(MOCK_TEACHERS, orgId);
          onData(fallback);
        }
      },
      (error) => {
        logListenerFallback('Real-time teachers', error);
        const fallback = developmentFallback(MOCK_TEACHERS, orgId);
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_TEACHERS, orgId);
    if (import.meta.env.DEV) console.error('Could not start teachers listener:', e);
    onData(fallback);
    return () => {};
  }
}

export function subscribeToInvoices(onData: (invoices: FeeInvoice[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = developmentFallback(MOCK_INVOICES, orgId);
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(collection(db, 'invoices'), where('orgId', '==', orgId), limit(250))
      : query(collection(db, 'invoices'), limit(250));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as FeeInvoice);
          onData(list);
        } else {
          const fallback = developmentFallback(MOCK_INVOICES, orgId);
          onData(fallback);
        }

      },
      (error) => {
        logListenerFallback('Real-time invoices', error);
        const fallback = developmentFallback(MOCK_INVOICES, orgId);
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_INVOICES, orgId);
    if (import.meta.env.DEV) console.error('Could not start invoices listener:', e);
    onData(fallback);
    return () => {};
  }
}

export function subscribeToPaymentSubmissions(
  onData: (submissions: PaymentSubmission[]) => void,
  orgId: string
) {
  try {
    if (shouldUseMockFallbackOnly()) {
      onData([]);
      return () => {};
    }
    const targetRef = query(
      collection(db, 'paymentSubmissions'),
      where('orgId', '==', orgId),
      limit(250)
    );
    return onSnapshot(
      targetRef,
      snapshot => onData(snapshot.docs.map(document => document.data() as PaymentSubmission)),
      error => {
        logListenerFallback('Payment submissions', error);
        onData([]);
      }
    );
  } catch (error) {
    if (import.meta.env.DEV) console.error('Could not start payment submissions listener:', error);
    onData([]);
    return () => {};
  }
}

export function subscribeToAttendance(onData: (records: AttendanceRecord[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = developmentFallback(MOCK_ATTENDANCE, orgId);
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(collection(db, 'attendance'), where('orgId', '==', orgId), limit(500))
      : query(collection(db, 'attendance'), limit(500));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as AttendanceRecord);
          onData(list);
        } else {
          const fallback = developmentFallback(MOCK_ATTENDANCE, orgId);
          onData(fallback);
        }
      },
      (error) => {
        logListenerFallback('Real-time attendance', error);
        const fallback = developmentFallback(MOCK_ATTENDANCE, orgId);
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_ATTENDANCE, orgId);
    if (import.meta.env.DEV) console.error('Could not start attendance listener:', e);
    onData(fallback);
    return () => {};
  }
}

export function subscribeToExams(onData: (exams: Exam[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = developmentFallback(MOCK_EXAMS, orgId);
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(collection(db, 'exams'), where('orgId', '==', orgId), limit(100))
      : query(collection(db, 'exams'), limit(100));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as Exam);
          onData(list);
        } else {
          const fallback = developmentFallback(MOCK_EXAMS, orgId);
          onData(fallback);
        }
      },
      (error) => {
        logListenerFallback('Real-time exams', error);
        const fallback = developmentFallback(MOCK_EXAMS, orgId);
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_EXAMS, orgId);
    if (import.meta.env.DEV) console.error('Could not start exams listener:', e);
    onData(fallback);
    return () => {};
  }
}

export function subscribeToAnnouncements(onData: (announcements: Announcement[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = developmentFallback(MOCK_ANNOUNCEMENTS, orgId);
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(collection(db, 'announcements'), where('orgId', '==', orgId), limit(100))
      : query(collection(db, 'announcements'), limit(100));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as Announcement);
          onData(list);
        } else {
          const fallback = developmentFallback(MOCK_ANNOUNCEMENTS, orgId);
          onData(fallback);
        }
      },
      (error) => {
        logListenerFallback('Real-time announcements', error);
        const fallback = developmentFallback(MOCK_ANNOUNCEMENTS, orgId);
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_ANNOUNCEMENTS, orgId);
    if (import.meta.env.DEV) console.error('Could not start announcements listener:', e);
    onData(fallback);
    return () => {};
  }
}

export function subscribeToStudyMaterials(onData: (materials: StudyMaterial[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = developmentFallback(MOCK_STUDY_MATERIALS, orgId);
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(collection(db, 'studyMaterials'), where('orgId', '==', orgId), limit(150))
      : query(collection(db, 'studyMaterials'), limit(150));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as StudyMaterial);
          onData(list);
        } else {
          const fallback = developmentFallback(MOCK_STUDY_MATERIALS, orgId);
          onData(fallback);
        }
      },
      (error) => {
        logListenerFallback('Real-time study materials', error);
        const fallback = developmentFallback(MOCK_STUDY_MATERIALS, orgId);
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_STUDY_MATERIALS, orgId);
    if (import.meta.env.DEV) console.error('Could not start study materials listener:', e);
    onData(fallback);
    return () => {};
  }
}

// ----------------------------------------------------
// AUDIT LOG (F1) — append-only change history
// ----------------------------------------------------

/**
 * Newest-first off the wire (requires the auditLogs composite index declared in
 * `firestore.indexes.json`), reversed below so the UI receives chronological
 * order — the exact pattern used by `subscribeToChatMessages`.
 */
export function subscribeToAuditLogs(onData: (entries: AuditLogEntry[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = developmentFallback(MOCK_AUDIT_LOGS, orgId);
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(
          collection(db, 'auditLogs'),
          where('orgId', '==', orgId),
          orderBy('createdAtMs', 'desc'),
          limit(1000)
        )
      : query(collection(db, 'auditLogs'), orderBy('createdAtMs', 'desc'), limit(1000));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          onData(snapshot.docs.map(d => d.data() as AuditLogEntry).reverse());
        } else {
          onData(developmentFallback(MOCK_AUDIT_LOGS, orgId));
        }
      },
      (error) => {
        logListenerFallback('Real-time audit logs', error);
        onData(developmentFallback(MOCK_AUDIT_LOGS, orgId));
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_AUDIT_LOGS, orgId);
    if (import.meta.env.DEV) console.error('Could not start audit logs listener:', e);
    onData(fallback);
    return () => {};
  }
}

/**
 * Best-effort append-only audit write. A failed audit frame must NEVER take
 * down the primary mutation that triggered it, so unlike most persist helpers
 * this never throws — it degrades to a console warning.
 */
export async function persistAuditLogToFirestore(entry: AuditLogEntry): Promise<void> {
  try {
    await setDoc(doc(db, 'auditLogs', entry.id), cleanFirestoreData(entry));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`Audit entry kept locally only (${entry.id}):`, error);
    } else {
      console.warn(`Audit log write failed (${entry.id}).`);
    }
  }
}

// ----------------------------------------------------
// INQUIRIES / LEADS (F2) — admission pipeline CRM
// ----------------------------------------------------

/**
 * Newest-first off the wire (requires the `inquiries` composite index declared
 * in `firestore.indexes.json`), reversed so the UI receives chronological order
 * — the same pattern as `subscribeToChatMessages` / `subscribeToAuditLogs`.
 */
export function subscribeToInquiries(onData: (inquiries: Inquiry[]) => void, orgId?: string) {
  try {
    if (shouldUseMockFallbackOnly()) {
      const fallback = developmentFallback(MOCK_INQUIRIES, orgId);
      onData(fallback);
      return () => {};
    }
    const targetRef = orgId
      ? query(
          collection(db, 'inquiries'),
          where('orgId', '==', orgId),
          orderBy('createdAtMs', 'desc'),
          limit(500)
        )
      : query(collection(db, 'inquiries'), orderBy('createdAtMs', 'desc'), limit(500));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          onData(snapshot.docs.map(d => d.data() as Inquiry).reverse());
        } else {
          onData(developmentFallback(MOCK_INQUIRIES, orgId));
        }
      },
      (error) => {
        logListenerFallback('Real-time inquiries', error);
        onData(developmentFallback(MOCK_INQUIRIES, orgId));
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_INQUIRIES, orgId);
    if (import.meta.env.DEV) console.error('Could not start inquiries listener:', e);
    onData(fallback);
    return () => {};
  }
}

export async function persistInquiryToFirestore(inquiry: Inquiry): Promise<void> {
  try {
    await setDoc(doc(db, 'inquiries', inquiry.id), cleanFirestoreData(inquiry));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `inquiries/${inquiry.id}`);
  }
}

export async function deleteInquiryFromFirestore(inquiryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'inquiries', inquiryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `inquiries/${inquiryId}`);
  }
}

// ----------------------------------------------------
// ATOMIC FIRESTORE MUTATIONS & CONSISTENCY (writeBatch & runTransaction)
// ----------------------------------------------------

/**
 * Atomically enrolls a student and updates the associated batch document's studentIds array.
 */
export async function persistStudentWithBatchAtomically(
  student: Student,
  batchesToUpdate: Batch[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'students', student.id), student);

    for (const b of batchesToUpdate) {
      batch.set(doc(db, 'batches', b.id), b);
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${student.id}`);
  }
}

/**
 * Atomically deletes a student and removes student ID from all batch rosters.
 */
export async function deleteStudentAtomically(
  studentId: string,
  batchesToClean: Batch[],
  userId?: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'students', studentId));

    for (const b of batchesToClean) {
      const cleanedIds = b.studentIds.filter(id => id !== studentId);
      batch.set(doc(db, 'batches', b.id), { ...b, studentIds: cleanedIds });
    }

    if (userId) {
      batch.set(doc(db, 'users', userId), {
        status: 'vacated',
        vacatedAt: new Date().toISOString(),
        orgId: ''
      }, { merge: true });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
  }
}

/**
 * Atomically records a payment and updates the invoice paidAmount and status.
 */
export async function recordPaymentAtomically(
  invoiceId: string,
  payment: PaymentRecord
): Promise<FeeInvoice> {
  try {
    return await runTransaction(db, async transaction => {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceSnapshot = await transaction.get(invoiceRef);
      if (!invoiceSnapshot.exists()) {
        throw new Error('Invoice not found.');
      }
      const invoice = invoiceSnapshot.data() as FeeInvoice;
      const balance = invoice.netAmount - invoice.paidAmount;
      if (!Number.isFinite(payment.amount) || payment.amount <= 0 || payment.amount > balance) {
        throw new Error('Payment amount exceeds the current invoice balance.');
      }
      const normalizedReference = payment.transactionRef.trim().toLowerCase();
      if (invoice.payments?.some(existing => existing.transactionRef.trim().toLowerCase() === normalizedReference)) {
        throw new Error('This payment reference has already been recorded.');
      }
      const paidAmount = invoice.paidAmount + payment.amount;
      const updatedInvoice: FeeInvoice = {
        ...invoice,
        paidAmount,
        status: paidAmount >= invoice.netAmount ? 'paid' : 'partially_paid',
        payments: [...(invoice.payments || []), payment]
      };
      transaction.set(invoiceRef, cleanFirestoreData(updatedInvoice));
      return updatedInvoice;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `invoices/${invoiceId}`);
  }
}

export async function createPaymentSubmission(submission: PaymentSubmission): Promise<void> {
    try {
      await setDoc(
        doc(db, 'paymentSubmissions', submission.id),
        cleanFirestoreData(submission)
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `paymentSubmissions/${submission.id}`);
    }
  }

export async function verifyPaymentSubmission(
    submissionId: string,
    reviewerId: string,
    reviewerName: string
  ): Promise<FeeInvoice> {
    try {
      return await runTransaction(db, async transaction => {
        const submissionRef = doc(db, 'paymentSubmissions', submissionId);
        const submissionSnapshot = await transaction.get(submissionRef);
        if (!submissionSnapshot.exists()) {
          throw new Error('Payment submission was not found.');
        }

        const submission = submissionSnapshot.data() as PaymentSubmission;
        if (submission.status !== 'pending_verification') {
          throw new Error('This payment submission has already been reviewed.');
        }

        const invoiceRef = doc(db, 'invoices', submission.invoiceId);
        const invoiceSnapshot = await transaction.get(invoiceRef);
        if (!invoiceSnapshot.exists()) {
          throw new Error('The invoice for this payment could not be found.');
        }

        const invoice = invoiceSnapshot.data() as FeeInvoice;
        const existingPayments = invoice.payments || [];
        const normalizedReference = submission.transactionRef.trim().toLowerCase();
        if (existingPayments.some(payment => payment.transactionRef.trim().toLowerCase() === normalizedReference)) {
          throw new Error('This UPI reference has already been recorded on the invoice.');
        }

        const balance = invoice.netAmount - invoice.paidAmount;
        if (!Number.isFinite(submission.amount) || submission.amount <= 0 || submission.amount > balance) {
          throw new Error('The submitted amount exceeds the current invoice balance.');
        }

        const verifiedAt = new Date().toISOString();
        const payment: PaymentRecord = {
          id: submission.id,
          invoiceId: invoice.id,
          amount: submission.amount,
          paymentDate: verifiedAt.slice(0, 10),
          paymentMethod: 'UPI',
          transactionRef: submission.transactionRef,
          receivedBy: reviewerName,
          receiptNo: `REC-${Date.now()}-${submission.id.slice(-6)}`,
          upiApp: submission.upiApp,
          status: 'verified',
          verifiedBy: reviewerName,
          verifiedAt
        };
        const paidAmount = invoice.paidAmount + submission.amount;
        const updatedInvoice: FeeInvoice = {
          ...invoice,
          paidAmount,
          status: paidAmount >= invoice.netAmount ? 'paid' : 'partially_paid',
          payments: [...existingPayments, payment]
        };

        transaction.set(invoiceRef, cleanFirestoreData(updatedInvoice));
        transaction.update(submissionRef, {
          status: 'verified',
          reviewedBy: reviewerId,
          reviewedAt: verifiedAt
        });
        return updatedInvoice;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `paymentSubmissions/${submissionId}`);
    }
  }

export async function rejectPaymentSubmission(
    submissionId: string,
    reviewerId: string,
    reason: string
  ): Promise<void> {
    try {
      await runTransaction(db, async transaction => {
        const submissionRef = doc(db, 'paymentSubmissions', submissionId);
        const submissionSnapshot = await transaction.get(submissionRef);
        if (!submissionSnapshot.exists()) {
          throw new Error('Payment submission was not found.');
        }
        const submission = submissionSnapshot.data() as PaymentSubmission;
        if (submission.status !== 'pending_verification') {
          throw new Error('This payment submission has already been reviewed.');
        }
        transaction.update(submissionRef, {
          status: 'rejected',
          reviewedBy: reviewerId,
          reviewedAt: new Date().toISOString(),
          rejectionReason: reason.trim().slice(0, 200) || 'Payment could not be verified.'
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `paymentSubmissions/${submissionId}`);
  }
}

export async function persistStudentToFirestore(student: Student): Promise<void> {
  try {
    await setDoc(doc(db, 'students', student.id), cleanFirestoreData(student));
  } catch (error) {
    console.warn(`Firestore student update notice (${student.id}):`, error);
  }
}

export async function deleteStudentFromFirestore(studentId: string, userId?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
  }
  if (userId) {
    try {
      await setDoc(doc(db, 'users', userId), {
        status: 'vacated',
        vacatedAt: new Date().toISOString(),
        orgId: ''
      }, { merge: true });
    } catch (e) {
      console.warn(`Firestore student user profile vacate notice (${userId}):`, e);
    }
  }
}

export async function persistBatchToFirestore(batch: Batch): Promise<void> {
  try {
    await setDoc(doc(db, 'batches', batch.id), cleanFirestoreData(batch));
  } catch (error) {
    console.warn(`Firestore batch update notice (${batch.id}):`, error);
  }
}

export async function persistTeacherToFirestore(teacher: Teacher): Promise<void> {
  try {
    const safeTeacher = { ...teacher } as any;
    delete safeTeacher.password;
    await setDoc(doc(db, 'teachers', teacher.id), cleanFirestoreData(safeTeacher));
  } catch (error) {
    console.warn(`Firestore teacher update notice (${teacher.id}):`, error);
  }
}

export async function deleteTeacherFromFirestore(teacherId: string, userId?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'teachers', teacherId));
  } catch (error) {
    console.warn(`Firestore teacher delete notice (${teacherId}):`, error);
  }
  if (userId) {
    try {
      await setDoc(doc(db, 'users', userId), {
        status: 'vacated',
        vacatedAt: new Date().toISOString(),
        orgId: ''
      }, { merge: true });
    } catch (e) {
      console.warn(`Firestore user profile vacate notice (${userId}):`, e);
    }
  }
}

export async function deleteBatchFromFirestore(batchId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'batches', batchId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `batches/${batchId}`);
  }
}

export async function persistInvoiceToFirestore(invoice: FeeInvoice): Promise<void> {
  try {
    await setDoc(doc(db, 'invoices', invoice.id), invoice);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `invoices/${invoice.id}`);
  }
}

export async function deleteInvoiceFromFirestore(invoiceId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'invoices', invoiceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `invoices/${invoiceId}`);
  }
}

export async function persistAttendanceToFirestore(record: AttendanceRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'attendance', record.id), record);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `attendance/${record.id}`);
  }
}

export async function deleteAttendanceFromFirestore(attId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'attendance', attId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attendance/${attId}`);
  }
}

export async function persistExamToFirestore(exam: Exam): Promise<void> {
  try {
    await setDoc(doc(db, 'exams', exam.id), exam);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `exams/${exam.id}`);
  }
}

export async function deleteExamFromFirestore(examId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'exams', examId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `exams/${examId}`);
  }
}

export function subscribeToExamResults(onData: (results: ExamResult[]) => void, orgId?: string) {
  try {
    const targetRef = orgId
      ? query(collection(db, 'examResults'), where('orgId', '==', orgId), limit(500))
      : query(collection(db, 'examResults'), limit(500));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as ExamResult);
          onData(list);
        } else {
          onData(developmentFallback(MOCK_EXAM_RESULTS, orgId));
        }
      },
      (error) => {
        logListenerFallback('Real-time exam results', error);
        onData(developmentFallback(MOCK_EXAM_RESULTS, orgId));
      }
    );
  } catch (e) {
    if (import.meta.env.DEV) console.error('Could not start exam results listener:', e);
    onData(developmentFallback(MOCK_EXAM_RESULTS, orgId));
    return () => {};
  }
}

export async function persistExamResultsToFirestore(examId: string, results: ExamResult[], orgId?: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const r of results) {
      const recordWithOrg = orgId ? { ...r, orgId } : r;
      batch.set(doc(db, 'examResults', r.id), recordWithOrg);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `examResults/${examId}`);
  }
}

export function subscribeToAssignments(onData: (assignments: Assignment[]) => void, orgId?: string) {
  try {
    const targetRef = orgId
      ? query(collection(db, 'assignments'), where('orgId', '==', orgId), limit(150))
      : query(collection(db, 'assignments'), limit(150));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as Assignment);
          onData(list);
        } else {
          const fallback = developmentFallback(MOCK_ASSIGNMENTS, orgId);
          onData(fallback);
        }
      },
      (error) => {
        logListenerFallback('Real-time assignments', error);
        const fallback = developmentFallback(MOCK_ASSIGNMENTS, orgId);
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = developmentFallback(MOCK_ASSIGNMENTS, orgId);
    if (import.meta.env.DEV) console.error('Could not start assignments listener:', e);
    onData(fallback);
    return () => {};
  }
}

export async function persistAssignmentToFirestore(assign: Assignment): Promise<void> {
  try {
    await setDoc(doc(db, 'assignments', assign.id), assign);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `assignments/${assign.id}`);
  }
}

export async function deleteAssignmentFromFirestore(assignId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'assignments', assignId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `assignments/${assignId}`);
  }
}

export async function persistOrganizationToFirestore(org: Organization): Promise<void> {
  try {
    await setDoc(doc(db, 'organizations', org.id), org);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `organizations/${org.id}`);
  }
}

export async function persistUserRoleToFirestore(user: User): Promise<void> {
  try {
    const safeUser = { ...user } as any;
    delete safeUser.password;
    await setDoc(doc(db, 'users', user.id), safeUser, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
}

export async function persistAnnouncementToFirestore(announcement: Announcement): Promise<void> {
  try {
    await setDoc(doc(db, 'announcements', announcement.id), announcement);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `announcements/${announcement.id}`);
  }
}

export async function deleteAnnouncementFromFirestore(annId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'announcements', annId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `announcements/${annId}`);
  }
}

export async function persistStudyMaterialToFirestore(mat: StudyMaterial): Promise<void> {
  try {
    await setDoc(doc(db, 'studyMaterials', mat.id), mat);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `studyMaterials/${mat.id}`);
  }
}

export async function deleteStudyMaterialFromFirestore(matId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'studyMaterials', matId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `studyMaterials/${matId}`);
  }
}

// ---------------------------------------------------------------------------
// CHAT CHANNELS & MESSAGES (VIDYACHAT) — real-time cloud sync
//
// Chat previously lived ONLY in localStorage, which is per-browser: a message a
// student sent could never reach a teacher's device. Firestore is now the single
// source of truth. `fallback` exists purely so the DEV demo personas still have
// something to render when the cloud collection is empty.
// ---------------------------------------------------------------------------

/** Chat is dev-only-mock: never leak mock channels/messages into production. */
function chatFallback<T>(items: T[]): T[] {
  return import.meta.env.DEV ? items : [];
}

export function subscribeToChatChannels(
  onData: (channels: ChatChannel[]) => void,
  orgId?: string,
  fallback: ChatChannel[] = []
) {
  try {
    if (shouldUseMockFallbackOnly()) {
      onData(chatFallback(fallback));
      return () => {};
    }
    const targetRef = orgId
      ? query(collection(db, 'chatChannels'), where('orgId', '==', orgId), limit(100))
      : query(collection(db, 'chatChannels'), limit(100));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          onData(snapshot.docs.map(d => d.data() as ChatChannel));
        } else {
          onData(chatFallback(fallback));
        }
      },
      (error) => {
        logListenerFallback('Real-time chat channels', error);
        onData(chatFallback(fallback));
      }
    );
  } catch (e) {
    if (import.meta.env.DEV) console.error('Could not start chat channel listener:', e);
    onData(chatFallback(fallback));
    return () => {};
  }
}

export function subscribeToChatMessages(
  onData: (messages: ChatMessage[]) => void,
  orgId?: string,
  fallback: ChatMessage[] = []
) {
  try {
    if (shouldUseMockFallbackOnly()) {
      onData(chatFallback(fallback));
      return () => {};
    }
    // Newest-first off the wire (requires the chatMessages composite index),
    // reversed below so the UI receives chronological order.
    const targetRef = orgId
      ? query(
          collection(db, 'chatMessages'),
          where('orgId', '==', orgId),
          orderBy('createdAtMs', 'desc'),
          limit(200)
        )
      : query(collection(db, 'chatMessages'), orderBy('createdAtMs', 'desc'), limit(200));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          onData(snapshot.docs.map(d => d.data() as ChatMessage).reverse());
        } else {
          onData(chatFallback(fallback));
        }
      },
      (error) => {
        logListenerFallback('Real-time chat messages', error);
        onData(chatFallback(fallback));
      }
    );
  } catch (e) {
    if (import.meta.env.DEV) console.error('Could not start chat message listener:', e);
    onData(chatFallback(fallback));
    return () => {};
  }
}

export async function persistChatMessageToFirestore(message: ChatMessage): Promise<void> {
  try {
    await setDoc(
      doc(db, 'chatMessages', message.id),
      cleanFirestoreData(message)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chatMessages/${message.id}`);
  }
}

export async function persistChatChannelToFirestore(channel: ChatChannel): Promise<void> {
  try {
    await setDoc(
      doc(db, 'chatChannels', channel.id),
      cleanFirestoreData(channel),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chatChannels/${channel.id}`);
  }
}

export async function deleteChatChannelFromFirestore(channelId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'chatChannels', channelId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `chatChannels/${channelId}`);
  }
}

/**
 * Toggle a reaction. Runs in a transaction so two people reacting to the same
 * message at the same time don't clobber each other's entries, and so the emoji
 * key never has to be interpolated into a field path.
 */
export async function toggleChatReactionFirestore(
  messageId: string,
  emoji: string,
  userIdentifier: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'chatMessages', messageId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(messageRef);
      if (!snap.exists()) return;
      const data = snap.data() as ChatMessage;
      const reactions: { [emoji: string]: string[] } = { ...(data.reactions || {}) };
      const users = reactions[emoji] || [];
      const next = users.includes(userIdentifier)
        ? users.filter(u => u !== userIdentifier)
        : [...users, userIdentifier];
      if (next.length > 0) {
        reactions[emoji] = next;
      } else {
        delete reactions[emoji];
      }
      tx.update(messageRef, { reactions });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chatMessages/${messageId}`);
  }
}
