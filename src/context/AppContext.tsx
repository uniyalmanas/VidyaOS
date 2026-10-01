import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  ChatMessageAttachment
} from '../types';
import {
  MOCK_ORGANIZATIONS,
  MOCK_USERS,
  SUBSCRIPTION_PLANS
} from '../data/mockData';
import {
  subscribeToOrganizations,
  subscribeToUsers,
  persistOrganizationToFirestore,
  persistUserRoleToFirestore,
  seedInitialFirestoreDataIfEmpty
} from '../lib/firestoreService';

// Domain Slices
import { StudentProvider, useStudents } from './slices/StudentContext';
import { FeeProvider, useFees } from './slices/FeeContext';
import { AttendanceProvider, useAttendance } from './slices/AttendanceContext';
import { AcademicProvider, useAcademics } from './slices/AcademicContext';
import { CommunicationProvider, useCommunication } from './slices/CommunicationContext';

// Export domain hooks for direct fine-grained consumption
export { useStudents } from './slices/StudentContext';
export { useFees } from './slices/FeeContext';
export { useAttendance } from './slices/AttendanceContext';
export { useAcademics } from './slices/AcademicContext';
export { useCommunication, useChat } from './slices/CommunicationContext';

export interface AppContextType {
  // Tenancy & Session
  organizations: Organization[];
  currentOrg: Organization;
  setCurrentOrgId: (orgId: string) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole, specificUserId?: string) => void;
  allUsers: User[];
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  
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

  // Data collections (Tenant-isolated)
  students: Student[];
  teachers: Teacher[];
  batches: Batch[];
  attendanceRecords: AttendanceRecord[];
  invoices: FeeInvoice[];
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
  
  addTeacher: (teacher: Omit<Teacher, 'id' | 'orgId' | 'userId' | 'joiningDate'> & Partial<Pick<Teacher, 'userId' | 'joiningDate'>>) => Teacher;
  updateTeacher: (teacherId: string, updates: Partial<Teacher>) => void;
  deleteTeacher: (teacherId: string) => void;
  
  markAttendance: (record: { batchId: string; studentId: string; date: string; status: AttendanceStatus; remarks?: string }) => void;
  markBatchAllPresent: (batchId: string, date: string) => void;
  
  recordPayment: (invoiceId: string, payment: { amount: number; paymentMethod: PaymentRecord['paymentMethod']; transactionRef?: string; upiApp?: PaymentRecord['upiApp'] }) => PaymentRecord;
  createInvoice: (invoice: Omit<FeeInvoice, 'id' | 'orgId' | 'invoiceNo' | 'payments' | 'createdAt'>) => FeeInvoice;
  
  createExam: (exam: Omit<Exam, 'id' | 'orgId'>) => Exam;
  saveExamResults: (examId: string, marksData: { studentId: string; marksObtained: number; remarks?: string }[]) => void;
  
  createAssignment: (assign: Omit<Assignment, 'id' | 'orgId' | 'submissions'>) => Assignment;
  addStudyMaterial: (mat: Omit<StudyMaterial, 'id' | 'orgId' | 'uploadedAt'>) => StudyMaterial;
  deleteStudyMaterial: (matId: string) => void;
  
  createAnnouncement: (announcement: Omit<Announcement, 'id' | 'orgId' | 'createdAt' | 'createdBy'>) => Announcement;
  
  // Platform Owner & Center Admin actions
  toggleOrgStatus: (orgId: string, newStatus: Organization['subscriptionStatus']) => void;
  changeOrgPlan: (orgId: string, planId: Organization['planId']) => void;
  createNewOrganization: (orgData: Partial<Organization>) => Organization;
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
  sendChatMessage: (channelId: string, content: string, tag?: ChatMessageTag, attachments?: ChatMessageAttachment[]) => ChatMessage;
  addChatReaction: (messageId: string, emoji: string) => void;
  createChatChannel: (channel: Omit<ChatChannel, 'id' | 'orgId'>) => ChatChannel;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Inner Composer to assemble domain slices and provide composite AppContextType
interface CompositeProps {
  organizations: Organization[];
  currentOrg: Organization;
  setCurrentOrgId: (id: string) => void;
  currentUser: User;
  setCurrentUser: (u: User) => void;
  switchRole: (role: UserRole, specificUserId?: string) => void;
  allUsers: User[];
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileViewActive: boolean;
  setMobileViewActive: (v: boolean) => void;
  toggleOrgStatus: (orgId: string, newStatus: Organization['subscriptionStatus']) => void;
  changeOrgPlan: (orgId: string, planId: Organization['planId']) => void;
  createNewOrganization: (orgData: Partial<Organization>) => Organization;
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
          <CommunicationProvider
            currentOrg={props.currentOrg}
            currentUser={props.currentUser}
            batches={studentSlice.batches}
            selectedBranchId={props.selectedBranchId}
            isPlatformOwner={props.isPlatformOwner}
            onShowToast={props.showToast}
          >
            <UnifiedAppProvider {...props} studentSlice={studentSlice} />
          </CommunicationProvider>
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

  const fullContextValue: AppContextType = {
    // Tenancy & session
    organizations: coreProps.organizations,
    currentOrg: coreProps.currentOrg,
    setCurrentOrgId: coreProps.setCurrentOrgId,
    currentUser: coreProps.currentUser,
    setCurrentUser: coreProps.setCurrentUser,
    switchRole: coreProps.switchRole,
    allUsers: coreProps.allUsers,
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
    addStudent: studentSlice.addStudent,
    updateStudent: studentSlice.updateStudent,
    deleteStudent: studentSlice.deleteStudent,
    addBatch: studentSlice.addBatch,
    updateBatch: studentSlice.updateBatch,
    selectedChildId: studentSlice.selectedChildId,
    setSelectedChildId: studentSlice.setSelectedChildId,
    selectedChild: studentSlice.selectedChild,
    parentLinkedChildren: studentSlice.parentLinkedChildren,

    // Fee domain
    invoices: feeSlice.invoices,
    recordPayment: feeSlice.recordPayment,
    createInvoice: feeSlice.createInvoice,

    // Attendance domain
    attendanceRecords: attendanceSlice.attendanceRecords,
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
    createExam: academicSlice.createExam,
    saveExamResults: academicSlice.saveExamResults,
    createAssignment: academicSlice.createAssignment,
    addStudyMaterial: academicSlice.addStudyMaterial,
    deleteStudyMaterial: academicSlice.deleteStudyMaterial,

    // Communication & Chat domain
    announcements: commSlice.announcements,
    createAnnouncement: commSlice.createAnnouncement,
    subscriptionPlans: SUBSCRIPTION_PLANS,
    notifications: commSlice.notifications,
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
    return saved ? JSON.parse(saved) : MOCK_ORGANIZATIONS;
  });

  const [currentOrgId, setCurrentOrgIdState] = useState<string>(() => {
    return localStorage.getItem('vidyaos_current_org_id') || 'org-apex';
  });

  const currentOrg = useMemo(() => {
    return organizations.find(o => o.id === currentOrgId) || organizations[0];
  }, [organizations, currentOrgId]);

  const { currentUser: authUser, loginAsDemoUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>(MOCK_USERS);
  
  const currentUser: User = useMemo(() => {
    return authUser || MOCK_USERS[1];
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

    const unsubOrgs = subscribeToOrganizations(data => {
      if (data && data.length > 0) setOrganizations(data);
    });

    const isPlatform = currentUser.role === 'PLATFORM_OWNER';
    const targetOrg = isPlatform ? undefined : currentOrgId;

    const unsubUsers = subscribeToUsers(data => {
      if (data) setAllUsers(data);
    }, targetOrg);

    return () => {
      unsubOrgs();
      unsubUsers();
    };
  }, [currentOrgId, currentUser.role]);

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

  // Switch role helper
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
      const ownerUser = allUsers.find(u => u.role === 'PLATFORM_OWNER');
      if (ownerUser) loginAsDemoUser(ownerUser.id);
      setActiveTab('platform-overview');
      return;
    }

    if (role === 'PARENT') {
      const parentUser = allUsers.find(u => u.id === (specificUserId || 'user-parent-rajesh'));
      if (parentUser) {
        loginAsDemoUser(parentUser.id);
      }
      setActiveTab('parent-dashboard');
      return;
    }

    if (role === 'TEACHER') {
      const teacherUser = allUsers.find(u => u.id === (specificUserId || 'user-teacher-sharma'));
      if (teacherUser) loginAsDemoUser(teacherUser.id);
      setActiveTab('teacher-batches');
      return;
    }

    if (role === 'STUDENT') {
      const studentUser = allUsers.find(u => u.id === (specificUserId || 'user-stud-rahul'));
      if (studentUser) loginAsDemoUser(studentUser.id);
      setActiveTab('student-home');
      return;
    }

    // Default to Center Admin
    const adminUser = allUsers.find(u => u.role === 'CENTER_ADMIN' && u.orgId === currentOrg.id) || allUsers[1];
    loginAsDemoUser(adminUser.id);
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

  const createNewOrganization = (orgData: Partial<Organization>): Organization => {
    const id = `org-${Date.now()}`;
    const newOrg: Organization = {
      id,
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
      planId: (orgData.planId as any) || 'starter',
      subscriptionStatus: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currentCycleEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      maxStudents: 100,
      maxBranches: 1,
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
    setOrganizations(prev => [...prev, newOrg]);
    persistOrganizationToFirestore(newOrg);

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
