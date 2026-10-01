import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Student, Batch, User, Organization } from '../../types';
import { MOCK_STUDENTS, MOCK_BATCHES } from '../../data/mockData';
import {
  subscribeToStudents,
  subscribeToBatches,
  persistStudentToFirestore,
  deleteStudentFromFirestore,
  persistBatchToFirestore
} from '../../lib/firestoreService';

export interface StudentContextType {
  students: Student[];
  batches: Batch[];
  addStudent: (student: Omit<Student, 'id' | 'orgId' | 'enrollmentNo'>) => Student;
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

interface StudentProviderProps {
  currentOrg: Organization;
  selectedBranchId: string;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

export const StudentProvider: React.FC<StudentProviderProps> = ({
  currentOrg,
  selectedBranchId,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string>('stud-rahul-10');

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('vidyaos_students');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Student[];
        return parsed.filter(s => !(s.name === 'Aarav Sharma' && s.schoolName === 'Delhi Public School' && s.orgId !== 'org-apex'));
      } catch {
        return MOCK_STUDENTS;
      }
    }
    return MOCK_STUDENTS;
  });

  const [batches, setBatches] = useState<Batch[]>(() => {
    const saved = localStorage.getItem('vidyaos_batches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Batch[];
        return parsed
          .filter(b => !(b.name.includes('Target 2027') && b.orgId !== 'org-apex'))
          .map(b => ({
            ...b,
            feeAmountMonthly: typeof b.feeAmountMonthly === 'number' ? b.feeAmountMonthly : 2000,
            capacity: typeof b.capacity === 'number' ? b.capacity : 30,
            studentIds: Array.isArray(b.studentIds) ? b.studentIds : [],
            scheduleDays: Array.isArray(b.scheduleDays) ? b.scheduleDays : ['Mon', 'Wed', 'Fri']
          }));
      } catch {
        return MOCK_BATCHES;
      }
    }
    return MOCK_BATCHES;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('vidyaos_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('vidyaos_batches', JSON.stringify(batches));
  }, [batches]);

  // Real-time Firestore Subscriptions for Students & Batches
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;

    const unsubStudents = subscribeToStudents(data => {
      if (data) setStudents(data);
    }, targetOrg);

    const unsubBatches = subscribeToBatches(data => {
      if (data) {
        setBatches(data.map(b => ({
          ...b,
          feeAmountMonthly: typeof b.feeAmountMonthly === 'number' ? b.feeAmountMonthly : 2000,
          capacity: typeof b.capacity === 'number' ? b.capacity : 30,
          studentIds: Array.isArray(b.studentIds) ? b.studentIds : [],
          scheduleDays: Array.isArray(b.scheduleDays) ? b.scheduleDays : ['Mon', 'Wed', 'Fri']
        })));
      }
    }, targetOrg);

    return () => {
      unsubStudents();
      unsubBatches();
    };
  }, [currentOrg.id, isPlatformOwner]);

  // Sync parent child selection
  useEffect(() => {
    if (currentUser?.role === 'PARENT' && currentUser.linkedStudentIds && currentUser.linkedStudentIds.length > 0) {
      setSelectedChildId(currentUser.linkedStudentIds[0]);
    }
  }, [currentUser]);

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
    if (currentUser.role !== 'PARENT' || !currentUser.linkedStudentIds) return [];
    return students.filter(s => currentUser.linkedStudentIds?.includes(s.id));
  }, [currentUser, students]);

  const selectedChild = useMemo(() => {
    return students.find(s => s.id === selectedChildId);
  }, [students, selectedChildId]);

  const addStudent = (data: Omit<Student, 'id' | 'orgId' | 'enrollmentNo'>): Student => {
    const nextNum = students.filter(s => s.orgId === currentOrg.id).length + 1;
    const enrollmentNo = `${currentOrg.logoText || 'ORG'}/${new Date().getFullYear()}/${String(nextNum).padStart(3, '0')}`;
    const newStudent: Student = {
      ...data,
      id: `stud-${Date.now()}`,
      orgId: currentOrg.id,
      enrollmentNo
    };

    setStudents(prev => [newStudent, ...prev]);
    persistStudentToFirestore(newStudent);

    // Also update batch memberships
    if (data.batchIds && data.batchIds.length > 0) {
      setBatches(prev => prev.map(b => {
        if (data.batchIds.includes(b.id) && !b.studentIds.includes(newStudent.id)) {
          const updatedBatch = { ...b, studentIds: [...b.studentIds, newStudent.id] };
          persistBatchToFirestore(updatedBatch);
          return updatedBatch;
        }
        return b;
      }));
    }

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
    setStudents(prev => prev.filter(s => s.id !== studentId));
    deleteStudentFromFirestore(studentId);
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
