import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Student, Batch, User, Organization } from '../../types';
import { MOCK_STUDENTS, MOCK_BATCHES } from '../../data/mockData';
import { useAuth } from '../AuthContext';
import {
  subscribeToStudents,
  subscribeToBatches,
  persistStudentToFirestore,
  deleteStudentFromFirestore,
  persistBatchToFirestore,
  persistStudentWithBatchAtomically,
  deleteStudentAtomically
} from '../../lib/firestoreService';

export interface StudentContextType {
  students: Student[];
  batches: Batch[];
  addStudent: (student: Omit<Student, 'id' | 'orgId' | 'enrollmentNo'> & Partial<Pick<Student, 'userId'>>) => Student;
  updateStudent: (studentId: string, updates: Partial<Student>) => void;
  deleteStudent: (studentId: string) => void;
  addBatch: (batch: Omit<Batch, 'id' | 'orgId'>) => Batch;
  updateBatch: (batchId: string, updates: Partial<Batch>) => void;
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

  // Real-time Firestore Subscriptions for Students & Batches
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;

    const unsubStudents = subscribeToStudents(data => {
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
    }, targetOrg);

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
      unsubStudents();
      unsubBatches();
    };
  }, [currentOrg.id, isPlatformOwner, fallbackStudents, fallbackBatches, students.length, batches.length]);

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
    const nextNum = students.filter(s => s.orgId === currentOrg.id).length + 1;
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

  return (
    <StudentContext.Provider
      value={{
        students: tenantStudents,
        batches: tenantBatches,
        addStudent,
        updateStudent,
        deleteStudent,
        addBatch,
        updateBatch,
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
