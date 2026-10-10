import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, Batch, User, Organization } from '../../types';
import { MOCK_STUDENTS, MOCK_BATCHES } from '../../data/mockData';
import { useAuth } from '../AuthContext';
import {
  subscribeStudentsPaginated,
  subscribeToBatches,
  persistStudentToFirestore,
  deleteStudentFromFirestore,
  persistBatchToFirestore,
  persistStudentWithBatchAtomically,
  deleteStudentAtomically
} from '../../lib/firestoreService';
import { reconcileBatchMembership } from '../../lib/rosterSync';
import { resolveEntitlements, withinStudentCap } from '../../lib/entitlements';
import { auth } from '../../lib/firebase';

/** Outcome of a roster change. `error` is safe to show verbatim in a toast. */
export type EnrollmentResult = { ok: true } | { ok: false; error: string };

/** `handleFirestoreError` rethrows a JSON blob — pull out the readable cause. */
function describePersistError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  try {
    const detail = String(JSON.parse(raw)?.error || raw);
    if (/permission|insufficient/i.test(detail)) {
      return 'You do not have permission to change this roster.';
    }
    if (/unavailable|network|failed to connect/i.test(detail)) {
      return 'Could not reach the database. Please try again.';
    }
  } catch {
    // Not the JSON envelope — fall through to the generic message.
  }
  return 'The roster could not be saved. Please try again.';
}

export interface StudentContextType {
  students: Student[];
  batches: Batch[];
  studentsHasMore: boolean;
  loadMoreStudents: () => Promise<number>;
  addStudent: (student: Omit<Student, 'id' | 'orgId' | 'enrollmentNo'> & Partial<Pick<Student, 'userId'>>) => Student;
  updateStudent: (studentId: string, updates: Partial<Student>) => void;
  deleteStudent: (studentId: string) => void;
  addBatch: (batch: Omit<Batch, 'id' | 'orgId'>) => Batch;
  updateBatch: (batchId: string, updates: Partial<Batch>) => void;
  enrollStudentInBatch: (studentId: string, batchId: string) => Promise<EnrollmentResult>;
  removeStudentFromBatch: (studentId: string, batchId: string) => Promise<EnrollmentResult>;
  selectedChildId: string;
  setSelectedChildId: (studentId: string) => void;
  selectedChild: Student | undefined;
  parentLinkedChildren: Student[];
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);
const DELETED_STUDENT_IDS_KEY = 'vidyaos_deleted_student_ids';
const DELETED_BATCH_IDS_KEY = 'vidyaos_deleted_batch_ids';

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

function writeDeletedId(storageKey: string, id: string) {
  if (!id) return;
  const next = readDeletedIds(storageKey);
  next.add(id);
  try {
    localStorage.setItem(storageKey, JSON.stringify([...next]));
  } catch {
    // Ignore storage quota issues in dev fallback contexts.
  }
}

function filterDeletedItems<T extends { id: string }>(items: T[], storageKey: string): T[] {
  const deleted = readDeletedIds(storageKey);
  if (deleted.size === 0) return items;
  return items.filter(item => !deleted.has(item.id));
}

interface StudentProviderProps {
  currentOrg: Organization;
  selectedBranchId: string;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

function ensureStudentUniqueUserIds(list: Student[]): Student[] {
  return list.map(s => {
    if (s.userId) return s;
    const cleanDigits = (s.phone || '').replace(/[^0-9]/g, '').slice(-10);
    return {
      ...s,
      userId: `user-stud-${cleanDigits || s.id}-${Math.random().toString(36).substring(2, 6)}`
    };
  });
}

export const StudentProvider: React.FC<StudentProviderProps> = ({
  currentOrg,
  selectedBranchId,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const fallbackStudents = useMemo(() => ensureStudentUniqueUserIds(MOCK_STUDENTS), []);
  const fallbackBatches = useMemo(() => MOCK_BATCHES, []);

  const [selectedChildId, setSelectedChildIdState] = useState<string>(import.meta.env.DEV ? 'stud-rahul-10' : '');

  // IDOR guard. `authorizedStudentIds` is the single source of truth for which
  // children a parent account may reach — a parent must not be able to point the
  // portal at an arbitrary student id.
  const { authorizedStudentIds } = useAuth();
  const setSelectedChildId = useCallback((studentId: string) => {
    if (currentUser.role === 'PARENT' && !authorizedStudentIds.includes(studentId)) return;
    setSelectedChildIdState(studentId);
  }, [currentUser.role, authorizedStudentIds]);

  const [students, setStudents] = useState<Student[]>(() => {
    if (import.meta.env.DEV) {
      const saved = localStorage.getItem('vidyaos_students');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Student[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return ensureStudentUniqueUserIds(filterDeletedItems(parsed, DELETED_STUDENT_IDS_KEY));
          }
        } catch {
          return filterDeletedItems(fallbackStudents, DELETED_STUDENT_IDS_KEY);
        }
      }
      return filterDeletedItems(fallbackStudents, DELETED_STUDENT_IDS_KEY);
    }

    // Production starts empty and is filled by the Firestore subscription below
    // (persisted to IndexedDB by the cache configured in firebase.ts). Reading a
    // localStorage copy here would be both stale — any write from another device
    // or branch would be missed — and a leak of the previous tenant's roster
    // after a logout.
    return [];
  });

  const [batches, setBatches] = useState<Batch[]>(() => {
    if (import.meta.env.DEV) {
      const saved = localStorage.getItem('vidyaos_batches');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Batch[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return filterDeletedItems(parsed, DELETED_BATCH_IDS_KEY)
              .filter(b => !(b.name.includes('Target 2027') && b.orgId !== 'org-apex'))
              .map(b => ({
                ...b,
                feeAmountMonthly: typeof b.feeAmountMonthly === 'number' ? b.feeAmountMonthly : 2000,
                capacity: typeof b.capacity === 'number' ? b.capacity : 30,
                studentIds: Array.isArray(b.studentIds) ? b.studentIds : [],
                scheduleDays: Array.isArray(b.scheduleDays) ? b.scheduleDays : ['Mon', 'Wed', 'Fri']
              }));
          }
        } catch {
          return filterDeletedItems(fallbackBatches, DELETED_BATCH_IDS_KEY);
        }
      }
      return filterDeletedItems(fallbackBatches, DELETED_BATCH_IDS_KEY);
    }

    // See the note in `students` above: production boots straight from Firestore.
    return [];
  });

  // DEV-only mirrors — mock-mode data survives a reload during development.
  // Production does not write its collections back to localStorage: Firestore (with
  // its persistent IndexedDB cache) is the single source of truth, and a second
  // unauthenticated copy would only go stale and outlive the session that created it.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('vidyaos_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('vidyaos_batches', JSON.stringify(batches));
  }, [batches]);

  // G1 — paginated students stream. The first page stays live; `loadMoreStudents`
  // fetches the next cursor page so institutes over the page size stop silently
  // losing records.
  const [studentsHasMore, setStudentsHasMore] = useState(false);
  const studentsHandleRef = useRef<ReturnType<typeof subscribeStudentsPaginated> | null>(null);

  // Real-time Firestore Subscriptions for Students & Batches
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;

    const studentsHandle = subscribeStudentsPaginated((data, meta) => {
      if (!Array.isArray(data)) {
        if (import.meta.env.DEV && students.length === 0) {
          setStudents(fallbackStudents);
        }
        return;
      }

      if (data.length === 0 && import.meta.env.DEV) {
        const filteredFallback = filterDeletedItems(fallbackStudents, DELETED_STUDENT_IDS_KEY);
        setStudents(prev => (prev.length > 0 ? prev : filteredFallback));
        return;
      }

      setStudents(ensureStudentUniqueUserIds(filterDeletedItems(data, DELETED_STUDENT_IDS_KEY)));
      setStudentsHasMore(meta.hasMore);
    }, targetOrg);
    studentsHandleRef.current = studentsHandle;

    const unsubBatches = subscribeToBatches(data => {
      if (!Array.isArray(data)) {
        if (import.meta.env.DEV && batches.length === 0) {
          setBatches(fallbackBatches);
        }
        return;
      }

      if (data.length === 0 && import.meta.env.DEV) {
        const filteredFallback = filterDeletedItems(fallbackBatches, DELETED_BATCH_IDS_KEY);
        setBatches(prev => (prev.length > 0 ? prev : filteredFallback));
        return;
      }

      setBatches(filterDeletedItems(data, DELETED_BATCH_IDS_KEY).map(b => ({
        ...b,
        feeAmountMonthly: typeof b.feeAmountMonthly === 'number' ? b.feeAmountMonthly : 2000,
        capacity: typeof b.capacity === 'number' ? b.capacity : 30,
        studentIds: Array.isArray(b.studentIds) ? b.studentIds : [],
        scheduleDays: Array.isArray(b.scheduleDays) ? b.scheduleDays : ['Mon', 'Wed', 'Fri']
      })));
    }, targetOrg);

    return () => {
      if (studentsHandleRef.current) {
        studentsHandleRef.current.unsubscribe();
        studentsHandleRef.current = null;
      }
      unsubBatches();
    };
  }, [currentOrg.id, isPlatformOwner, fallbackStudents, fallbackBatches, students.length, batches.length]);

  /**
   * G1 — fetch the next page of students on demand. Returns how many records
   * were actually added (for the UI state).
   */
  const loadMoreStudents = async (): Promise<number> => {
    if (!studentsHandleRef.current) return 0;
    return studentsHandleRef.current.loadMore();
  };

  // Sync parent child selection to the first linked child, and clear it when the
  // account has none — otherwise a previous account's child would survive a
  // logout/login on the same browser.
  useEffect(() => {
    if (currentUser.role !== 'PARENT') return;
    if (authorizedStudentIds.length === 0) {
      if (selectedChildId) setSelectedChildIdState('');
      return;
    }
    if (!authorizedStudentIds.includes(selectedChildId)) {
      setSelectedChildIdState(authorizedStudentIds[0]);
    }
  }, [currentUser.role, authorizedStudentIds, selectedChildId]);

  // Multi-Tenant Isolation: Filtered data views
  const tenantStudents = useMemo(() => {
    if (isPlatformOwner) return students;
    return students.filter(s => s.orgId === currentOrg.id && (selectedBranchId === 'all' || s.branchId === selectedBranchId));
  }, [students, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const tenantBatches = useMemo(() => {
    if (isPlatformOwner) return batches;
    return batches.filter(b => b.orgId === currentOrg.id && (selectedBranchId === 'all' || b.branchId === selectedBranchId));
  }, [batches, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const parentLinkedChildren = useMemo(() => {
    if (currentUser.role !== 'PARENT') return [];
    return students.filter(s => authorizedStudentIds.includes(s.id));
  }, [currentUser.role, authorizedStudentIds, students]);

  const selectedChild = useMemo(() => {
    const found = students.find(s => s.id === selectedChildId);
    if (!found) return undefined;
    // Re-checked on read as well as on write, so a stale or tampered id can never
    // resolve to a child this parent is not linked to.
    if (currentUser.role === 'PARENT' && !authorizedStudentIds.includes(found.id)) return undefined;
    return found;
  }, [students, selectedChildId, currentUser.role, authorizedStudentIds]);

  const addStudent = (data: Omit<Student, 'id' | 'orgId' | 'enrollmentNo'> & Partial<Pick<Student, 'userId'>>): Student => {
    // Cap enforcement (defensive backstop — the UI paths also pre-check and
    // point at the upgrade path, so this should only fire on a race/tamper).
    const ent = resolveEntitlements(currentOrg);
    const currentCount = students.filter(s => s.orgId === currentOrg.id).length;
    if (!withinStudentCap(ent, currentCount)) {
      throw new Error(
        `STUDENT_CAP_REACHED:${ent.maxStudents}:Free tier admits up to ${ent.maxStudents} students — add a Growth or Cloud Pro SKU to raise the cap.`
      );
    }

    const nextNum = currentCount + 1;
    const enrollmentNo = `${currentOrg.logoText || 'ORG'}/${new Date().getFullYear()}/${String(nextNum).padStart(3, '0')}`;
    const cleanDigits = (data.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const uniqueUserId = data.userId || `user-stud-${cleanDigits || Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newStudent: Student = {
      ...data,
      // After the spread: `userId: undefined` (no login provisioned yet) must not
      // erase the generated fallback.
      userId: uniqueUserId,
      id: `stud-${Date.now()}`,
      orgId: currentOrg.id,
      enrollmentNo
    };

    const batchesToUpdate: Batch[] = [];
    if (data.batchIds && data.batchIds.length > 0) {
      batches.forEach(b => {
        if (data.batchIds.includes(b.id) && !b.studentIds.includes(newStudent.id)) {
          batchesToUpdate.push({ ...b, studentIds: [...b.studentIds, newStudent.id] });
        }
      });
    }

    setStudents(prev => [newStudent, ...prev]);
    if (batchesToUpdate.length > 0) {
      setBatches(prev => prev.map(b => {
        const found = batchesToUpdate.find(up => up.id === b.id);
        return found || b;
      }));
    }

    // Atomically persist student AND batch updates together
    persistStudentWithBatchAtomically(newStudent, batchesToUpdate);

    return newStudent;
  };

  const updateStudent = (studentId: string, updates: Partial<Student>) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // If the caller carries a `batchIds` change, that is a roster move: both
    // mirrors (`student.batchIds` AND every `batch.studentIds`) must change
    // together or they drift. A plain field merge here would silently break
    // the relationship on the batch side.
    if (updates.batchIds && updates.batchIds.join(',') !== student.batchIds.join(',')) {
      const { nextStudent, batchesToUpdate } = reconcileBatchMembership(student, batches, updates.batchIds);
      setStudents(prev => prev.map(s => (s.id === studentId ? nextStudent : s)));
      setBatches(prev => prev.map(b => {
        const updated = batchesToUpdate.find(up => up.id === b.id);
        return updated || b;
      }));
      if (auth.currentUser) {
        persistStudentWithBatchAtomically(nextStudent, batchesToUpdate).catch(() => {
          // Logged by handleFirestoreError; local state stays in sync for the session.
        });
      }
      return;
    }

    // Plain field merge for everything else (name, phone, avatar, ...).
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const updated = { ...s, ...updates };
        persistStudentToFirestore(updated);
        return updated;
      }
      return s;
    }));
  };

  const deleteStudent = (studentId: string) => {
    const target = students.find(s => s.id === studentId);
    const batchesToClean = batches.filter(b => b.studentIds.includes(studentId));

    writeDeletedId(DELETED_STUDENT_IDS_KEY, studentId);
    setStudents(prev => prev.filter(s => s.id !== studentId));
    if (batchesToClean.length > 0) {
      setBatches(prev => prev.map(b => {
        if (b.studentIds.includes(studentId)) {
          return { ...b, studentIds: b.studentIds.filter(id => id !== studentId) };
        }
        return b;
      }));
    }

    // Atomically delete student, vacate user profile in Firestore, and clean student ID from all batches
    deleteStudentAtomically(studentId, batchesToClean, target?.userId);
  };

  const addBatch = (data: Omit<Batch, 'id' | 'orgId'>): Batch => {
    const newBatch: Batch = {
      ...data,
      id: `batch-${Date.now()}`,
      orgId: currentOrg.id
    };
    setBatches(prev => [...prev, newBatch]);
    persistBatchToFirestore(newBatch);
    return newBatch;
  };

  const updateBatch = (batchId: string, updates: Partial<Batch>) => {
    setBatches(prev => prev.map(b => {
      if (b.id === batchId) {
        const updated = { ...b, ...updates };
        persistBatchToFirestore(updated);
        return updated;
      }
      return b;
    }));
  };

  /**
   * One code path for every batch-membership change: locate the student + batch,
   * validate, reconcile BOTH mirrors, commit them as a single writeBatch and only
   * then reflect the change in local state — so a rules denial surfaces as an
   * error instead of a roster that silently reverts on reload.
   *
   * The DEV demo persona is the exception: `loginAsDemoUser` never signs into
   * Firebase, so that write cannot succeed there. In that mode the change applies
   * locally and the (expected) Firestore refusal is swallowed exactly like every
   * other demo mutation in this provider.
   */
  const setStudentBatchMembership = async (
    studentId: string,
    batchId: string,
    enrolled: boolean
  ): Promise<EnrollmentResult> => {
    const student = students.find(s => s.id === studentId);
    const targetBatch = batches.find(b => b.id === batchId);

    if (!student || !targetBatch) {
      return { ok: false, error: 'That student or batch could not be found. It may have been deleted just now.' };
    }

    const alreadyIn = student.batchIds.includes(batchId);
    const onRoster = targetBatch.studentIds.includes(studentId);

    if (enrolled && alreadyIn && onRoster) {
      return { ok: false, error: `${student.name} is already enrolled in ${targetBatch.name}.` };
    }
    if (!enrolled && !alreadyIn && !onRoster) {
      return { ok: false, error: `${student.name} is not currently enrolled in ${targetBatch.name}.` };
    }

    const targetBatchIds = enrolled
      ? [...student.batchIds, batchId]
      : student.batchIds.filter(id => id !== batchId);

    const { nextStudent, batchesToUpdate } = reconcileBatchMembership(student, batches, targetBatchIds);

    // Local update is always safe (idempotent deltas applied to `prev`), so it can
    // run in the demo path where the commit below intentionally never runs.
    const applyLocal = () => {
      setStudents(prev => prev.map(s => (s.id === studentId ? nextStudent : s)));
      setBatches(prev => prev.map(b => {
        const updated = batchesToUpdate.find(up => up.id === b.id);
        return updated || b;
      }));
    };

    if (!auth.currentUser) {
      applyLocal();
      persistStudentWithBatchAtomically(nextStudent, batchesToUpdate).catch(() => {
        // handleFirestoreError already logged the refusal; demo stays functional.
      });
      return { ok: true };
    }

    try {
      await persistStudentWithBatchAtomically(nextStudent, batchesToUpdate);
    } catch (error) {
      return { ok: false, error: describePersistError(error) };
    }

    applyLocal();
    return { ok: true };
  };

  const enrollStudentInBatch = (studentId: string, batchId: string): Promise<EnrollmentResult> =>
    setStudentBatchMembership(studentId, batchId, true);

  const removeStudentFromBatch = (studentId: string, batchId: string): Promise<EnrollmentResult> =>
    setStudentBatchMembership(studentId, batchId, false);

  return (
    <StudentContext.Provider
      value={{
        students: tenantStudents,
        batches: tenantBatches,
        studentsHasMore,
        loadMoreStudents,
        addStudent,
        updateStudent,
        deleteStudent,
        addBatch,
        updateBatch,
        enrollStudentInBatch,
        removeStudentFromBatch,
        selectedChildId,
        setSelectedChildId,
        selectedChild,
        parentLinkedChildren
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};

export const useStudents = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudents must be used within a StudentProvider');
  }
  return context;
};
