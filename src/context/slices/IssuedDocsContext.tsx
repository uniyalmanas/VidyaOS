/**
 * F9 — issued student documents (ID card + Transfer Certificate) slice.
 *
 * Keeps the `issuedDocuments` accession register in real time and exposes the
 * two "issue" mutations behind the print modals. A TC gets its serial
 * (`PREFIX/YEAR/NNN`) computed here from the register — max-issued + 1, so a
 * number is never handed out twice. Both flows are desk-only: students/parents
 * can view (and re-print) their own cards, but never create a register entry,
 * exactly as the `issuedDocuments` rules enforce.
 *
 * Shape follows `PtmContext` (state + tenant filter + realtime subscribe) with
 * the `SyllabusContext` audit hook-up.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { IssuedDocument, Organization, Student, TcIssueInput, User, UserRole } from '../../types';
import { MOCK_ISSUED_DOCUMENTS } from '../../data/mockData';
import {
  subscribeToIssuedDocuments,
  persistIssuedDocumentToFirestore
} from '../../lib/firestoreService';
import {
  latestIssued,
  issuedForStudent,
  nextTcNumber,
  tcNumberPrefix,
  validateTcInput
} from '../../lib/issuedDocuments';
import { useStudents } from './StudentContext';
import { useAuditLog } from './AuditContext';

export interface IssuedDocsContextType {
  issuedDocuments: IssuedDocument[];
  /** True for CENTER_ADMIN / STAFF / PLATFORM_OWNER — only they may issue. */
  canIssue: boolean;
  /** Record + return a printed ID card entry (desk only). */
  issueIdCard: (student: Student) => IssuedDocument | null;
  /** Record + return a printed TC entry with the next serial (desk only). */
  issueTc: (student: Student, input: TcIssueInput) => IssuedDocument | null;
  /** The serial the next TC for this org/year would receive (preview). */
  nextTcNo: () => string;
  documentsForStudent: (studentId: string) => IssuedDocument[];
  latestIdCardFor: (studentId: string) => IssuedDocument | null;
  latestTcFor: (studentId: string) => IssuedDocument | null;
}

const IssuedDocsContext = createContext<IssuedDocsContextType | undefined>(undefined);

interface IssuedDocsProviderProps {
  currentOrg: Organization;
  selectedBranchId: string;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

const DESK_ROLES: UserRole[] = ['CENTER_ADMIN', 'STAFF', 'PLATFORM_OWNER'];

export const IssuedDocsProvider: React.FC<IssuedDocsProviderProps> = ({
  currentOrg,
  selectedBranchId,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const { students, selectedChild } = useStudents();
  const { recordAudit } = useAuditLog();

  const [issuedDocuments, setIssuedDocuments] = useState<IssuedDocument[]>(() =>
    import.meta.env.DEV ? MOCK_ISSUED_DOCUMENTS : []
  );

  const canIssue = DESK_ROLES.includes(currentUser.role);

  // The student (or guardian) whose own register slice this session may read:
  // the rules only let a non-staff reader through when the query pins the
  // studentId to a record they are linked to.
  const pinnedStudentId = useMemo(() => {
    if (currentUser.role === 'STUDENT') {
      return (
        students.find(s => s.userId === currentUser.id) ||
        students.find(s => s.id === currentUser.id)
      )?.id;
    }
    if (currentUser.role === 'PARENT') {
      return selectedChild?.id;
    }
    return undefined;
  }, [currentUser.role, currentUser.id, students, selectedChild]);

  // Real-time subscription, matching every other slice.
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const unsub = subscribeToIssuedDocuments(
      data => {
        if (data) setIssuedDocuments(data);
      },
      targetOrg,
      canIssue ? undefined : pinnedStudentId
    );
    return () => unsub();
  }, [currentOrg.id, isPlatformOwner, canIssue, pinnedStudentId]);

  // DEV mirror so the demo register survives a reload without Firestore.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    try {
      localStorage.setItem('vidyaos_issued_documents', JSON.stringify(issuedDocuments));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [issuedDocuments]);

  const tenantDocuments = useMemo(() => {
    if (isPlatformOwner) return issuedDocuments;
    return issuedDocuments.filter(
      d =>
        d.orgId === currentOrg.id &&
        (selectedBranchId === 'all' || d.branchId === selectedBranchId)
    );
  }, [issuedDocuments, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const issueIdCard = (student: Student): IssuedDocument | null => {
    if (!canIssue) return null;
    const document: IssuedDocument = {
      id: `doc-id-${Date.now().toString(36)}`,
      orgId: currentOrg.id,
      branchId: student.branchId || currentOrg.branches[0]?.id || 'branch-main',
      studentId: student.id,
      type: 'id_card',
      tcNo: null,
      leavingDate: null,
      remarks: null,
      issuedAt: new Date().toISOString(),
      issuedByUserId: currentUser.id,
      issuedByName: currentUser.name
    };
    setIssuedDocuments(prev => [document, ...prev]);
    persistIssuedDocumentToFirestore(document).catch(() => {});
    recordAudit({
      action: 'create',
      targetType: 'issued_document',
      targetId: document.id,
      summary: `Printed student ID card for ${student.name} (${student.enrollmentNo}).`,
      branchId: document.branchId
    });
    return document;
  };

  const issueTc = (student: Student, input: TcIssueInput): IssuedDocument | null => {
    if (!canIssue) return null;
    if (validateTcInput(input)) return null;
    const prefix = tcNumberPrefix(currentOrg);
    const document: IssuedDocument = {
      id: `doc-tc-${Date.now().toString(36)}`,
      orgId: currentOrg.id,
      branchId: student.branchId || currentOrg.branches[0]?.id || 'branch-main',
      studentId: student.id,
      type: 'tc',
      tcNo: nextTcNumber(issuedDocuments, prefix),
      leavingDate: input.leavingDate?.trim() || null,
      remarks: input.remarks?.trim() || null,
      issuedAt: new Date().toISOString(),
      issuedByUserId: currentUser.id,
      issuedByName: currentUser.name
    };
    setIssuedDocuments(prev => [document, ...prev]);
    persistIssuedDocumentToFirestore(document).catch(() => {});
    recordAudit({
      action: 'create',
      targetType: 'issued_document',
      targetId: document.id,
      summary: `Issued Transfer Certificate ${document.tcNo} to ${student.name} (${student.enrollmentNo}).`,
      branchId: document.branchId
    });
    return document;
  };

  const nextTcNo = () => nextTcNumber(issuedDocuments, tcNumberPrefix(currentOrg));

  const documentsForStudent = (studentId: string) => issuedForStudent(issuedDocuments, studentId);
  const latestIdCardFor = (studentId: string) => latestIssued(issuedDocuments, studentId, 'id_card');
  const latestTcFor = (studentId: string) => latestIssued(issuedDocuments, studentId, 'tc');

  return (
    <IssuedDocsContext.Provider
      value={{
        issuedDocuments,
        canIssue,
        issueIdCard,
        issueTc,
        nextTcNo,
        documentsForStudent,
        latestIdCardFor,
        latestTcFor
      }}
    >
      {children}
    </IssuedDocsContext.Provider>
  );
};

export const useIssuedDocs = () => {
  const context = useContext(IssuedDocsContext);
  if (!context) {
    throw new Error('useIssuedDocs must be used within an IssuedDocsProvider');
  }
  return context;
};