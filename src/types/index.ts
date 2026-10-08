export type UserRole = 'PLATFORM_OWNER' | 'CENTER_ADMIN' | 'STAFF' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type IndianBoard = 'Board level' | 'Coaching' | 'Board level & Coaching' | 'CBSE' | 'ICSE' | 'State Board' | 'JEE Foundation' | 'NEET Foundation' | 'Skill Training';

export interface Branch {
  id: string;
  orgId: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  isMain: boolean;
}

export interface Organization {
  id: string;
  ownerUid?: string;
  name: string;
  slug: string;
  tagline: string;
  logoText: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  gstin?: string;
  upiId: string;
  upiMerchantName: string;
  branches: Branch[];
  planId: 'starter' | 'growth' | 'pro';
  subscriptionStatus: 'active' | 'trial' | 'suspended' | 'expired';
  trialEndsAt: string;
  currentCycleEnd: string;
  createdAt: string;
  maxStudents: number;
  maxBranches: number;
}

export interface User {
  id: string;
  orgId: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  branchId?: string;
  linkedStudentIds?: string[]; // For parents
  subjects?: string[]; // For teachers
  bio?: string;
  qualification?: string;
  designation?: string;
  schoolName?: string;
  classGrade?: string;
  rollNo?: string;
  address?: string;
  occupation?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  dateOfBirth?: string;
}

export interface Guardian {
  id: string;
  orgId: string;
  name: string;
  relationship: 'Father' | 'Mother' | 'Guardian';
  phone: string;
  email?: string;
  occupation?: string;
  linkedStudentIds: string[];
}

export interface Student {
  id: string;
  orgId: string;
  branchId: string;
  enrollmentNo: string;
  rollNo: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  classGrade: string; // e.g. "Class 10", "Class 12"
  board: IndianBoard;
  schoolName: string;
  dateOfBirth: string;
  admissionDate: string;
  phone: string;
  email?: string;
  address: string;
  avatar: string;
  batchIds: string[];
  bloodGroup?: string;
  guardian: {
    fatherName: string;
    fatherPhone: string;
    fatherOccupation?: string;
    motherName?: string;
    motherPhone?: string;
    parentUserId: string; // linked to Parent auth account
  };
  status: 'active' | 'inactive';
  userId?: string;
}

export interface Teacher {
  id: string;
  orgId: string;
  branchId: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  qualification: string;
  subjects: string[];
  assignedBatchIds: string[];
  joiningDate: string;
  salary?: number;
  status: 'active' | 'on_leave';
}

export interface Batch {
  id: string;
  orgId: string;
  branchId: string;
  name: string; // e.g., "Class 10 - Mathematics Batch A"
  subject: string;
  classGrade: string;
  standard?: string;
  teacherId: string;
  classroom: string;
  room?: string;
  scheduleDays: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
  timeSlot: string; // e.g., "05:00 PM - 06:30 PM"
  capacity: number;
  studentIds: string[];
  feeAmountMonthly: number;
  academicYear: string;
  status: 'active' | 'completed';
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  orgId: string;
  branchId: string;
  batchId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  remarks?: string;
  markedByUserId: string;
  markedAt: string;
  whatsappAlertSent?: boolean;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'UPI' | 'Cash' | 'NetBanking' | 'Card' | 'Cheque';
  transactionRef: string;
  receivedBy: string;
  receiptNo: string;
  upiApp?: 'gpay' | 'phonepe' | 'paytm' | 'bhim';
  status?: 'pending_verification' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface PaymentSubmission {
  id: string;
  orgId: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  paymentMethod: 'UPI';
  transactionRef: string;
  upiApp?: 'gpay' | 'phonepe' | 'paytm' | 'bhim';
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  status: 'pending_verification' | 'verified' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface FeeInvoice {
  id: string;
  orgId: string;
  branchId: string;
  studentId: string;
  batchId?: string;
  invoiceNo: string;
  monthYear: string; // e.g. "October 2026"
  title: string;
  amount: number;
  discount: number;
  lateFee: number;
  netAmount: number;
  paidAmount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'partially_paid' | 'overdue' | 'verification_pending';
  payments: PaymentRecord[];
  createdAt: string;
}

export interface Exam {
  id: string;
  orgId: string;
  branchId: string;
  batchId: string;
  title: string; // e.g., "Class 10 Monthly Math Diagnostic"
  subject: string;
  examDate: string;
  timeSlot: string;
  maxMarks: number;
  passingMarks: number;
  status: 'upcoming' | 'completed' | 'graded';
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  marksObtained: number;
  percentage: number;
  rank?: number;
  percentile?: number;
  teacherRemarks?: string;
  status: 'graded' | 'absent';
}

export interface Assignment {
  id: string;
  orgId: string;
  branchId: string;
  batchId: string;
  title: string;
  description: string;
  subject: string;
  teacherId: string;
  dueDate: string;
  maxPoints?: number;
  attachments?: { name: string; url: string; size: string }[];
  submissions: {
    studentId: string;
    status: 'submitted' | 'pending' | 'late' | 'reviewed';
    submittedAt?: string;
    grade?: string;
    feedback?: string;
  }[];
}

export interface StudyMaterial {
  id: string;
  orgId: string;
  branchId?: string;
  batchId?: string;
  title: string;
  subject: string;
  type: 'pdf' | 'notes' | 'video' | 'practice_paper';
  fileUrl: string;
  fileSize: string;
  uploadedByTeacherId: string;
  uploadedAt: string;
  chapterTopic?: string;
}

export interface TimetableSlot {
  id: string;
  orgId: string;
  branchId: string;
  batchId: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // e.g. "17:00"
  endTime: string;   // e.g. "18:30"
  classroom: string;
  teacherId: string;
  subject: string;
  /**
   * F6 — optional online-class link (Google Meet / Zoom / Teams). When set, the
   * student & parent "Join Class" buttons open it; absent for in-person classes.
   */
  meetUrl?: string;
  /** Optional meeting passcode shown alongside the link (never a login secret). */
  meetPassword?: string;
}

/**
 * F7 — syllabus / lesson-plan coverage. One row per chapter of a batch's
 * syllabus; teachers tick coverage, admins seed them from a board template.
 */
export type SyllabusStatus = 'not_started' | 'in_progress' | 'completed';

export interface SyllabusTopic {
  id: string;
  orgId: string;
  branchId: string;
  batchId: string;
  subject: string;
  classGrade: string;
  board: IndianBoard;
  chapter: string;
  title: string;
  sequence: number;
  status: SyllabusStatus;
  /** Teacher record id (not the user uid) that last marked it covered. */
  coveredByTeacherId?: string;
  /** ISO timestamp of the last status change. */
  coveredAt?: string;
  /** YYYY-MM-DD (India) of the last status change. */
  coveredDate?: string;
  note?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  orgId: string;
  branchId?: string; // empty means all branches
  title: string;
  content: string;
  targetAudience: 'all' | 'parents' | 'students' | 'teachers' | 'batch';
  targetBatchId?: string;
  priority: 'normal' | 'urgent';
  createdAt: string;
  createdBy: string;
  channel: ('in-app' | 'whatsapp' | 'sms')[];
  whatsappTemplate?: string;
}

export interface SubscriptionPlan {
  id: 'starter' | 'growth' | 'pro';
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxStudents: number;
  maxBranches: number;
  features: string[];
  popular?: boolean;
  description: string;
}

export interface NotificationItem {
  id: string;
  orgId?: string;
  userId: string;
  title: string;
  message: string;
  type: 'attendance' | 'fee' | 'exam' | 'schedule' | 'announcement' | 'system' | 'leave' | 'salary';
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'verify'
  | 'reject'
  | 'approve'
  | 'login';

/**
 * Append-only change-history record (F1). Written by the app on every
 * significant mutation and never edited or deleted once created — the
 * `auditLogs` Firestore rule forbids update/delete entirely.
 */
export interface AuditLogEntry {
  id: string;
  orgId: string;
  branchId?: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  /** Domain whose records changed, e.g. 'student' | 'batch' | 'fee' | 'teacher'. */
  targetType: string;
  targetId: string;
  summary: string;
  changes?: Record<string, unknown>;
  /** ISO display string (UTC). */
  createdAt: string;
  /** Sortable epoch-ms timestamp so Firestore can order the log chronologically. */
  createdAtMs: number;
}

export type InquiryStatus = 'new' | 'contacted' | 'demo_booked' | 'joined' | 'lost';
export type InquirySource = 'walkin' | 'call' | 'whatsapp' | 'referral' | 'online' | 'other';

export interface InquiryNote {
  authorId: string;
  authorName: string;
  text: string;
  /** ISO display string (UTC). */
  createdAt: string;
}

/**
 * Admission lead (F2) — a prospective student captured on the phone / desk.
 * `status` moves along the pipeline: new → contacted → demo_booked → joined
 * (conversion to a real student) or lost. Joined leads carry a
 * `convertedStudentId` linking to the student record created on conversion.
 */
export interface Inquiry {
  id: string;
  orgId: string;
  branchId: string;
  name: string;
  phone: string;
  email?: string;
  classGrade?: string;
  board?: IndianBoard;
  subjects?: string[];
  source?: InquirySource;
  status: InquiryStatus;
  /** YYYY-MM-DD follow-up reminder date (India). */
  followUpDate?: string;
  interestedBatchIds?: string[];
  notes: InquiryNote[];
  createdByUserId: string;
  createdByName: string;
  /** ISO display string (UTC). */
  createdAt: string;
  /** Sortable epoch-ms timestamp. */
  createdAtMs: number;
  updatedAt?: string;
  /** Set when this lead is converted into a student. */
  convertedStudentId?: string;
}

export type LeaveRequester = 'student' | 'teacher';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveCategory = 'sick' | 'family' | 'exam' | 'other';

/**
 * Leave request (F3) — a student/parent (or the faculty member themselves)
 * asks for an absence; staff/admin (or the batch teacher) approves or
 * rejects it. An approved student leave stamps `excused` attendance for
 * each class day in the range (see `LeaveContext.reviewLeaveRequest`).
 *
 * Exactly one of `studentId` / `teacherId` is set, matching `requesterType`.
 */
export interface LeaveRequest {
  id: string;
  orgId: string;
  branchId: string;
  requesterType: LeaveRequester;
  studentId?: string;
  teacherId?: string;
  /** Firebase Auth uid of the account that filed the request. */
  requestedByUserId: string;
  requestedByName: string;
  /** YYYY-MM-DD inclusive start (India). */
  startDate: string;
  /** YYYY-MM-DD inclusive end (India). */
  endDate: string;
  reason: string;
  category: LeaveCategory;
  status: LeaveStatus;
  reviewedByUserId?: string;
  reviewedByName?: string;
  /** ISO display string (UTC). */
  reviewedAt?: string;
  reviewNote?: string;
  /** ISO display string (UTC). */
  createdAt: string;
  /** Sortable epoch-ms timestamp for the Firestore listener ordering. */
  createdAtMs: number;
  updatedAt?: string;
}

export type TeacherAttendanceStatus = 'present' | 'absent' | 'half_day' | 'on_leave';

/**
 * Faculty self-attendance row (F4) — one per teacher per calendar day.
 * `teacherId` points at the `Teacher` doc whose `userId` links to the auth
 * account (same join the F3 leave filing uses), so rules can verify a teacher
 * only ever writes their own row.
 */
export interface TeacherAttendance {
  id: string;
  orgId: string;
  branchId: string;
  teacherId: string;
  /** YYYY-MM-DD (India). */
  date: string;
  status: TeacherAttendanceStatus;
  /** "HH:MM" 24h — set when the teacher checks in / out. */
  checkIn?: string;
  checkOut?: string;
  /** Firebase Auth uid of whoever stamped this row (self or the desk). */
  markedByUserId: string;
  markedAt: string;
  remarks?: string;
}

export type SalarySlipStatus = 'draft' | 'issued' | 'paid';

/**
 * Monthly salary slip (F4) — issued by the desk from `Teacher.salary`,
 * then marked paid. `netAmount = basic + allowances - deductions`.
 */
export interface SalarySlip {
  id: string;
  orgId: string;
  branchId: string;
  teacherId: string;
  /** e.g. "October 2026". */
  monthYear: string;
  basic: number;
  allowances: number;
  deductions: number;
  netAmount: number;
  paidAmount: number;
  status: SalarySlipStatus;
  paymentMethod?: PaymentRecord['paymentMethod'];
  paidAt?: string;
  paidBy?: string;
  issuedAt: string;
  createdAt: string;
  /** Sortable epoch-ms timestamp for the Firestore listener ordering. */
  createdAtMs: number;
}

export type ExpenseCategory =
  | 'rent'
  | 'salaries'
  | 'electricity'
  | 'internet'
  | 'marketing'
  | 'maintenance'
  | 'printing'
  | 'misc';

/**
 * A money-out entry (F5) — rent, electricity, salaries, etc. The desk records
 * these so the Profit & Loss tab can answer "am I profitable?" at a glance.
 * Paid salary slips (F4) are rolled into the `salaries` category at report time.
 */
export interface Expense {
  id: string;
  orgId: string;
  branchId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  /** YYYY-MM-DD (India). */
  expenseDate: string;
  paymentMethod: PaymentRecord['paymentMethod'];
  vendor?: string;
  notes?: string;
  recordedByUserId: string;
  recordedByName: string;
  createdAt: string;
  /** Sortable epoch-ms timestamp for the Firestore listener ordering. */
  createdAtMs: number;
}

export interface AuthSession {
  // NOTE: Firebase Auth owns the ID token. It is deliberately NOT part of the
  // session shape — persisting it to localStorage only created a stale,
  // XSS-exfiltratable copy that nothing ever read.
  user: User;
  orgId: string;
  createdAt: number;
  expiresAt: number;
  loginMethod: 'phone_otp' | 'phone_password' | 'email_password' | 'demo_preset' | 'google_oauth';
}

export type ChatChannelType = 'announcements' | 'batch' | 'direct' | 'faculty';
export type ChatMessageTag = 'general' | 'doubt' | 'homework' | 'notice' | 'urgent';

export interface ChatChannel {
  id: string;
  orgId: string;
  name: string; // slug e.g. "c10-math-doubts"
  displayName: string; // human label e.g. "Class 10 Math Doubts"
  type: ChatChannelType;
  description: string;
  batchId?: string;
  allowedRoles?: UserRole[]; // If empty, all roles can view
  lastMessage?: string;
  lastMessageTime?: string;
  /** Epoch ms of `lastMessage`; used to keep the channel list ordered from Firestore. */
  lastMessageMs?: number;
  unreadCount?: number;
  isPrivate?: boolean;
}

export interface ChatMessageAttachment {
  name: string;
  url?: string;
  type?: 'pdf' | 'image' | 'doc';
  size?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  orgId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string;
  content: string;
  tag?: ChatMessageTag;
  reactions?: { [emoji: string]: string[] }; // emoji -> array of sender names/IDs
  attachments?: ChatMessageAttachment[];
  createdAt: string;
  /** Sortable epoch-ms timestamp. `createdAt` is the display string; this is what
   *  Firestore orders by so chat syncs chronologically across devices. */
  createdAtMs?: number;
  pinned?: boolean;
}
