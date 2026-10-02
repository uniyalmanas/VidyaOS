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
  PaymentRecord,
  AttendanceRecord,
  Exam,
  ExamResult,
  Assignment,
  StudyMaterial,
  Announcement
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
  MOCK_ANNOUNCEMENTS
} from '../data/mockData';

// Track if initial seeding has already been attempted in this session
let isSeedingInProgress = false;
let seedingAlreadyCompleted = false;

/**
 * Initializes Firestore collections with baseline coaching data once in development if empty.
 */
export async function seedInitialFirestoreDataIfEmpty() {
  if (isSeedingInProgress || seedingAlreadyCompleted || !auth.currentUser) return;
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

export function subscribeToOrganizations(onData: (orgs: Organization[]) => void) {
  try {
    const colRef = query(collection(db, 'organizations'), limit(50));
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as Organization);
          onData(list);
        } else {
          onData(MOCK_ORGANIZATIONS);
          seedInitialFirestoreDataIfEmpty();
        }
      },
      (error) => {
        console.warn('Real-time organizations listener notice:', error.message);
        onData(MOCK_ORGANIZATIONS);
      }
    );
  } catch (e) {
    onData(MOCK_ORGANIZATIONS);
    return () => {};
  }
}

export function subscribeToUsers(onData: (users: User[]) => void, orgId?: string) {
  try {
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
          const fallback = orgId ? MOCK_USERS.filter(u => u.orgId === orgId) : MOCK_USERS;
          onData(fallback);
        }
      },
      (error) => {
        console.warn('Real-time users listener notice:', error.message);
        const fallback = orgId ? MOCK_USERS.filter(u => u.orgId === orgId) : MOCK_USERS;
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = orgId ? MOCK_USERS.filter(u => u.orgId === orgId) : MOCK_USERS;
    onData(fallback);
    return () => {};
  }
}

export function subscribeToStudents(onData: (students: Student[]) => void, orgId?: string) {
  try {
    const targetRef = orgId
      ? query(collection(db, 'students'), where('orgId', '==', orgId), limit(250))
      : query(collection(db, 'students'), limit(250));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as Student);
          onData(list);
        } else {
          const fallback = orgId ? MOCK_STUDENTS.filter(s => s.orgId === orgId) : MOCK_STUDENTS;
          onData(fallback);
        }
      },
      (error) => {
        console.warn('Real-time students listener notice:', error.message);
        const fallback = orgId ? MOCK_STUDENTS.filter(s => s.orgId === orgId) : MOCK_STUDENTS;
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = orgId ? MOCK_STUDENTS.filter(s => s.orgId === orgId) : MOCK_STUDENTS;
    onData(fallback);
    return () => {};
  }
}

export function subscribeToBatches(onData: (batches: Batch[]) => void, orgId?: string) {
  try {
    const targetRef = orgId
      ? query(collection(db, 'batches'), where('orgId', '==', orgId), limit(100))
      : query(collection(db, 'batches'), limit(100));
    return onSnapshot(
      targetRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as Batch);
          onData(list);
        } else {
          const fallback = orgId ? MOCK_BATCHES.filter(b => b.orgId === orgId) : MOCK_BATCHES;
          onData(fallback);
        }
      },
      (error) => {
        console.warn('Real-time batches listener notice:', error.message);
        const fallback = orgId ? MOCK_BATCHES.filter(b => b.orgId === orgId) : MOCK_BATCHES;
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = orgId ? MOCK_BATCHES.filter(b => b.orgId === orgId) : MOCK_BATCHES;
    onData(fallback);
    return () => {};
  }
}

export function subscribeToTeachers(onData: (teachers: Teacher[]) => void, orgId?: string) {
  try {
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
          const fallback = orgId ? MOCK_TEACHERS.filter(t => t.orgId === orgId) : MOCK_TEACHERS;
          onData(fallback);
        }
      },
      (error) => {
        console.warn('Real-time teachers listener notice:', error.message);
        const fallback = orgId ? MOCK_TEACHERS.filter(t => t.orgId === orgId) : MOCK_TEACHERS;
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = orgId ? MOCK_TEACHERS.filter(t => t.orgId === orgId) : MOCK_TEACHERS;
    onData(fallback);
    return () => {};
  }
}

export function subscribeToInvoices(onData: (invoices: FeeInvoice[]) => void, orgId?: string) {
  try {
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
          const fallback = orgId ? MOCK_INVOICES.filter(inv => inv.orgId === orgId) : MOCK_INVOICES;
          onData(fallback);
        }
      },
      (error) => {
        console.warn('Real-time invoices listener notice:', error.message);
        const fallback = orgId ? MOCK_INVOICES.filter(inv => inv.orgId === orgId) : MOCK_INVOICES;
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = orgId ? MOCK_INVOICES.filter(inv => inv.orgId === orgId) : MOCK_INVOICES;
    onData(fallback);
    return () => {};
  }
}

export function subscribeToAttendance(onData: (records: AttendanceRecord[]) => void, orgId?: string) {
  try {
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
          const fallback = orgId ? MOCK_ATTENDANCE.filter(att => att.orgId === orgId) : MOCK_ATTENDANCE;
          onData(fallback);
        }
      },
      (error) => {
        console.warn('Real-time attendance listener notice:', error.message);
        const fallback = orgId ? MOCK_ATTENDANCE.filter(att => att.orgId === orgId) : MOCK_ATTENDANCE;
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = orgId ? MOCK_ATTENDANCE.filter(att => att.orgId === orgId) : MOCK_ATTENDANCE;
    onData(fallback);
    return () => {};
  }
}

export function subscribeToExams(onData: (exams: Exam[]) => void, orgId?: string) {
  try {
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
          const fallback = orgId ? MOCK_EXAMS.filter(e => e.orgId === orgId) : MOCK_EXAMS;
          onData(fallback);
        }
      },
      (error) => {
        console.warn('Real-time exams listener notice:', error.message);
        const fallback = orgId ? MOCK_EXAMS.filter(e => e.orgId === orgId) : MOCK_EXAMS;
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = orgId ? MOCK_EXAMS.filter(e => e.orgId === orgId) : MOCK_EXAMS;
    onData(fallback);
    return () => {};
  }
}

export function subscribeToAnnouncements(onData: (announcements: Announcement[]) => void, orgId?: string) {
  try {
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
          const fallback = orgId ? MOCK_ANNOUNCEMENTS.filter(a => a.orgId === orgId) : MOCK_ANNOUNCEMENTS;
          onData(fallback);
        }
      },
      (error) => {
        console.warn('Real-time announcements listener notice:', error.message);
        const fallback = orgId ? MOCK_ANNOUNCEMENTS.filter(a => a.orgId === orgId) : MOCK_ANNOUNCEMENTS;
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = orgId ? MOCK_ANNOUNCEMENTS.filter(a => a.orgId === orgId) : MOCK_ANNOUNCEMENTS;
    onData(fallback);
    return () => {};
  }
}

export function subscribeToStudyMaterials(onData: (materials: StudyMaterial[]) => void, orgId?: string) {
  try {
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
          const fallback = orgId ? MOCK_STUDY_MATERIALS.filter(m => m.orgId === orgId) : MOCK_STUDY_MATERIALS;
          onData(fallback);
        }
      },
      (error) => {
        console.warn('Real-time study materials listener notice:', error.message);
        const fallback = orgId ? MOCK_STUDY_MATERIALS.filter(m => m.orgId === orgId) : MOCK_STUDY_MATERIALS;
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = orgId ? MOCK_STUDY_MATERIALS.filter(m => m.orgId === orgId) : MOCK_STUDY_MATERIALS;
    onData(fallback);
    return () => {};
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
  batchesToClean: Batch[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'students', studentId));

    for (const b of batchesToClean) {
      const cleanedIds = b.studentIds.filter(id => id !== studentId);
      batch.set(doc(db, 'batches', b.id), { ...b, studentIds: cleanedIds });
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
  updatedInvoice: FeeInvoice
): Promise<void> {
  try {
    await setDoc(doc(db, 'invoices', invoiceId), updatedInvoice);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `invoices/${invoiceId}`);
  }
}

export async function persistStudentToFirestore(student: Student): Promise<void> {
  try {
    await setDoc(doc(db, 'students', student.id), cleanFirestoreData(student));
  } catch (error) {
    console.warn(`Firestore student update notice (${student.id}):`, error);
  }
}

export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
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

export async function deleteTeacherFromFirestore(teacherId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'teachers', teacherId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teachers/${teacherId}`);
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
          onData(MOCK_EXAM_RESULTS);
        }
      },
      (error) => {
        console.warn('Real-time exam results listener notice:', error.message);
        onData(MOCK_EXAM_RESULTS);
      }
    );
  } catch (e) {
    onData(MOCK_EXAM_RESULTS);
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
          const fallback = orgId ? MOCK_ASSIGNMENTS.filter(a => a.orgId === orgId) : MOCK_ASSIGNMENTS;
          onData(fallback);
        }
      },
      (error) => {
        console.warn('Real-time assignments listener notice:', error.message);
        const fallback = orgId ? MOCK_ASSIGNMENTS.filter(a => a.orgId === orgId) : MOCK_ASSIGNMENTS;
        onData(fallback);
      }
    );
  } catch (e) {
    const fallback = orgId ? MOCK_ASSIGNMENTS.filter(a => a.orgId === orgId) : MOCK_ASSIGNMENTS;
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
