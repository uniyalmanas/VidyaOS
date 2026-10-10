import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  Organization,
  User,
  Student,
  Teacher,
  Batch,
  AttendanceRecord,
  FeeInvoice,
  PaymentRecord,
  Exam,
  ExamResult,
  Assignment,
  PaymentSubmission,
  StudyMaterial,
  TimetableSlot,
  Announcement,
  SubscriptionPlan,
  UserRole,
  AttendanceStatus,
  NotificationItem,
  ChatChannel,
  ChatMessage,
  ChatMessageTag,
  ChatMessageAttachment,
  AuditLogEntry,
  Inquiry,
  LeaveRequest,
  TeacherAttendance,
  SalarySlip,
  Expense,
  SyllabusTopic,
  SyllabusStatus,
  PtmEvent,
  PtmEventInput,
  PtmSlot,
  IssuedDocument,
  TcIssueInput
} from '../types';
import {
  MOCK_ORGANIZATIONS,
  MOCK_USERS,
  SUBSCRIPTION_PLANS
} from '../data/mockData';
import {
  subscribeToOrganizations,
  subscribeUsersPaginated,
  persistOrganizationToFirestore,
  persistUserRoleToFirestore,
  seedInitialFirestoreDataIfEmpty
} from '../lib/firestoreService';
import { FREE_ENTITLEMENTS } from '../lib/entitlements';

// Domain Slices
import { StudentProvider, useStudents, EnrollmentResult } from './slices/StudentContext';
import { FeeProvider, useFees } from './slices/FeeContext';
import { AttendanceProvider, useAttendance } from './slices/AttendanceContext';
import { AcademicProvider, useAcademics } from './slices/AcademicContext';
import { CommunicationProvider, useCommunication } from './slices/CommunicationContext';
import { AuditProvider, useAuditLog } from './slices/AuditContext';
import { RecordAuditInput } from '../lib/audit';
import { InquiryProvider, useInquiries, NewInquiryInput } from './slices/InquiryContext';
import {
  LeaveProvider,
  useLeaveRequests,
  NewLeaveInput,
  LeaveReviewDecision
} from './slices/LeaveContext';
import {
  StaffOpsProvider,
  useStaffOps,
  NewSalarySlipInput,
  MarkAttendanceOptions
} from './slices/StaffOpsContext';
import { FinanceProvider, useFinance, ExpenseEdit } from './slices/FinanceContext';
import {
  SyllabusProvider,
  useSyllabus,
  SyllabusCreateParams,
  TopicStatusMeta
} from './slices/SyllabusContext';
import {
  PtmProvider,
  usePtm,
  PtmCreateResult,
  PtmBookingResult
} from './slices/PtmContext';
import {
  IssuedDocsProvider,
  useIssuedDocs
} from './slices/IssuedDocsContext';
import {
  RolloverProvider,
  useRollover,
  RolloverPreviewInput,
  RolloverExecutionResult
} from './slices/RolloverContext';
import { RolloverPlan } from '../lib/rollover';
import { NewExpenseInput } from '../lib/finance';

// Export domain hooks for direct fine-grained consumption
export { useStudents } from './slices/StudentContext';
export { useFees } from './slices/FeeContext';
export { useAttendance } from './slices/AttendanceContext';
export { useAcademics } from './slices/AcademicContext';
export { useCommunication, useChat } from './slices/CommunicationContext';
export { useAuditLog } from './slices/AuditContext';
export { useIssuedDocs } from './slices/IssuedDocsContext';
export { useInquiries } from './slices/InquiryContext';
export { useLeaveRequests } from './slices/LeaveContext';
export { useStaffOps } from './slices/StaffOpsContext';
export { useFinance } from './slices/FinanceContext';
export { usePtm } from './slices/PtmContext';
export { useSyllabus } from './slices/SyllabusContext';
export { useRollover } from './slices/RolloverContext';

export interface AppContextType {
  // Tenancy & Session
  organizations: Organization[];
  currentOrg: Organization;
  setCurrentOrgId: (orgId: string) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole, specificUserId?: string) => void;
  allUsers: User[];
  usersHasMore: boolean;
  loadMoreUsers: () => Promise<number>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  studentsHasMore: boolean;
  loadMoreStudents: () => Promise<number>;
  invoicesHasMore: boolean;
  loadMoreInvoices: () => Promise<number>;
  attendanceHasMore: boolean;
  loadMoreAttendance: () => Promise<number>;
  auditLogsHasMore: boolean;
  loadMoreAuditLogs: () => Promise<number>;
  
  // Parent multi-child
  selectedChildId: string;
  setSelectedChildId: (studentId: string) => void;
  selectedChild: Student | undefined;
  parentLinkedChildren: Student[];

  // Branch filter
  selectedBranchId: string; // 'all' or branchId
  setSelectedBranchId: (branchId: string) => void;

  // Active navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileViewActive: boolean;
  setMobileViewActive: (v: boolean) => void;

  // Audit trail (F1) — append-only change history
  auditLogs: AuditLogEntry[];
  recordAudit: (input: RecordAuditInput) => void;

  // Leads & admissions (F2) — inquiry pipeline CRM
  inquiries: Inquiry[];
  addInquiry: (input: NewInquiryInput) => Inquiry;
  updateInquiry: (inquiryId: string, updates: Partial<Inquiry>) => void;
  addInquiryNote: (inquiryId: string, text: string) => void;
  markInquiryConverted: (inquiryId: string, studentId: string, studentName: string) => void;
  deleteInquiry: (inquiryId: string) => void;

  // Leave requests (F3) — absences filed → reviewed → excused into attendance
  leaveRequests: LeaveRequest[];
  submitLeaveRequest: (input: NewLeaveInput) => LeaveRequest | null;
  updateLeaveRequest: (
    leaveId: string,
    updates: Partial<Pick<LeaveRequest, 'startDate' | 'endDate' | 'category' | 'reason'>>
  ) => void;
  reviewLeaveRequest: (leaveId: string, decision: LeaveReviewDecision, reviewNote?: string) => void;
  deleteLeaveRequest: (leaveId: string) => void;

  // Staff ops (F4) — faculty self-attendance + salary slips
  teacherAttendance: TeacherAttendance[];
  salarySlips: SalarySlip[];
  markTeacherAttendance: (
    teacherId: string,
    status: TeacherAttendance['status'],
    options?: MarkAttendanceOptions
  ) => void;
  clearTeacherAttendance: (teacherId: string, date: string) => void;
  issueSalarySlip: (input: NewSalarySlipInput) => SalarySlip | null;
  issueDraftSlip: (slipId: string) => void;
  markSlipPaid: (slipId: string, method: PaymentRecord['paymentMethod']) => void;
  deleteSalarySlip: (slipId: string) => void;

  // Finance (F5) — expense tracking & profit/loss
  expenses: Expense[];
  addExpense: (input: NewExpenseInput) => Expense | null;
  updateExpense: (expenseId: string, updates: ExpenseEdit) => Expense | null;
  deleteExpense: (expenseId: string) => void;

  // Syllabus coverage (F7) — chapter-by-chapter checklist per batch
  syllabusTopics: SyllabusTopic[];
  createTopicsFromTemplate: (params: SyllabusCreateParams) => SyllabusTopic[];
  updateTopicStatus: (topicId: string, status: SyllabusStatus, meta?: TopicStatusMeta) => void;
  updateSyllabusTopic: (topicId: string, updates: Partial<Omit<SyllabusTopic, 'id' | 'orgId'>>) => void;
  deleteSyllabusTopic: (topicId: string) => void;
  deleteTopicsForBatch: (batchId: string) => void;

  // PTM (F8) — parent–teacher meeting events + slots
  ptmEvents: PtmEvent[];
  ptmSlots: PtmSlot[];
  createEvent: (input: PtmEventInput) => PtmCreateResult;
  generateSlots: (eventId: string) => PtmSlot[];
  bookSlot: (
    slotId: string,
    studentId: string,
    studentName: string
  ) => Promise<PtmBookingResult>;
  cancelBooking: (slotId: string) => Promise<PtmBookingResult>;
  deleteEvent: (eventId: string) => void;
  myBookings: PtmSlot[];
  myTeacherSlots: PtmSlot[];

  // Issued documents (F9) — student ID card + Transfer Certificate register
  issuedDocuments: IssuedDocument[];
  canIssueDocuments: boolean;
  issueIdCard: (student: Student) => IssuedDocument | null;
  issueTc: (student: Student, input: TcIssueInput) => IssuedDocument | null;
  nextTcNo: () => string;
  documentsForStudent: (studentId: string) => IssuedDocument[];
  latestIdCardFor: (studentId: string) => IssuedDocument | null;
  latestTcFor: (studentId: string) => IssuedDocument | null;

  // Session rollover (F12) — new academic year wizard
  previewRollover: (input: RolloverPreviewInput) => RolloverPlan;
  executeRollover: (plan: RolloverPlan) => Promise<RolloverExecutionResult>;
  suggestedRolloverYears: () => { fromYear: string; toYear: string } | null;

  // Data collections (Tenant-isolated)
  students: Student[];
  teachers: Teacher[];
  batches: Batch[];
  attendanceRecords: AttendanceRecord[];
  invoices: FeeInvoice[];
  pendingPaymentSubmissions: PaymentSubmission[];
  exams: Exam[];
  examResults: ExamResult[];
  assignments: Assignment[];
  studyMaterials: StudyMaterial[];
  timetableSlots: TimetableSlot[];
  announcements: Announcement[];
  subscriptionPlans: SubscriptionPlan[];
  notifications: NotificationItem[];

  // Mutations
  addStudent: (student: Omit<Student, 'id' | 'orgId' | 'enrollmentNo'>) => Student;
  updateStudent: (studentId: string, updates: Partial<Student>) => void;
  deleteStudent: (studentId: string) => void;
  
  addBatch: (batch: Omit<Batch, 'id' | 'orgId'>) => Batch;
  updateBatch: (batchId: string, updates: Partial<Batch>) => void;
  enrollStudentInBatch: (studentId: string, batchId: string) => Promise<EnrollmentResult>;
  removeStudentFromBatch: (studentId: string, batchId: string) => Promise<EnrollmentResult>;
  
  addTeacher: (teacher: Omit<Teacher, 'id' | 'orgId' | 'userId' | 'joiningDate'> & Partial<Pick<Teacher, 'userId' | 'joiningDate'>>) => Teacher;
  updateTeacher: (teacherId: string, updates: Partial<Teacher>) => void;
  deleteTeacher: (teacherId: string) => void;
  deduplicateTeachers: () => { removedCount: number; mergedCount: number };
  
  markAttendance: (record: { batchId: string; studentId: string; date: string; status: AttendanceStatus; remarks?: string }) => void;
  markBatchAllPresent: (batchId: string, date: string) => void;
  
  recordPayment: (invoiceId: string, payment: { amount: number; paymentMethod: PaymentRecord['paymentMethod']; transactionRef?: string; upiApp?: PaymentRecord['upiApp'] }) => Promise<PaymentRecord>;
  submitPendingPayment: (invoiceId: string, payment: { amount: number; paymentMethod: 'UPI'; transactionRef: string; upiApp?: PaymentRecord['upiApp'] }) => Promise<PaymentSubmission>;
  verifyPayment: (submissionId: string) => Promise<void>;
  rejectPayment: (submissionId: string, reason?: string) => Promise<void>;
  createInvoice: (invoice: Omit<FeeInvoice, 'id' | 'orgId' | 'invoiceNo' | 'payments' | 'createdAt'>) => FeeInvoice;
  
  createExam: (exam: Omit<Exam, 'id' | 'orgId'>) => Exam;
  saveExamResults: (examId: string, marksData: { studentId: string; marksObtained: number; remarks?: string }[]) => void;
  importExternalResults: (examId: string, rows: { studentId: string; externalRank: number; externalTotalStudents?: number; externalPercentile?: number }[]) => { updated: number; created: number };
  
  createAssignment: (assign: Omit<Assignment, 'id' | 'orgId' | 'submissions'>) => Assignment;
  addStudyMaterial: (mat: Omit<StudyMaterial, 'id' | 'orgId' | 'uploadedAt'>) => StudyMaterial;
  deleteStudyMaterial: (matId: string) => void;
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id' | 'orgId' | 'branchId'> & { branchId?: string }) => TimetableSlot;
  updateTimetableSlot: (slotId: string, updates: Partial<Omit<TimetableSlot, 'id' | 'orgId'>>) => void;
  deleteTimetableSlot: (slotId: string) => void;
  
  createAnnouncement: (announcement: Omit<Announcement, 'id' | 'orgId' | 'createdAt' | 'createdBy'>) => Announcement;
  
  // Platform Owner & Center Admin actions
  toggleOrgStatus: (orgId: string, newStatus: Organization['subscriptionStatus']) => void;
  changeOrgPlan: (orgId: string, planId: Organization['planId']) => void;
  createNewOrganization: (orgData: Partial<Organization>) => Promise<Organization>;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => void;

  // Modals & triggers
  activeReceiptInvoice: FeeInvoice | null;
  setActiveReceiptInvoice: (inv: FeeInvoice | null) => void;
  activeUpiModalInvoice: FeeInvoice | null;
  setActiveUpiModalInvoice: (inv: FeeInvoice | null) => void;
  activeWhatsappModal: { title: string; phone: string; message: string } | null;
  setActiveWhatsappModal: (data: { title: string; phone: string; message: string } | null) => void;
  showArchitectureModal: boolean;
  setShowArchitectureModal: (show: boolean) => void;
  showHelpModal: boolean;
  setShowHelpModal: (show: boolean) => void;
  showGroundingModal: boolean;
  setShowGroundingModal: (show: boolean) => void;
  toast: { message: string; type: 'success' | 'info' | 'error' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;

  // VidyaChat (Slack for Educational Institutes)
  chatChannels: ChatChannel[];
  chatMessages: ChatMessage[];
  activeChatChannelId: string;
  setActiveChatChannelId: (channelId: string) => void;
  sendChatMessage: (channelId: string, content: string, tag?: ChatMessageTag, attachments?: ChatMessageAttachment[]) => Promise<ChatMessage | null>;
  addChatReaction: (messageId: string, emoji: string) => Promise<void>;
  createChatChannel: (channel: Omit<ChatChannel, 'id' | 'orgId'>) => ChatChannel;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const EMPTY_ORGANIZATION: Organization = {
  id: '',
  ownerUid: '',
  name: '',
  slug: '',
  tagline: '',
  logoText: '',
  ownerName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  upiId: '',
  upiMerchantName: '',
  branches: [],
  planId: 'starter',
  subscriptionStatus: 'active',
  trialEndsAt: '',
  currentCycleEnd: '',
  createdAt: '',
  maxStudents: 0,
  maxBranches: 0
};

const EMPTY_USER: User = {
  id: '',
  orgId: '',
  role: 'STUDENT',
  name: '',
  phone: '',
  email: ''
};

// Inner Composer to assemble domain slices and provide composite AppContextType
interface CompositeProps {
  organizations: Organization[];
  currentOrg: Organization;
  setCurrentOrgId: (id: string) => void;
  currentUser: User;
  setCurrentUser: (u: User) => void;
  switchRole: (role: UserRole, specificUserId?: string) => void;
  allUsers: User[];
  usersHasMore: boolean;
  loadMoreUsers: () => Promise<number>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileViewActive: boolean;
  setMobileViewActive: (v: boolean) => void;
  toggleOrgStatus: (orgId: string, newStatus: Organization['subscriptionStatus']) => void;
  changeOrgPlan: (orgId: string, planId: Organization['planId']) => void;
  createNewOrganization: (orgData: Partial<Organization>) => Promise<Organization>;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => void;
  activeWhatsappModal: { title: string; phone: string; message: string } | null;
  setActiveWhatsappModal: (data: { title: string; phone: string; message: string } | null) => void;
  showArchitectureModal: boolean;
  setShowArchitectureModal: (show: boolean) => void;
  showHelpModal: boolean;
  setShowHelpModal: (show: boolean) => void;
  showGroundingModal: boolean;
  setShowGroundingModal: (show: boolean) => void;
  toast: { message: string; type: 'success' | 'info' | 'error' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  children: React.ReactNode;
}

const AppDomainComposer: React.FC<CompositeProps> = (props) => {
  const isPlatformOwner = props.currentUser.role === 'PLATFORM_OWNER';

  return (
    <StudentProvider
      currentOrg={props.currentOrg}
      selectedBranchId={props.selectedBranchId}
      currentUser={props.currentUser}
      isPlatformOwner={isPlatformOwner}
    >
      <StudentDependentSlices {...props} isPlatformOwner={isPlatformOwner} />
    </StudentProvider>
  );
};

const StudentDependentSlices: React.FC<CompositeProps & { isPlatformOwner: boolean }> = (props) => {
  const studentSlice = useStudents();

  return (
    <FeeProvider
      currentOrg={props.currentOrg}
      selectedBranchId={props.selectedBranchId}
      currentUser={props.currentUser}
      isPlatformOwner={props.isPlatformOwner}
    >
      <AttendanceProvider
        currentOrg={props.currentOrg}
        selectedBranchId={props.selectedBranchId}
        currentUser={props.currentUser}
        batches={studentSlice.batches}
        isPlatformOwner={props.isPlatformOwner}
      >
        <AcademicProvider
          currentOrg={props.currentOrg}
          selectedBranchId={props.selectedBranchId}
          isPlatformOwner={props.isPlatformOwner}
        >
          <SyllabusProvider
            currentOrg={props.currentOrg}
            selectedBranchId={props.selectedBranchId}
            currentUser={props.currentUser}
            batches={studentSlice.batches}
            isPlatformOwner={props.isPlatformOwner}
          >
          <CommunicationProvider
            currentOrg={props.currentOrg}
            currentUser={props.currentUser}
            batches={studentSlice.batches}
            selectedBranchId={props.selectedBranchId}
            isPlatformOwner={props.isPlatformOwner}
            onShowToast={props.showToast}
          >
            <AuditProvider
              currentOrg={props.currentOrg}
              currentUser={props.currentUser}
              isPlatformOwner={props.isPlatformOwner}
            >
              <RolloverProvider
                currentOrg={props.currentOrg}
                selectedBranchId={props.selectedBranchId}
                currentUser={props.currentUser}
                isPlatformOwner={props.isPlatformOwner}
              >
                <InquiryProvider
                  currentOrg={props.currentOrg}
                  currentUser={props.currentUser}
                  isPlatformOwner={props.isPlatformOwner}
                >
                  <LeaveProvider
                    currentOrg={props.currentOrg}
                    currentUser={props.currentUser}
                    isPlatformOwner={props.isPlatformOwner}
                  >
                    <StaffOpsProvider
                      currentOrg={props.currentOrg}
                      currentUser={props.currentUser}
                      isPlatformOwner={props.isPlatformOwner}
                    >
                      <FinanceProvider
                        currentOrg={props.currentOrg}
                        currentUser={props.currentUser}
                        isPlatformOwner={props.isPlatformOwner}
                      >
                        <PtmProvider
                          currentOrg={props.currentOrg}
                          selectedBranchId={props.selectedBranchId}
                          currentUser={props.currentUser}
                          isPlatformOwner={props.isPlatformOwner}
                        >
                          <IssuedDocsProvider
                            currentOrg={props.currentOrg}
                            selectedBranchId={props.selectedBranchId}
                            currentUser={props.currentUser}
                            isPlatformOwner={props.isPlatformOwner}
                          >
                            <UnifiedAppProvider {...props} studentSlice={studentSlice} />
                          </IssuedDocsProvider>
                        </PtmProvider>
                      </FinanceProvider>
                    </StaffOpsProvider>
                  </LeaveProvider>
                </InquiryProvider>
              </RolloverProvider>
            </AuditProvider>
          </CommunicationProvider>
          </SyllabusProvider>
        </AcademicProvider>
      </AttendanceProvider>
    </FeeProvider>
  );
};

const UnifiedAppProvider: React.FC<CompositeProps & { studentSlice: ReturnType<typeof useStudents> }> = ({
  studentSlice,
  children,
  ...coreProps
}) => {
  const feeSlice = useFees();
  const attendanceSlice = useAttendance();
  const academicSlice = useAcademics();
  const commSlice = useCommunication();
  const auditSlice = useAuditLog();
  const inquirySlice = useInquiries();
  const leaveSlice = useLeaveRequests();
  const staffOpsSlice = useStaffOps();
  const financeSlice = useFinance();
  const syllabusSlice = useSyllabus();
  const ptmSlice = usePtm();
  const issuedDocsSlice = useIssuedDocs();
  const rolloverSlice = useRollover();

  const fullContextValue: AppContextType = {
    // Tenancy & session
    organizations: coreProps.organizations,
    currentOrg: coreProps.currentOrg,
    setCurrentOrgId: coreProps.setCurrentOrgId,
    currentUser: coreProps.currentUser,
    setCurrentUser: coreProps.setCurrentUser,
    switchRole: coreProps.switchRole,
    allUsers: coreProps.allUsers,
    usersHasMore: coreProps.usersHasMore,
    loadMoreUsers: coreProps.loadMoreUsers,
    updateUserRole: coreProps.updateUserRole,
    selectedBranchId: coreProps.selectedBranchId,
    setSelectedBranchId: coreProps.setSelectedBranchId,
    activeTab: coreProps.activeTab,
    setActiveTab: coreProps.setActiveTab,
    mobileViewActive: coreProps.mobileViewActive,
    setMobileViewActive: coreProps.setMobileViewActive,
    toggleOrgStatus: coreProps.toggleOrgStatus,
    changeOrgPlan: coreProps.changeOrgPlan,
    createNewOrganization: coreProps.createNewOrganization,
    updateOrganization: coreProps.updateOrganization,

    // Modals & UI
    activeReceiptInvoice: feeSlice.activeReceiptInvoice,
    setActiveReceiptInvoice: feeSlice.setActiveReceiptInvoice,
    activeUpiModalInvoice: feeSlice.activeUpiModalInvoice,
    setActiveUpiModalInvoice: feeSlice.setActiveUpiModalInvoice,
    activeWhatsappModal: coreProps.activeWhatsappModal,
    setActiveWhatsappModal: coreProps.setActiveWhatsappModal,
    showArchitectureModal: coreProps.showArchitectureModal,
    setShowArchitectureModal: coreProps.setShowArchitectureModal,
    showHelpModal: coreProps.showHelpModal,
    setShowHelpModal: coreProps.setShowHelpModal,
    showGroundingModal: coreProps.showGroundingModal,
    setShowGroundingModal: coreProps.setShowGroundingModal,
    toast: coreProps.toast,
    showToast: coreProps.showToast,

    // Student & Batch domain
    students: studentSlice.students,
    batches: studentSlice.batches,
    studentsHasMore: studentSlice.studentsHasMore,
    loadMoreStudents: studentSlice.loadMoreStudents,
    addStudent: studentSlice.addStudent,
    updateStudent: studentSlice.updateStudent,
    deleteStudent: studentSlice.deleteStudent,
    addBatch: studentSlice.addBatch,
    updateBatch: studentSlice.updateBatch,
    enrollStudentInBatch: studentSlice.enrollStudentInBatch,
    removeStudentFromBatch: studentSlice.removeStudentFromBatch,
    selectedChildId: studentSlice.selectedChildId,
    setSelectedChildId: studentSlice.setSelectedChildId,
    selectedChild: studentSlice.selectedChild,
    parentLinkedChildren: studentSlice.parentLinkedChildren,

    // Fee domain
    invoices: feeSlice.invoices,
    invoicesHasMore: feeSlice.invoicesHasMore,
    loadMoreInvoices: feeSlice.loadMoreInvoices,
    pendingPaymentSubmissions: feeSlice.pendingPaymentSubmissions,
    recordPayment: feeSlice.recordPayment,
    submitPendingPayment: feeSlice.submitPendingPayment,
    verifyPayment: feeSlice.verifyPayment,
    rejectPayment: feeSlice.rejectPayment,
    createInvoice: feeSlice.createInvoice,

    // Attendance domain
    attendanceRecords: attendanceSlice.attendanceRecords,
    attendanceHasMore: attendanceSlice.attendanceHasMore,
    loadMoreAttendance: attendanceSlice.loadMoreAttendance,
    markAttendance: attendanceSlice.markAttendance,
    markBatchAllPresent: attendanceSlice.markBatchAllPresent,

    // Academic domain
    teachers: academicSlice.teachers,
    exams: academicSlice.exams,
    examResults: academicSlice.examResults,
    assignments: academicSlice.assignments,
    studyMaterials: academicSlice.studyMaterials,
    timetableSlots: academicSlice.timetableSlots,
    addTeacher: academicSlice.addTeacher,
    updateTeacher: academicSlice.updateTeacher,
    deleteTeacher: academicSlice.deleteTeacher,
    deduplicateTeachers: academicSlice.deduplicateTeachers,
    createExam: academicSlice.createExam,
    saveExamResults: academicSlice.saveExamResults,
    importExternalResults: academicSlice.importExternalResults,
    createAssignment: academicSlice.createAssignment,
    addStudyMaterial: academicSlice.addStudyMaterial,
    deleteStudyMaterial: academicSlice.deleteStudyMaterial,
    addTimetableSlot: academicSlice.addTimetableSlot,
    updateTimetableSlot: academicSlice.updateTimetableSlot,
    deleteTimetableSlot: academicSlice.deleteTimetableSlot,

    // Communication & Chat domain
    announcements: commSlice.announcements,
    createAnnouncement: commSlice.createAnnouncement,
    subscriptionPlans: SUBSCRIPTION_PLANS,
    notifications: commSlice.notifications,

    // Audit trail (F1) — append-only change history
    auditLogs: auditSlice.auditLogs,
    auditLogsHasMore: auditSlice.auditLogsHasMore,
    loadMoreAuditLogs: auditSlice.loadMoreAuditLogs,
    recordAudit: auditSlice.recordAudit,

    // Leads & admissions (F2) — inquiry pipeline CRM
    inquiries: inquirySlice.inquiries,
    addInquiry: inquirySlice.addInquiry,
    updateInquiry: inquirySlice.updateInquiry,
    addInquiryNote: inquirySlice.addInquiryNote,
    markInquiryConverted: inquirySlice.markInquiryConverted,
    deleteInquiry: inquirySlice.deleteInquiry,
    leaveRequests: leaveSlice.leaveRequests,
    submitLeaveRequest: leaveSlice.submitLeaveRequest,
    updateLeaveRequest: leaveSlice.updateLeaveRequest,
    reviewLeaveRequest: leaveSlice.reviewLeaveRequest,
    deleteLeaveRequest: leaveSlice.deleteLeaveRequest,
    // Staff ops (F4) — faculty self-attendance + salary slips
    teacherAttendance: staffOpsSlice.teacherAttendance,
    salarySlips: staffOpsSlice.salarySlips,
    markTeacherAttendance: staffOpsSlice.markTeacherAttendance,
    clearTeacherAttendance: staffOpsSlice.clearTeacherAttendance,
    issueSalarySlip: staffOpsSlice.issueSalarySlip,
    issueDraftSlip: staffOpsSlice.issueDraftSlip,
    markSlipPaid: staffOpsSlice.markSlipPaid,
    deleteSalarySlip: staffOpsSlice.deleteSalarySlip,
    // Finance (F5) — expense tracking & profit/loss
    expenses: financeSlice.expenses,
    addExpense: financeSlice.addExpense,
    updateExpense: financeSlice.updateExpense,
    deleteExpense: financeSlice.deleteExpense,

    // Syllabus coverage (F7)
    syllabusTopics: syllabusSlice.syllabusTopics,
    createTopicsFromTemplate: syllabusSlice.createTopicsFromTemplate,
    updateTopicStatus: syllabusSlice.updateTopicStatus,
    updateSyllabusTopic: syllabusSlice.updateSyllabusTopic,
    deleteSyllabusTopic: syllabusSlice.deleteSyllabusTopic,
    deleteTopicsForBatch: syllabusSlice.deleteTopicsForBatch,

    // PTM scheduler (F8)
    ptmEvents: ptmSlice.ptmEvents,
    ptmSlots: ptmSlice.ptmSlots,
    createEvent: ptmSlice.createEvent,
    generateSlots: ptmSlice.generateSlots,
    bookSlot: ptmSlice.bookSlot,
    cancelBooking: ptmSlice.cancelBooking,
    deleteEvent: ptmSlice.deleteEvent,
    myBookings: ptmSlice.myBookings,
    myTeacherSlots: ptmSlice.myTeacherSlots,

    // Issued documents (F9)
    issuedDocuments: issuedDocsSlice.issuedDocuments,
    canIssueDocuments: issuedDocsSlice.canIssue,
    issueIdCard: issuedDocsSlice.issueIdCard,
    issueTc: issuedDocsSlice.issueTc,
    nextTcNo: issuedDocsSlice.nextTcNo,
    documentsForStudent: issuedDocsSlice.documentsForStudent,
    latestIdCardFor: issuedDocsSlice.latestIdCardFor,
    latestTcFor: issuedDocsSlice.latestTcFor,

    // Session rollover (F12)
    previewRollover: rolloverSlice.previewRollover,
    executeRollover: rolloverSlice.executeRollover,
    suggestedRolloverYears: rolloverSlice.suggestedYears,

    chatChannels: commSlice.chatChannels,
    chatMessages: commSlice.chatMessages,
    activeChatChannelId: commSlice.activeChatChannelId,
    setActiveChatChannelId: commSlice.setActiveChatChannelId,
    sendChatMessage: commSlice.sendChatMessage,
    addChatReaction: commSlice.addChatReaction,
    createChatChannel: commSlice.createChatChannel
  };

  return (
    <AppContext.Provider value={fullContextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    const saved = localStorage.getItem('vidyaos_orgs');
    return saved ? JSON.parse(saved) : (import.meta.env.DEV ? MOCK_ORGANIZATIONS : []);
  });

  const [currentOrgId, setCurrentOrgIdState] = useState<string>(() => {
    return localStorage.getItem('vidyaos_current_org_id') || (import.meta.env.DEV ? 'org-apex' : '');
  });

  const currentOrg = useMemo(() => {
    return organizations.find(o => o.id === currentOrgId) || organizations[0] || EMPTY_ORGANIZATION;
  }, [organizations, currentOrgId]);

  const { currentUser: authUser, loginAsDemoUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>(import.meta.env.DEV ? MOCK_USERS : []);
  const [usersHasMore, setUsersHasMore] = useState(false);
  // Keeps the live paginated handle reachable from the "Load more" button.
  const usersHandleRef = useRef<ReturnType<typeof subscribeUsersPaginated> | null>(null);
  
  const currentUser: User = useMemo(() => {
    return authUser || (import.meta.env.DEV ? MOCK_USERS[1] : EMPTY_USER);
  }, [authUser]);

  const setCurrentUser = (user: User) => {
    loginAsDemoUser(user.id);
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    const userToUpdate = allUsers.find(u => u.id === userId);
    if (userToUpdate) {
      const updatedUser = { ...userToUpdate, role: newRole };
      setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      await persistUserRoleToFirestore(updatedUser);
      showToast(`User role updated to ${newRole.replace('_', ' ')} in Firestore`, 'success');
    }
  };

  // Sync organization when user belongs to an org
  useEffect(() => {
    if (authUser && authUser.orgId && authUser.orgId !== 'system' && authUser.orgId !== currentOrgId) {
      setCurrentOrgIdState(authUser.orgId);
    }
  }, [authUser]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mobileViewActive, setMobileViewActive] = useState<boolean>(false);

  // Real-time Firestore Subscriptions for Orgs and Users
  useEffect(() => {
    seedInitialFirestoreDataIfEmpty();

    const isPlatform = currentUser.role === 'PLATFORM_OWNER';
    const unsubOrgs = subscribeToOrganizations(data => {
      setOrganizations(data);
    }, currentOrgId, isPlatform);

    const targetOrg = isPlatform ? undefined : currentOrgId;
    const canListUsers = isPlatform || currentUser.role === 'CENTER_ADMIN';
    if (canListUsers) {
      const usersHandle = subscribeUsersPaginated((data, meta) => {
        setAllUsers(data);
        setUsersHasMore(meta.hasMore);
      }, targetOrg);
      usersHandleRef.current = usersHandle;
    } else {
      setAllUsers(currentUser.id ? [currentUser] : []);
      setUsersHasMore(false);
      usersHandleRef.current = null;
    }

    return () => {
      unsubOrgs();
      if (usersHandleRef.current) {
        usersHandleRef.current.unsubscribe();
        usersHandleRef.current = null;
      }
    };
  }, [currentOrgId, currentUser.role]);

  /**
   * G1 — fetch the next page of login accounts on demand. Returns how many
   * records were actually added (for the UI state).
   */
  const loadMoreUsers = async (): Promise<number> => {
    if (!usersHandleRef.current) return 0;
    return usersHandleRef.current.loadMore();
  };

  // Modals & triggers
  const [activeWhatsappModal, setActiveWhatsappModal] = useState<{ title: string; phone: string; message: string } | null>(null);
  const [showArchitectureModal, setShowArchitectureModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showGroundingModal, setShowGroundingModal] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('vidyaos_orgs', JSON.stringify(organizations));
  }, [organizations]);

  useEffect(() => {
    localStorage.setItem('vidyaos_current_org_id', currentOrgId);
  }, [currentOrgId]);

  // Switch role helper.
  // Persona swapping is development-only: `loginAsDemoUser` is a no-op outside DEV
  // and never has Firebase Auth behind it. In production this only moves the UI
  // between portals — the route guard decides whether the signed-in account may
  // actually enter one.
  const switchRole = (role: UserRole, specificUserId?: string) => {
    if (authUser && authUser.role === role && !specificUserId) {
      if (role === 'PLATFORM_OWNER') setActiveTab('platform-overview');
      else if (role === 'PARENT') setActiveTab('parent-dashboard');
      else if (role === 'TEACHER') setActiveTab('teacher-batches');
      else if (role === 'STUDENT') setActiveTab('student-home');
      else setActiveTab('overview');
      return;
    }

    if (role === 'PLATFORM_OWNER') {
      if (import.meta.env.DEV) {
        const ownerUser = allUsers.find(u => u.role === 'PLATFORM_OWNER');
        if (ownerUser) loginAsDemoUser(ownerUser.id);
      }
      setActiveTab('platform-overview');
      return;
    }

    if (role === 'PARENT') {
      if (import.meta.env.DEV) {
        const parentUser = allUsers.find(u => u.id === (specificUserId || 'user-parent-rajesh'));
        if (parentUser) loginAsDemoUser(parentUser.id);
      }
      setActiveTab('parent-dashboard');
      return;
    }

    if (role === 'TEACHER') {
      if (import.meta.env.DEV) {
        const teacherUser = allUsers.find(u => u.id === (specificUserId || 'user-teacher-sharma'));
        if (teacherUser) loginAsDemoUser(teacherUser.id);
      }
      setActiveTab('teacher-batches');
      return;
    }

    if (role === 'STUDENT') {
      if (import.meta.env.DEV) {
        const studentUser = allUsers.find(u => u.id === (specificUserId || 'user-stud-rahul'));
        if (studentUser) loginAsDemoUser(studentUser.id);
      }
      setActiveTab('student-home');
      return;
    }

    // Default to Center Admin. `allUsers[1]` can legitimately be undefined in a
    // freshly provisioned org, so the lookup is guarded — dereferencing it threw
    // and dumped users on the ErrorBoundary.
    if (import.meta.env.DEV) {
      const adminUser = allUsers.find(u => u.role === 'CENTER_ADMIN' && u.orgId === currentOrg.id) || allUsers[1];
      if (adminUser) loginAsDemoUser(adminUser.id);
    }
    setActiveTab('overview');
  };

  const setCurrentOrgId = (orgId: string) => {
    setCurrentOrgIdState(orgId);
    setSelectedBranchId('all');
  };

  const toggleOrgStatus = (orgId: string, newStatus: Organization['subscriptionStatus']) => {
    setOrganizations(prev => prev.map(o => {
      if (o.id === orgId) {
        const updated = { ...o, subscriptionStatus: newStatus };
        persistOrganizationToFirestore(updated);
        return updated;
      }
      return o;
    }));
  };

  const changeOrgPlan = (orgId: string, planId: Organization['planId']) => {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) return;
    setOrganizations(prev => prev.map(o => {
      if (o.id === orgId) {
        const updated: Organization = {
          ...o,
          planId,
          maxStudents: plan.maxStudents,
          maxBranches: plan.maxBranches
        };
        persistOrganizationToFirestore(updated);
        return updated;
      }
      return o;
    }));
  };

  const createNewOrganization = async (orgData: Partial<Organization>): Promise<Organization> => {
    const id = orgData.id || `org-${Date.now()}`;
    const resolvedPlanId = (orgData.planId as any) || 'starter';
    const newOrg: Organization = {
      id,
      ownerUid: orgData.ownerUid || currentUser.id,
      name: orgData.name || 'New Academy',
      slug: orgData.name?.toLowerCase().replace(/\s+/g, '-') || 'new-academy',
      tagline: orgData.tagline || 'Excellence in Tutoring',
      logoText: (orgData.name || 'NEW').slice(0, 4).toUpperCase(),
      ownerName: orgData.ownerName || 'Center Owner',
      phone: orgData.phone || '+91 99999 00000',
      email: orgData.email || 'center@vidyaos.in',
      address: orgData.address || 'Civil Lines',
      city: orgData.city || 'Dehradun',
      state: orgData.state || 'Uttarakhand',
      upiId: orgData.upiId || 'center@upi',
      upiMerchantName: orgData.name?.toUpperCase() || 'NEW ACADEMY',
      planId: resolvedPlanId,
      subscriptionStatus: 'active',
      trialEndsAt: '',
      currentCycleEnd: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      // New orgs always start at the free-forever caps — the legacy plan fields
      // on `SUBSCRIPTION_PLANS` are a tier label only, not the pricing surface.
      maxStudents: FREE_ENTITLEMENTS.maxStudents,
      maxBranches: FREE_ENTITLEMENTS.maxBranches,
      branches: [
        {
          id: `branch-${Date.now()}`,
          orgId: id,
          name: 'Main Campus',
          city: orgData.city || 'Dehradun',
          address: orgData.address || 'Civil Lines',
          phone: orgData.phone || '+91 99999 00000',
          isMain: true
        }
      ]
    };
    await persistOrganizationToFirestore(newOrg);
    setOrganizations(prev => [...prev.filter(org => org.id !== id), newOrg]);

    return newOrg;
  };

  const updateOrganization = (orgId: string, updates: Partial<Organization>) => {
    setOrganizations(prev => prev.map(o => {
      if (o.id === orgId) {
        const updated = { ...o, ...updates };
        persistOrganizationToFirestore(updated);
        return updated;
      }
      return o;
    }));
  };

  return (
    <AppDomainComposer
      organizations={organizations}
      currentOrg={currentOrg}
      setCurrentOrgId={setCurrentOrgId}
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
      switchRole={switchRole}
      allUsers={allUsers}
      usersHasMore={usersHasMore}
      loadMoreUsers={loadMoreUsers}
      updateUserRole={updateUserRole}
      selectedBranchId={selectedBranchId}
      setSelectedBranchId={setSelectedBranchId}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      mobileViewActive={mobileViewActive}
      setMobileViewActive={setMobileViewActive}
      toggleOrgStatus={toggleOrgStatus}
      changeOrgPlan={changeOrgPlan}
      createNewOrganization={createNewOrganization}
      updateOrganization={updateOrganization}
      activeWhatsappModal={activeWhatsappModal}
      setActiveWhatsappModal={setActiveWhatsappModal}
      showArchitectureModal={showArchitectureModal}
      setShowArchitectureModal={setShowArchitectureModal}
      showHelpModal={showHelpModal}
      setShowHelpModal={setShowHelpModal}
      showGroundingModal={showGroundingModal}
      setShowGroundingModal={setShowGroundingModal}
      toast={toast}
      showToast={showToast}
    >
      {children}
    </AppDomainComposer>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
