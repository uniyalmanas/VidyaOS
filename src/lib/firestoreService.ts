import {
  db,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
  handleFirestoreError,
  OperationType
} from './firebase';
import {
  Organization,
  User,
  Student,
  Batch,
  Teacher,
  FeeInvoice,
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

/**
 * Initializes Firestore collections with baseline coaching data if empty.
 */
export async function seedInitialFirestoreDataIfEmpty() {
  if (isSeedingInProgress) return;
  isSeedingInProgress = true;

  try {
    const orgsSnap = await getDocs(collection(db, 'organizations'));
    if (orgsSnap.empty) {
      console.log('Seeding initial coaching & education center data to Firestore...');

      // Seed Organizations
      for (const org of MOCK_ORGANIZATIONS) {
        await setDoc(doc(db, 'organizations', org.id), org);
      }

      // Seed Users & Credentials
      for (const user of MOCK_USERS) {
        await setDoc(doc(db, 'users', user.id), user);
        const cleanPhone = user.phone.replace(/[^0-9]/g, '').slice(-10);
        await setDoc(doc(db, 'credentials', cleanPhone), {
          phone: cleanPhone,
          userId: user.id,
          password: user.password || 'password123',
          role: user.role,
          name: user.name,
          email: user.email,
          orgId: user.orgId,
          updatedAt: new Date().toISOString()
        });
      }

      // Seed Students
      for (const stud of MOCK_STUDENTS) {
        await setDoc(doc(db, 'students', stud.id), stud);
      }

      // Seed Batches
      for (const batch of MOCK_BATCHES) {
        await setDoc(doc(db, 'batches', batch.id), batch);
      }

      // Seed Teachers
      for (const teacher of MOCK_TEACHERS) {
        await setDoc(doc(db, 'teachers', teacher.id), teacher);
      }

      // Seed Invoices
      for (const inv of MOCK_INVOICES) {
        await setDoc(doc(db, 'invoices', inv.id), inv);
      }

      // Seed Attendance
      for (const att of MOCK_ATTENDANCE) {
        await setDoc(doc(db, 'attendance', att.id), att);
      }

      // Seed Exams
      for (const exam of MOCK_EXAMS) {
        await setDoc(doc(db, 'exams', exam.id), exam);
      }

      // Seed Exam Results
      for (const res of MOCK_EXAM_RESULTS) {
        await setDoc(doc(db, 'examResults', res.id), res);
      }

      // Seed Announcements
      for (const ann of MOCK_ANNOUNCEMENTS) {
        await setDoc(doc(db, 'announcements', ann.id), ann);
      }

      console.log('Initial Firestore seeding completed successfully.');
    }
  } catch (error) {
    console.warn('Firestore seeding skipped or restricted by network/offline:', error);
  } finally {
    isSeedingInProgress = false;
  }
}

// ----------------------------------------------------
// REAL-TIME LISTENERS
// ----------------------------------------------------

export function subscribeToOrganizations(onData: (orgs: Organization[]) => void) {
  try {
    const colRef = collection(db, 'organizations');
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
      ? query(collection(db, 'users'), where('orgId', '==', orgId))
      : collection(db, 'users');
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
      ? query(collection(db, 'students'), where('orgId', '==', orgId))
      : collection(db, 'students');
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
      ? query(collection(db, 'batches'), where('orgId', '==', orgId))
      : collection(db, 'batches');
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
      ? query(collection(db, 'teachers'), where('orgId', '==', orgId))
      : collection(db, 'teachers');
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
      ? query(collection(db, 'invoices'), where('orgId', '==', orgId))
      : collection(db, 'invoices');
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
      ? query(collection(db, 'attendance'), where('orgId', '==', orgId))
      : collection(db, 'attendance');
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
      ? query(collection(db, 'exams'), where('orgId', '==', orgId))
      : collection(db, 'exams');
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
      ? query(collection(db, 'announcements'), where('orgId', '==', orgId))
      : collection(db, 'announcements');
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
      ? query(collection(db, 'studyMaterials'), where('orgId', '==', orgId))
      : collection(db, 'studyMaterials');
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
// FIRESTORE MUTATIONS
// ----------------------------------------------------

export async function persistStudentToFirestore(student: Student): Promise<void> {
  try {
    await setDoc(doc(db, 'students', student.id), student);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${student.id}`);
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
    await setDoc(doc(db, 'batches', batch.id), batch);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `batches/${batch.id}`);
  }
}

export async function persistTeacherToFirestore(teacher: Teacher): Promise<void> {
  try {
    await setDoc(doc(db, 'teachers', teacher.id), teacher);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `teachers/${teacher.id}`);
  }
}

export async function persistInvoiceToFirestore(invoice: FeeInvoice): Promise<void> {
  try {
    await setDoc(doc(db, 'invoices', invoice.id), invoice);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `invoices/${invoice.id}`);
  }
}

export async function persistAttendanceToFirestore(record: AttendanceRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'attendance', record.id), record);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `attendance/${record.id}`);
  }
}

export async function persistExamToFirestore(exam: Exam): Promise<void> {
  try {
    await setDoc(doc(db, 'exams', exam.id), exam);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `exams/${exam.id}`);
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
    await setDoc(doc(db, 'users', user.id), user);
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
