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
  persistTeacherToFirestore,
  deleteTeacherFromFirestore,
  persistExamToFirestore,
  deleteExamFromFirestore,
  persistExamResultsToFirestore,
  persistAssignmentToFirestore,
  deleteAssignmentFromFirestore,
  persistStudyMaterialToFirestore,
  deleteStudyMaterialFromFirestore
} from '../../lib/firestoreService';

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
  createAssignment: (assign: Omit<Assignment, 'id' | 'orgId' | 'submissions'>) => Assignment;
  deleteAssignment: (assignId: string) => void;
  addStudyMaterial: (mat: Omit<StudyMaterial, 'id' | 'orgId' | 'uploadedAt'>) => StudyMaterial;
  deleteStudyMaterial: (matId: string) => void;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

interface AcademicProviderProps {
  currentOrg: Organization;
  selectedBranchId: string;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

export const AcademicProvider: React.FC<AcademicProviderProps> = ({
  currentOrg,
  selectedBranchId,
  isPlatformOwner,
  children
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('vidyaos_teachers');
    return saved ? JSON.parse(saved) : MOCK_TEACHERS;
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem('vidyaos_exams');
    return saved ? JSON.parse(saved) : MOCK_EXAMS;
  });

  const [examResults, setExamResults] = useState<ExamResult[]>(() => {
    const saved = localStorage.getItem('vidyaos_results');
    return saved ? JSON.parse(saved) : MOCK_EXAM_RESULTS;
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem('vidyaos_assignments');
    return saved ? JSON.parse(saved) : MOCK_ASSIGNMENTS;
  });

  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>(() => {
    const saved = localStorage.getItem('vidyaos_materials');
    return saved ? JSON.parse(saved) : MOCK_STUDY_MATERIALS;
  });

  const [timetableSlots] = useState<TimetableSlot[]>(MOCK_TIMETABLE);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('vidyaos_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('vidyaos_exams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem('vidyaos_results', JSON.stringify(examResults));
  }, [examResults]);

  useEffect(() => {
    localStorage.setItem('vidyaos_assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('vidyaos_materials', JSON.stringify(studyMaterials));
  }, [studyMaterials]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;

    const unsubTeachers = subscribeToTeachers(data => {
      if (data) setTeachers(data);
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

    return () => {
      unsubTeachers();
      unsubExams();
      unsubResults();
      unsubAssignments();
      unsubMaterials();
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
    const newTeacher: Teacher = {
      userId: data.userId || `user-${Date.now()}`,
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
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
    deleteTeacherFromFirestore(teacherId);
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
    setStudyMaterials(prev => prev.filter(m => m.id !== matId));
    deleteStudyMaterialFromFirestore(matId);
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
        createExam,
        deleteExam,
        saveExamResults,
        createAssignment,
        deleteAssignment,
        addStudyMaterial,
        deleteStudyMaterial
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
