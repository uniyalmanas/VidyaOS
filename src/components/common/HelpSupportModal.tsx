import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  X,
  HelpCircle,
  Video,
  AlertCircle,
  FileQuestion,
  PhoneCall,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle2,
  Clock,
  Layers,
  Send,
  Building,
  User,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { easings, tSpring, fadeUp, staggerContainerFast } from '../../lib/motion';
import { HowItWorksInfographic } from '../ui';

/** Modal shell: spring pop-in cascading header → tab bar → body → footer. */
const helpPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...tSpring, delayChildren: 0.05, staggerChildren: 0.06 }
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: { duration: 0.16, ease: easings.inOut }
  }
};

interface FaqItem {
  id: string;
  category: 'onboarding' | 'fees' | 'attendance' | 'parent';
  question: string;
  answer: string;
  relatedModule?: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'onboarding',
    question: 'How do I add my first batch and enroll coaching students?',
    answer: 'Navigate to "Batches" from the sidebar and click "+ Create Batch". Define your subject, grade (e.g., Class 10 CBSE), classroom, and fee. Once created, click "+ Add Student" from the top action bar or inside "Students Directory" and select the batch to enroll them.',
    relatedModule: 'Batches & Students'
  },
  {
    id: 'faq-2',
    category: 'fees',
    question: 'How does instant UPI QR collection work at the coaching counter?',
    answer: 'When a parent visits your center to pay fees, click "UPI QR" in the Fees module or top action bar. VidyaOS dynamically generates an NPCI-compliant QR code pre-filled with your institute UPI ID, student enrollment number, and net amount. Parents can scan with Google Pay, PhonePe, Paytm, or BHIM, and you can record the transaction with 1 click.',
    relatedModule: 'Fees & Dues'
  },
  {
    id: 'faq-3',
    category: 'parent',
    question: 'How do parents log in to view their child\'s homework and attendance?',
    answer: 'Parents do not need complicated passwords. They simply log in using their registered 10-digit Indian mobile number via instant OTP verification. If a family has multiple siblings enrolled in your coaching center, the Parent Portal includes a 1-tap Child Switcher at the top.',
    relatedModule: 'Parent Portal'
  },
  {
    id: 'faq-4',
    category: 'attendance',
    question: 'How does 1-click batch attendance work on mobile?',
    answer: 'Faculty members or center receptionists can open the "Attendance" module, select today\'s batch, and tap "Mark All Present" to quickly register the full cohort. Then, simply toggle only the absent or late students in seconds. Automated WhatsApp alert triggers are available for absent students.',
    relatedModule: 'Attendance'
  },
  {
    id: 'faq-5',
    category: 'onboarding',
    question: 'Can I manage multiple coaching branches under one VidyaOS account?',
    answer: 'Yes! In the top navigation bar, use the Branch Selector dropdown (e.g., Main Campus vs North City Branch) to instantly filter student batches, attendance rosters, and fee dues by campus location.',
    relatedModule: 'Multi-Branch Management'
  },
  {
    id: 'faq-6',
    category: 'fees',
    question: 'Can I print GST-compliant fee receipts and share them via WhatsApp?',
    answer: 'Yes. Every recorded payment generates a serial-numbered GST tax receipt. Click "Receipt" on any invoice to preview or print the official coaching fee slip. You can also click "Reminder" to dispatch an instant pre-drafted WhatsApp message to the father or mother.',
    relatedModule: 'Fee Receipts'
  }
];

interface VideoTutorial {
  id: string;
  title: string;
  duration: string;
  category: string;
  summary: string;
  thumbnailGradient: string;
  steps: string[];
}

const TUTORIALS: VideoTutorial[] = [
  {
    id: 'tut-1',
    title: '5-Minute Coaching Setup & Student Onboarding',
    duration: '5:12',
    category: 'Onboarding',
    summary: 'Master the basics: set up your coaching center profile, create your Class 9-12 batches, and import or add students with roll numbers.',
    thumbnailGradient: 'from-[#039BE5] to-[#1A73E8]',
    steps: [
      'Enter center name, UPI ID, and branch location',
      'Create batch timetable slots (e.g. MWF 5:00 PM)',
      'Add student with parent phone & emergency contacts',
      'Assign student to academic batch'
    ]
  },
  {
    id: 'tut-2',
    title: 'Counter Fee Collection & Instant Dynamic UPI QR',
    duration: '4:20',
    category: 'Fee Management',
    summary: 'Learn how to generate on-screen NPCI payment codes, apply sibling or merit concessions, and issue printable receipts.',
    thumbnailGradient: 'from-[#FFA000] to-[#E65100]',
    steps: [
      'Locate student under Pending Fees tab',
      'Click "UPI QR" to display live QR code',
      'Parent scans via Google Pay / PhonePe / Paytm',
      'Mark payment verified & print GST receipt'
    ]
  },
  {
    id: 'tut-3',
    title: '1-Tap Daily Attendance & Faculty Workflows',
    duration: '3:45',
    category: 'Daily Operations',
    summary: 'Fast attendance marking for teachers on mobile screens and instant SMS/WhatsApp notification triggers for absentees.',
    thumbnailGradient: 'from-[#00C853] to-[#00897B]',
    steps: [
      'Open Attendance Sheet for active batch',
      'Use 1-click "Mark All Present"',
      'Flag absentees with remarks (e.g., medical leave)',
      'Review monthly center attendance percentage'
    ]
  },
  {
    id: 'tut-4',
    title: 'Parent & Student Portal Walkthrough',
    duration: '6:05',
    category: 'Stakeholder Portals',
    summary: 'Guide your enrolled families through the dedicated direct portal with multi-child switching and assignment downloads.',
    thumbnailGradient: 'from-[#7C4DFF] to-[#536DFE]',
    steps: [
      'Mobile OTP login verification for parents',
      'Toggle between siblings with child switcher',
      'Track monthly attendance calendar',
      'Download exam marksheets and assignments'
    ]
  }
];

export const HelpSupportModal: React.FC = () => {
  const {
    showHelpModal,
    setShowHelpModal,
    currentOrg,
    currentUser,
    setShowArchitectureModal,
    showToast
  } = useApp();
  const { resolvedTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'faqs' | 'tutorials' | 'report' | 'contact'>('faqs');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');
  const [selectedTutorial, setSelectedTutorial] = useState<VideoTutorial | null>(null);

  // Issue Reporting Form State
  const [issueCategory, setIssueCategory] = useState('fees');
  const [issuePriority, setIssuePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [issueSubject, setIssueSubject] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [contactPhone, setContactPhone] = useState(currentUser.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; subject: string; timestamp: string } | null>(null);

  const filteredFaqs = FAQS.filter(f =>
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTutorials = TUTORIALS.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueSubject.trim() || !issueDescription.trim()) {
      showToast('Please fill out the subject and description.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const ticketId = `VIDYA-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedTicket({
        id: ticketId,
        subject: issueSubject,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      });
      setIsSubmitting(false);
      showToast(`Support Ticket #${ticketId} created! Our technical team will reach out via WhatsApp.`, 'success');
      setIssueSubject('');
      setIssueDescription('');
    }, 800);
  };

  return (
    <AnimatePresence>
      {showHelpModal && (
        <motion.div
          key="help-support-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: easings.outQuart }}
        >
          <motion.div
            variants={helpPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ backgroundColor: resolvedTheme === 'dark' ? '#1E1F20' : '#ffffff' }}
            className="w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-[#DADCE0] dark:border-[#3C4043] flex flex-col overflow-hidden text-[#202124] dark:text-[#E8EAED]"
          >
            {/* Modal Header */}
            <motion.div variants={fadeUp} className="p-4 sm:p-6 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-blue-500/10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#FFA000] to-[#E65100] text-slate-950 shadow-sm">
              <HelpCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="help-modal-title" className="text-lg sm:text-xl font-bold tracking-tight">
                  VidyaOS Help & Support Center
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Onboarding Hub
                </span>
              </div>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                Quickstart guides, video tutorials, and dedicated coaching & education center support for {currentOrg.name}.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowHelpModal(false)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#282A2C] text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED] transition cursor-pointer"
            aria-label="Close Help & Support dialog"
          >
            <X className="w-5 h-5" />
          </button>
            </motion.div>

            {/* Navigation Tabs Bar */}
            <motion.div variants={fadeUp} className="px-4 sm:px-6 pt-3 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between gap-2 overflow-x-auto bg-[#F8F9FA] dark:bg-[#18191B]">
          <div className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => { setActiveTab('faqs'); setSubmittedTicket(null); }}
              className={`px-3.5 py-2.5 border-b-2 text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'faqs'
                  ? 'border-[#1A73E8] text-[#1A73E8] dark:text-[#8AB4F8]'
                  : 'border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED]'
              }`}
            >
              <FileQuestion className="w-4 h-4" />
              <span>Frequently Asked Questions</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-[#3C4043] font-mono">
                {FAQS.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('tutorials'); setSubmittedTicket(null); }}
              className={`px-3.5 py-2.5 border-b-2 text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'tutorials'
                  ? 'border-[#FFA000] text-[#E65100] dark:text-[#FFD54F]'
                  : 'border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED]'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Video Tutorials</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-[#FFA000]/20 text-[#E65100] dark:text-[#FFD54F] font-mono">
                4 Guides
              </span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-3.5 py-2.5 border-b-2 text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'report'
                  ? 'border-[#D93025] text-[#D93025] dark:text-[#F28B82]'
                  : 'border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED]'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Report an Issue</span>
            </button>

            <button
              onClick={() => { setActiveTab('contact'); setSubmittedTicket(null); }}
              className={`px-3.5 py-2.5 border-b-2 text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'contact'
                  ? 'border-[#00C853] text-[#00C853] dark:text-[#69F0AE]'
                  : 'border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED]'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>Direct Support</span>
            </button>
          </div>

            </motion.div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, ease: easings.outQuart }}
              >
          {/* TAB 1: FAQS */}
          {activeTab === 'faqs' && (
            <div className="space-y-4">
              {/* Search Omnibox */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F6368] dark:text-[#9AA0A6]" />
                <input
                  type="text"
                  placeholder="Search questions (e.g. fees, UPI QR, parent login, attendance)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F1F3F4] dark:bg-[#282A2D] rounded-xl border border-transparent focus:border-[#1A73E8] focus:bg-white dark:focus:bg-[#1E1F20] text-xs font-medium outline-none transition"
                />
              </div>

              {/* Quick Topic Chips */}
              <div className="flex items-center gap-2 overflow-x-auto text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Quick Filters:</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className={`px-2.5 py-1 rounded-full border transition cursor-pointer ${
                    !searchQuery ? 'bg-slate-200 dark:bg-[#3C4043] font-bold' : 'hover:bg-slate-100 dark:hover:bg-[#282A2C]'
                  }`}
                >
                  All FAQs
                </button>
                <button
                  onClick={() => setSearchQuery('onboarding')}
                  className="px-2.5 py-1 rounded-full border hover:bg-slate-100 dark:hover:bg-[#282A2C] transition cursor-pointer"
                >
                  Batch & Student Setup
                </button>
                <button
                  onClick={() => setSearchQuery('fees')}
                  className="px-2.5 py-1 rounded-full border hover:bg-slate-100 dark:hover:bg-[#282A2C] transition cursor-pointer"
                >
                  UPI Fees & Receipts
                </button>
                <button
                  onClick={() => setSearchQuery('attendance')}
                  className="px-2.5 py-1 rounded-full border hover:bg-slate-100 dark:hover:bg-[#282A2C] transition cursor-pointer"
                >
                  1-Tap Attendance
                </button>
                <button
                  onClick={() => setSearchQuery('parent')}
                  className="px-2.5 py-1 rounded-full border hover:bg-slate-100 dark:hover:bg-[#282A2C] transition cursor-pointer"
                >
                  Parent OTP Access
                </button>
              </div>

              {/* Accordion List */}
              <div className="space-y-2.5 pt-1">
                {filteredFaqs.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, ease: easings.outQuart }}
                    className="p-8 text-center text-slate-500 space-y-2"
                  >
                    <p className="text-xs">No questions matched "{searchQuery}".</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-[#1A73E8] font-bold hover:underline"
                    >
                      Clear search filter
                    </button>
                  </motion.div>
                ) : (
                  filteredFaqs.map(faq => {
                    const isExpanded = expandedFaq === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden bg-white dark:bg-[#282A2D] transition shadow-2xs"
                      >
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-[#303134] transition cursor-pointer"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="w-2 h-2 rounded-full bg-[#1A73E8] flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold text-[#202124] dark:text-[#E8EAED]">
                              {faq.question}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6] flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6] flex-shrink-0" />
                          )}
                        </button>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.24, ease: easings.outQuart }}
                            className="px-4 pb-4 pt-1 text-xs text-[#5F6368] dark:text-[#C4C7C5] leading-relaxed border-t border-slate-100 dark:border-[#3C4043] space-y-2 bg-[#F8F9FA]/50 dark:bg-[#202124]/50"
                          >
                            <p>{faq.answer}</p>
                            {faq.relatedModule && (
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1A73E8] dark:text-[#8AB4F8]">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Related Module: {faq.relatedModule}</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VIDEO TUTORIALS */}
          {activeTab === 'tutorials' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#18191B] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-[#FFA000]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
                    The VidyaOS Daily Flow
                  </h4>
                </div>
                <HowItWorksInfographic variant="compact" />
              </div>

              {/* Selected Tutorial Video Simulation Modal / Banner */}
              {selectedTutorial && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, ease: easings.outQuart }}
                  className="p-4 sm:p-5 rounded-2xl border-2 border-[#FFA000] bg-white dark:bg-[#282A2D] shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-[#FFA000]/20 text-[#E65100] dark:text-[#FFD54F]">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">{selectedTutorial.title}</h4>
                        <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                          Duration: {selectedTutorial.duration} · Category: {selectedTutorial.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedTutorial(null)}
                      className="text-xs text-[#5F6368] dark:text-[#9AA0A6] hover:underline"
                    >
                      Close Player
                    </button>
                  </div>

                  {/* Simulated High-Res Video Screen */}
                  <div className="relative aspect-video w-full rounded-xl bg-slate-950 flex flex-col items-center justify-center text-white overflow-hidden shadow-inner border border-slate-800">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition">
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                          <span className="font-mono text-[11px]">01:14 / {selectedTutorial.duration}</span>
                        </div>
                        <span className="text-[11px] font-semibold bg-[#FFA000] text-slate-950 px-2 py-0.5 rounded-md">
                          1080p HD
                        </span>
                      </div>
                      {/* Timeline Bar */}
                      <div className="w-full bg-white/30 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-[#FFA000] h-full w-[28%]" />
                      </div>
                    </div>

                    <div className="text-center p-6 space-y-2 z-10">
                      <div className="w-14 h-14 rounded-full bg-[#FFA000]/20 border border-[#FFA000] flex items-center justify-center mx-auto text-[#FFD54F]">
                        <Play className="w-7 h-7 fill-current translate-x-0.5" />
                      </div>
                      <h5 className="font-bold text-base">{selectedTutorial.title}</h5>
                      <p className="text-xs text-slate-300 max-w-md mx-auto">{selectedTutorial.summary}</p>
                    </div>
                  </div>

                  {/* Step by Step Breakdown */}
                  <div className="pt-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] mb-2">
                      Key Steps Covered in this Walkthrough:
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTutorial.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="flex items-start space-x-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E1F20] text-xs border border-slate-200 dark:border-[#3C4043]"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Grid of Tutorial Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredTutorials.map(tut => (
                  <div
                    key={tut.id}
                    onClick={() => setSelectedTutorial(tut)}
                    className="p-4 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2D] hover:border-[#FFA000] dark:hover:border-[#FFA000] shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Thumbnail Header */}
                      <div className={`h-28 rounded-xl bg-gradient-to-br ${tut.thumbnailGradient} p-3 flex flex-col justify-between text-white relative overflow-hidden shadow-inner`}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-md">
                            {tut.category}
                          </span>
                          <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md font-mono">
                            <Clock className="w-3 h-3" />
                            {tut.duration}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 fill-white translate-x-0.5" />
                          </div>
                          <span className="text-xs font-bold drop-shadow-sm">Watch Video Guide</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold mt-3 text-[#202124] dark:text-[#E8EAED] group-hover:text-[#E65100] dark:group-hover:text-[#FFD54F] transition-colors">
                        {tut.title}
                      </h4>
                      <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-1 line-clamp-2 leading-relaxed">
                        {tut.summary}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-[#3C4043] flex items-center justify-between text-[11px] font-semibold text-[#FFA000]">
                      <span>{tut.steps.length} Key Milestones</span>
                      <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REPORT AN ISSUE FORM */}
          {activeTab === 'report' && (
            <div className="max-w-2xl mx-auto space-y-4">
              {submittedTicket ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: easings.outQuart }}
                  className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Issue Ticket Submitted Successfully!
                  </h3>
                  <div className="p-3 bg-white dark:bg-[#1E1F20] rounded-xl border border-emerald-200 dark:border-emerald-800 max-w-sm mx-auto text-xs space-y-1">
                    <div className="text-slate-500">Ticket Reference:</div>
                    <div className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                      #{submittedTicket.id}
                    </div>
                    <div className="text-[11px] text-slate-400">Subject: {submittedTicket.subject}</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                    Our technical onboarding specialist has been dispatched and will reach out via WhatsApp / phone to ensure zero disruption to your coaching operations.
                  </p>
                  <button
                    onClick={() => setSubmittedTicket(null)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Submit Another Report
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmitIssue} className="space-y-4 bg-white dark:bg-[#282A2D] p-5 sm:p-6 rounded-3xl border border-[#DADCE0] dark:border-[#3C4043] shadow-xs">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">
                      Report a Bug or Request Onboarding Assistance
                    </h3>
                    <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                      We treat coaching institute interruptions with priority SLA. Your report includes tenant context ({currentOrg.name}).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                        Affected Feature Category
                      </label>
                      <select
                        value={issueCategory}
                        onChange={(e) => setIssueCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F1F3F4] dark:bg-[#1E1F20] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] text-xs font-medium outline-none focus:border-[#1A73E8]"
                      >
                        <option value="fees">Fees & UPI QR Payments</option>
                        <option value="attendance">Daily Attendance Tracking</option>
                        <option value="students">Student & Batch Enrollment</option>
                        <option value="parent">Parent Portal & OTP Access</option>
                        <option value="timetable">Timetable & Scheduling</option>
                        <option value="exams">Exams & Report Cards</option>
                        <option value="other">General Platform Feedback</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                        Urgency Level
                      </label>
                      <select
                        value={issuePriority}
                        onChange={(e) => setIssuePriority(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#F1F3F4] dark:bg-[#1E1F20] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] text-xs font-medium outline-none focus:border-[#1A73E8]"
                      >
                        <option value="low">Low - General query</option>
                        <option value="medium">Medium - Minor inconvenience</option>
                        <option value="high">High - Batch feature impaired</option>
                        <option value="critical">Critical - Coaching operations blocked</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Unable to record cash payment for Class 10 Batch A"
                      value={issueSubject}
                      onChange={(e) => setIssueSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F1F3F4] dark:bg-[#1E1F20] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] text-xs outline-none focus:border-[#1A73E8]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                      Detailed Description & Steps to Reproduce
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Please describe what happened, student/batch affected, and what you expected to see..."
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F1F3F4] dark:bg-[#1E1F20] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] text-xs outline-none focus:border-[#1A73E8] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                      Contact WhatsApp / Phone for Resolution Status
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#F1F3F4] dark:bg-[#1E1F20] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] text-xs outline-none focus:border-[#1A73E8]"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                      Avg response time: &lt; 15 mins during coaching hours
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#D93025] to-[#B31412] hover:brightness-110 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm hover:shadow-[var(--fb-glow-primary)] cursor-pointer disabled:opacity-50 disabled:hover:shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Transmitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Support Ticket</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: DIRECT SUPPORT & ONBOARDING HOTLINES */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Official WhatsApp Support */}
                <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500 text-white">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                        Official Coaching Support Line
                      </h4>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        WhatsApp & Voice Escalation
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Connect directly with an edtech onboarding engineer for coaching migration, bulk student Excel imports, or fee ledger verification.
                  </p>
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">+91 98765 43210</span>
                    <a
                      href="https://wa.me/919876543210?text=Hi%20VidyaOS%20Team,%20need%20assistance%20with%20my%20coaching%20center"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition flex items-center space-x-1"
                    >
                      <span>Open WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Email Support */}
                <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#1A73E8] text-white">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-blue-950 dark:text-blue-200">
                        Email & Compliance Desk
                      </h4>
                      <span className="text-[11px] text-blue-700 dark:text-blue-400">
                        GST, Billing & API Inquiries
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Send detailed bug traces, batch spreadsheets, or custom institutional deployment requirements.
                  </p>
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">support@vidyaos.in</span>
                    <a
                      href="mailto:support@vidyaos.in"
                      className="px-3 py-1.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-lg font-bold text-xs transition flex items-center space-x-1"
                    >
                      <span>Email Us</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Operating Hours & Blueprint Banner */}
              <div className="p-4 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-4 h-4 text-[#FFA000]" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Coaching Center Support Hours:
                    </span>{' '}
                    <span className="text-slate-500">Mon - Sat (8:30 AM to 8:30 PM IST)</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowHelpModal(false);
                    setShowArchitectureModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#3C4043] dark:hover:bg-[#505458] font-bold text-[11px] transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Layers className="w-3.5 h-3.5 text-[#FFA000]" />
                  <span>Inspect System Architecture</span>
                </button>
              </div>
            </div>
          )}
              </motion.div>
            </div>

            {/* Modal Footer */}
            <motion.div variants={fadeUp} className="p-4 border-t border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between text-xs bg-[#F8F9FA] dark:bg-[#18191B]">
              <div className="flex items-center space-x-2 text-[#5F6368] dark:text-[#9AA0A6]">
                <span>VidyaOS v2.4</span>
                <span>·</span>
                <span>Tenancy: {currentOrg.name}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] hover:bg-slate-100 dark:hover:bg-[#282A2C] font-semibold transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setActiveTab('report');
                    setSubmittedTicket(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#FFA000] to-[#E65100] text-slate-950 font-bold rounded-xl hover:brightness-105 transition hover:shadow-[var(--fb-glow-primary)] cursor-pointer"
                >
                  Report an Issue
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
