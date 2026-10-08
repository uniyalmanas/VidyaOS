import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Teacher,
  Exam,
  ExamResult,
  Assignment,
  StudyMaterial,
  TimetableSlot,
  Organization
} from '../../types';
import {
  MOCK_TEACHERS,
  MOCK_EXAMS,
  MOCK_EXAM_RESULTS,
  MOCK_ASSIGNMENTS,
  MOCK_STUDY_MATERIALS,
  MOCK_TIMETABLE
} from '../../data/mockData';
import {
  subscribeToTeachers,
  subscribeToExams,
  subscribeToExamResults,
  subscribeToAssignments,
  subscribeToStudyMaterials,
  subscribeToTimetableSlots,
  persistTeacherToFirestore,
  deleteTeacherFromFirestore,
  persistExamToFirestore,
  deleteExamFromFirestore,
  persistExamResultsToFirestore,
  persistAssignmentToFirestore,
  deleteAssignmentFromFirestore,
  persistStudyMaterialToFirestore,
  deleteStudyMaterialFromFirestore,
  persistTimetableSlotToFirestore,
  deleteTimetableSlotFromFirestore
} from '../../lib/firestoreService';
import { normalizeMeetUrl } from '../../lib/timetable';
import { ExternalRankRow, mergeExternalResults } from '../../lib/exams';

export interface AcademicContextType {
  teachers: Teacher[];
  exams: Exam[];
  examResults: ExamResult[];
  assignments: Assignment[];
  studyMaterials: StudyMaterial[];
  timetableSlots: TimetableSlot[];
  addTeacher: (teacher: Omit<Teacher, 'id' | 'orgId' | 'userId' | 'joiningDate'> & Partial<Pick<Teacher, 'userId' | 'joiningDate'>>) => Teacher;
  updateTeacher: (teacherId: string, updates: Partial<Teacher>) => void;
  deleteTeacher: (teacherId: string) => void;
  createExam: (exam: Omit<Exam, 'id' | 'orgId'>) => Exam;
  deleteExam: (examId: string) => void;
  saveExamResults: (examId: string, marksData: { studentId: string; marksObtained: number; remarks?: string }[]) => void;
  importExternalResults: (examId: string, rows: ExternalRankRow[]) => { updated: number; created: number };
  createAssignment: (assign: Omit<Assignment, 'id' | 'orgId' | 'submissions'>) => Assignment;
  deleteAssignment: (assignId: string) => void;
  addStudyMaterial: (mat: Omit<StudyMaterial, 'id' | 'orgId' | 'uploadedAt'>) => StudyMaterial;
  deleteStudyMaterial: (matId: string) => void;
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id' | 'orgId' | 'branchId'> & { branchId?: string }) => TimetableSlot;
  updateTimetableSlot: (slotId: string, updates: Partial<Omit<TimetableSlot, 'id' | 'orgId'>>) => void;
  deleteTimetableSlot: (slotId: string) => void;
  deduplicateTeachers: () => { removedCount: number; mergedCount: number };
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

interface AcademicProviderProps {
  currentOrg: Organization;
  selectedBranchId: string;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

/**
 * Scans teachers list, identifies duplicates with identical phone numbers or names within the same coaching center,
 * merges batch assignments into the canonical record, assigns distinct non-shared userIds,
 * and identifies redundant duplicate documents to delete from Firestore.
 */
export function cleanAndDeduplicateTeachers(rawTeachers: Teacher[]): { cleaned: Teacher[]; removed: Teacher[] } {
  const seenPhone = new Map<string, Teacher>();
  const seenName = new Map<string, Teacher>();
  const cleaned: Teacher[] = [];
  const removed: Teacher[] = [];

  rawTeachers.forEach(t => {
    const cleanDigits = (t.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const cleanName = (t.name || '').trim().toLowerCase();
    const phoneKey = cleanDigits ? `${t.orgId}::${cleanDigits}` : null;
    const nameKey = cleanName ? `${t.orgId}::${cleanName}` : null;

    let canonical: Teacher | undefined;
    if (phoneKey && seenPhone.has(phoneKey)) {
      canonical = seenPhone.get(phoneKey);
    } else if (nameKey && seenName.has(nameKey)) {
      canonical = seenName.get(nameKey);
    }

    if (canonical) {
      // Merge batch assignments into canonical record
      canonical.assignedBatchIds = Array.from(new Set([
        ...(canonical.assignedBatchIds || []),
        ...(t.assignedBatchIds || [])
      ]));
      removed.push(t);
    } else {
      // Ensure unique non-shared userId
      const safeTeacher: Teacher = {
        ...t,
        userId: t.userId || `user-teach-${cleanDigits || t.id}-${Math.random().toString(36).substring(2, 6)}`
      };
      if (phoneKey) seenPhone.set(phoneKey, safeTeacher);
      if (nameKey) seenName.set(nameKey, safeTeacher);
      cleaned.push(safeTeacher);
    }
  });

  return { cleaned, removed };
}

export const AcademicProvider: React.FC<AcademicProviderProps> = ({
  currentOrg,
  selectedBranchId,
  isPlatformOwner,
  children
}) => {
  // The localStorage mirrors below are DEV-only (mock-mode convenience).
  // Production hydrates every collection from Firestore, which persists to
  // IndexedDB via the cache configured in firebase.ts — a second, unauthenticated
  // copy in localStorage would only replay the previous tenant's data after a
  // logout and could never stay in step with writes from other devices.
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = import.meta.env.DEV ? localStorage.getItem('vidyaos_teachers') : null;
    const raw = saved ? JSON.parse(saved) : (import.meta.env.DEV ? MOCK_TEACHERS : []);
    const { cleaned, removed } = cleanAndDeduplicateTeachers(raw);
    if (removed.length > 0) {
      removed.forEach(r => deleteTeacherFromFirestore(r.id, r.userId));
    }
    return cleaned;
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = import.meta.env.DEV ? localStorage.getItem('vidyaos_exams') : null;
    return saved ? JSON.parse(saved) : (import.meta.env.DEV ? MOCK_EXAMS : []);
  });

  const [examResults, setExamResults] = useState<ExamResult[]>(() => {
    const saved = import.meta.env.DEV ? localStorage.getItem('vidyaos_results') : null;
    return saved ? JSON.parse(saved) : (import.meta.env.DEV ? MOCK_EXAM_RESULTS : []);
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = import.meta.env.DEV ? localStorage.getItem('vidyaos_assignments') : null;
    return saved ? JSON.parse(saved) : (import.meta.env.DEV ? MOCK_ASSIGNMENTS : []);
  });

  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>(() => {
    const saved = import.meta.env.DEV ? localStorage.getItem('vidyaos_materials') : null;
    return saved ? JSON.parse(saved) : (import.meta.env.DEV ? MOCK_STUDY_MATERIALS : []);
  });

  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>(() => {
    const saved = import.meta.env.DEV ? localStorage.getItem('vidyaos_timetable') : null;
    return saved ? JSON.parse(saved) : (import.meta.env.DEV ? MOCK_TIMETABLE : []);
  });

  // DEV-only mirrors (see the note above the state declarations).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('vidyaos_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('vidyaos_exams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('vidyaos_results', JSON.stringify(examResults));
  }, [examResults]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('vidyaos_assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('vidyaos_materials', JSON.stringify(studyMaterials));
  }, [studyMaterials]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('vidyaos_timetable', JSON.stringify(timetableSlots));
  }, [timetableSlots]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;

    const unsubTeachers = subscribeToTeachers(data => {
      if (data) {
        const { cleaned, removed } = cleanAndDeduplicateTeachers(data);
        setTeachers(cleaned);
        if (removed.length > 0) {
          removed.forEach(r => deleteTeacherFromFirestore(r.id, r.userId));
        }
      }
    }, targetOrg);

    const unsubExams = subscribeToExams(data => {
      if (data) setExams(data);
    }, targetOrg);

    const unsubResults = subscribeToExamResults(data => {
      if (data) setExamResults(data);
    }, targetOrg);

    const unsubAssignments = subscribeToAssignments(data => {
      if (data) setAssignments(data);
    }, targetOrg);

    const unsubMaterials = subscribeToStudyMaterials(data => {
      if (data) setStudyMaterials(data);
    }, targetOrg);

    const unsubTimetable = subscribeToTimetableSlots(data => {
      if (data) setTimetableSlots(data);
    }, targetOrg);

    return () => {
      unsubTeachers();
      unsubExams();
      unsubResults();
      unsubAssignments();
      unsubMaterials();
      unsubTimetable();
    };
  }, [currentOrg.id, isPlatformOwner]);

  // Multi-Tenant Isolation: Filtered data views
  const tenantTeachers = useMemo(() => {
    if (isPlatformOwner) return teachers;
    return teachers.filter(t => t.orgId === currentOrg.id && (selectedBranchId === 'all' || t.branchId === selectedBranchId));
  }, [teachers, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const tenantExams = useMemo(() => {
    if (isPlatformOwner) return exams;
    return exams.filter(e => e.orgId === currentOrg.id && (selectedBranchId === 'all' || e.branchId === selectedBranchId));
  }, [exams, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const tenantExamResults = useMemo(() => {
    if (isPlatformOwner) return examResults;
    const tenantExamIds = new Set(tenantExams.map(e => e.id));
    return examResults.filter(r => tenantExamIds.has(r.examId));
  }, [examResults, tenantExams, isPlatformOwner]);

  const tenantAssignments = useMemo(() => {
    if (isPlatformOwner) return assignments;
    return assignments.filter(a => a.orgId === currentOrg.id && (selectedBranchId === 'all' || a.branchId === selectedBranchId));
  }, [assignments, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const tenantStudyMaterials = useMemo(() => {
    if (isPlatformOwner) return studyMaterials;
    return studyMaterials.filter(m => m.orgId === currentOrg.id && (selectedBranchId === 'all' || m.branchId === selectedBranchId));
  }, [studyMaterials, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const tenantTimetable = useMemo(() => {
    if (isPlatformOwner) return timetableSlots;
    return timetableSlots.filter(t => t.orgId === currentOrg.id && (selectedBranchId === 'all' || t.branchId === selectedBranchId));
  }, [timetableSlots, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const addTeacher = (data: Omit<Teacher, 'id' | 'orgId' | 'userId' | 'joiningDate'> & Partial<Pick<Teacher, 'userId' | 'joiningDate'>>): Teacher => {
    const cleanDigits = (data.phone || '').replace(/[^0-9]/g, '').slice(-10);
    // Check if teacher with same phone number already exists in currentOrg to prevent duplicates
    const existing = teachers.find(t =>
      t.orgId === currentOrg.id &&
      cleanDigits &&
      t.phone.replace(/[^0-9]/g, '').slice(-10) === cleanDigits
    );

    if (existing) {
      const mergedBatches = Array.from(new Set([...(existing.assignedBatchIds || []), ...(data.assignedBatchIds || [])]));
      const updated: Teacher = {
        ...existing,
        ...data,
        id: existing.id,
        orgId: existing.orgId,
        userId: existing.userId,
        assignedBatchIds: mergedBatches
      };
      setTeachers(prev => prev.map(t => t.id === existing.id ? updated : t));
      persistTeacherToFirestore(updated);
      return updated;
    }

    const uniqueUserId = data.userId || `user-teach-${cleanDigits || Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newTeacher: Teacher = {
      userId: uniqueUserId,
      joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
      ...data,
      id: `teach-${Date.now()}`,
      orgId: currentOrg.id
    };
    setTeachers(prev => [...prev, newTeacher]);
    persistTeacherToFirestore(newTeacher);
    return newTeacher;
  };

  const updateTeacher = (teacherId: string, updates: Partial<Teacher>) => {
    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId) {
        const updated = { ...t, ...updates };
        persistTeacherToFirestore(updated);
        return updated;
      }
      return t;
    }));
  };

  const deleteTeacher = (teacherId: string) => {
    const target = teachers.find(t => t.id === teacherId);
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
    deleteTeacherFromFirestore(teacherId, target?.userId);
  };

  const deduplicateTeachers = () => {
    const { cleaned, removed } = cleanAndDeduplicateTeachers(teachers);
    if (removed.length > 0) {
      setTeachers(cleaned);
      removed.forEach(r => deleteTeacherFromFirestore(r.id, r.userId));
      cleaned.forEach(c => persistTeacherToFirestore(c));
    }
    return { removedCount: removed.length, mergedCount: cleaned.length };
  };

  const createExam = (data: Omit<Exam, 'id' | 'orgId'>): Exam => {
    const newExam: Exam = {
      ...data,
      id: `exam-${Date.now()}`,
      orgId: currentOrg.id
    };
    setExams(prev => [newExam, ...prev]);
    persistExamToFirestore(newExam);
    return newExam;
  };

  const deleteExam = (examId: string) => {
    setExams(prev => prev.filter(e => e.id !== examId));
    deleteExamFromFirestore(examId);
  };

  const saveExamResults = (examId: string, marksData: { studentId: string; marksObtained: number; remarks?: string }[]) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    const sorted = [...marksData].sort((a, b) => b.marksObtained - a.marksObtained);

    const newResults: ExamResult[] = sorted.map((item, idx) => ({
      id: `res-${examId}-${item.studentId}`,
      examId,
      studentId: item.studentId,
      marksObtained: item.marksObtained,
      percentage: Number(((item.marksObtained / exam.maxMarks) * 100).toFixed(1)),
      rank: idx + 1,
      percentile: Number((((sorted.length - idx) / sorted.length) * 100).toFixed(0)),
      teacherRemarks: item.remarks,
      status: 'graded'
    }));

    setExamResults(prev => {
      const filtered = prev.filter(r => r.examId !== examId);
      return [...newResults, ...filtered];
    });

    setExams(prev => prev.map(e => e.id === examId ? { ...e, status: 'graded' } : e));
    persistExamResultsToFirestore(examId, newResults, currentOrg.id);
  };

  // F10 — merge an imported all-India ranking sheet onto existing results. New
  // rows are created for students who had no internal marks yet so the imported
  // AIR is never lost; internal rank/percentile stay untouched.
  const importExternalResults = (examId: string, rows: ExternalRankRow[]): { updated: number; created: number } => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return { updated: 0, created: 0 };

    const { results, updated, created } = mergeExternalResults(examResults, examId, rows);
    setExamResults(results);

    const examRows = results.filter(r => r.examId === examId);
    persistExamResultsToFirestore(examId, examRows, currentOrg.id);
    return { updated, created };
  };

  const createAssignment = (data: Omit<Assignment, 'id' | 'orgId' | 'submissions'>): Assignment => {
    const newAssign: Assignment = {
      ...data,
      id: `assign-${Date.now()}`,
      orgId: currentOrg.id,
      submissions: []
    };
    setAssignments(prev => [newAssign, ...prev]);
    persistAssignmentToFirestore(newAssign);
    return newAssign;
  };

  const deleteAssignment = (assignId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignId));
    deleteAssignmentFromFirestore(assignId);
  };

  const addStudyMaterial = (data: Omit<StudyMaterial, 'id' | 'orgId' | 'uploadedAt'>): StudyMaterial => {
    const newMat: StudyMaterial = {
      ...data,
      id: `mat-${Date.now()}`,
      orgId: currentOrg.id,
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    setStudyMaterials(prev => [newMat, ...prev]);
    persistStudyMaterialToFirestore(newMat);
    return newMat;
  };

  const deleteStudyMaterial = (matId: string) => {
    // Find the material to get its fileUrl before removing from state
    const material = studyMaterials.find(m => m.id === matId);
    setStudyMaterials(prev => prev.filter(m => m.id !== matId));
    deleteStudyMaterialFromFirestore(matId);

    // Also delete the associated file from Firebase Storage to prevent orphaned files.
    // Only attempt if the URL is a Firebase Storage URL (contains firebasestorage.googleapis.com).
    if (material?.fileUrl && material.fileUrl.includes('firebasestorage.googleapis.com')) {
      import('../../lib/firebase').then(({ deleteFileFromStorage }) => {
        // Extract the storage path from the download URL.
        // Firebase Storage download URLs encode the path as: /o/{encodedPath}?
        try {
          const url = new URL(material.fileUrl);
          const encodedPath = url.pathname.split('/o/')[1];
          if (encodedPath) {
            const storagePath = decodeURIComponent(encodedPath.split('?')[0]);
            deleteFileFromStorage(storagePath).catch(err => {
              console.warn(`Could not delete storage file for material ${matId}:`, err);
            });
          }
        } catch (e) {
          console.warn('Could not parse storage URL for cleanup:', e);
        }
      });
    }
  };

  // --- F6 — timetable CRUD (weekly schedule + optional live class link) --------
  const addTimetableSlot = (data: Omit<TimetableSlot, 'id' | 'orgId' | 'branchId'> & { branchId?: string }): TimetableSlot => {
    const newSlot: TimetableSlot = {
      ...data,
      id: `tt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      orgId: currentOrg.id,
      branchId:
        data.branchId ||
        (selectedBranchId !== 'all' ? selectedBranchId : currentOrg.branches?.[0]?.id || 'branch-1'),
      meetUrl: normalizeMeetUrl(data.meetUrl) || undefined,
      meetPassword: data.meetPassword?.trim() || undefined
    };
    setTimetableSlots(prev => [...prev, newSlot]);
    persistTimetableSlotToFirestore(newSlot);
    return newSlot;
  };

  const updateTimetableSlot = (slotId: string, updates: Partial<Omit<TimetableSlot, 'id' | 'orgId'>>) => {
    setTimetableSlots(prev => prev.map(slot => {
      if (slot.id !== slotId) return slot;
      const updated: TimetableSlot = {
        ...slot,
        ...updates,
        id: slot.id,
        orgId: slot.orgId
      };
      // Normalise only when the caller actually touched the link, so clearing a
      // previously-saved URL (meetUrl: '') really does remove it.
      if ('meetUrl' in updates) {
        updated.meetUrl = normalizeMeetUrl(updates.meetUrl) || undefined;
      }
      if ('meetPassword' in updates) {
        updated.meetPassword = updates.meetPassword?.trim() || undefined;
      }
      persistTimetableSlotToFirestore(updated);
      return updated;
    }));
  };

  const deleteTimetableSlot = (slotId: string) => {
    setTimetableSlots(prev => prev.filter(slot => slot.id !== slotId));
    deleteTimetableSlotFromFirestore(slotId);
  };

  return (
    <AcademicContext.Provider
      value={{
        teachers: tenantTeachers,
        exams: tenantExams,
        examResults: tenantExamResults,
        assignments: tenantAssignments,
        studyMaterials: tenantStudyMaterials,
        timetableSlots: tenantTimetable,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        deduplicateTeachers,
        createExam,
        deleteExam,
        saveExamResults,
        importExternalResults,
        createAssignment,
        deleteAssignment,
        addStudyMaterial,
        deleteStudyMaterial,
        addTimetableSlot,
        updateTimetableSlot,
        deleteTimetableSlot
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademics = () => {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademics must be used within an AcademicProvider');
  }
  return context;
};
