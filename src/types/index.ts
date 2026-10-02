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
  status: 'paid' | 'pending' | 'partially_paid' | 'overdue';
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
  type: 'attendance' | 'fee' | 'exam' | 'schedule' | 'announcement' | 'system';
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

export interface AuthSession {
  token: string;
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
  pinned?: boolean;
}

