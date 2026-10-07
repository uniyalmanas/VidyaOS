import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  CreditCard,
  Clock,
  Award,
  FileText,
  FolderOpen,
  UserCheck,
  HeartHandshake,
  MessageSquare,
  Megaphone,
  BarChart3,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  PanelLeft,
  X,
  History,
  PhoneIncoming,
  CalendarDays,
  Wallet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { staggerContainerFast, fadeUp, fadeIn, tSpring } from '../../lib/motion';

export interface NavGroup {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[];
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

const DEFAULT_WIDTH = 220;
const MIN_WIDTH = 180;
const MAX_WIDTH = 320;
const COLLAPSED_WIDTH = 64;

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onToggle,
  isCollapsed,
  onToggleCollapsed
}) => {
  const { students, batches, invoices, announcements, teachers, inquiries, leaveRequests } = useApp();
  const { currentUser } = useAuth();

  // Real-time custom resizable sidebar width state (persisted in localStorage)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vidyaos_sidebar_custom_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_WIDTH) {
          return parsed === 256 ? DEFAULT_WIDTH : Math.min(parsed, MAX_WIDTH);
        }
      }
    }
    return DEFAULT_WIDTH;
  });

  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Save to localStorage when drag finishes
  useEffect(() => {
    if (!isResizing && typeof window !== 'undefined') {
      localStorage.setItem('vidyaos_sidebar_custom_width', sidebarWidth.toString());
    }
  }, [sidebarWidth, isResizing]);

  // Mouse drag handler for real-time resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const maxAllowed = Math.min(MAX_WIDTH, window.innerWidth * 0.45);
      const newWidth = Math.min(Math.max(startWidth + delta, MIN_WIDTH), maxAllowed);
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Touch drag handler for tablet / touchscreen support
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsResizing(true);
    const startX = e.touches[0].clientX;
    const startWidth = sidebarWidth;

    const onTouchMove = (moveEvent: TouchEvent) => {
      const delta = moveEvent.touches[0].clientX - startX;
      const maxAllowed = Math.min(MAX_WIDTH, window.innerWidth * 0.45);
      const newWidth = Math.min(Math.max(startWidth + delta, MIN_WIDTH), maxAllowed);
      setSidebarWidth(newWidth);
    };

    const onTouchEnd = () => {
      setIsResizing(false);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  // Double-click to reset width back to default
  const handleDoubleClick = () => {
    setSidebarWidth(DEFAULT_WIDTH);
  };

  const pendingInvoicesCount = invoices.filter(
    i => i.status === 'pending' || i.status === 'partially_paid' || i.status === 'overdue'
  ).length;

  const freshLeadsCount = inquiries.filter(i => i.status === 'new').length;

  // F3 — how many absence asks are waiting at the desk.
  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'pending').length;

  const navGroups: NavGroup[] = [
    {
      title: 'CORE OPERATIONS',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'students', label: 'Students', icon: Users, badge: students.length },
        { id: 'batches', label: 'Batches', icon: BookOpen, badge: batches.length },
        { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
        {
          id: 'fees',
          label: 'Fees & Invoicing',
          icon: CreditCard,
          badge: pendingInvoicesCount > 0 ? `${pendingInvoicesCount} due` : undefined,
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 font-bold'
        }
      ]
    },
    {
      title: 'ACADEMICS',
      items: [
        { id: 'timetable', label: 'Timetable', icon: Clock },
        { id: 'exams', label: 'Exams & Marks', icon: Award },
        { id: 'assignments', label: 'Homework', icon: FileText },
        { id: 'materials', label: 'Study Notes', icon: FolderOpen }
      ]
    },
    {
      title: 'PEOPLE',
      items: [
        { id: 'inquiries', label: 'Inquiries', icon: PhoneIncoming, badge: freshLeadsCount > 0 ? freshLeadsCount : undefined, badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 font-bold' },
        { id: 'leaves', label: 'Leaves', icon: CalendarDays, badge: pendingLeaveCount > 0 ? `${pendingLeaveCount} due` : undefined, badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold' },
        { id: 'teachers', label: 'Faculty', icon: UserCheck, badge: teachers.length },
        { id: 'staffops', label: 'Staff Ops', icon: Wallet },
        { id: 'parents', label: 'Parents', icon: HeartHandshake }
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        {
          id: 'discussions',
          label: 'VidyaChat (Slack)',
          icon: MessageSquare,
          badge: 'Live',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold'
        },
        { id: 'announcements', label: 'Announcements', icon: Megaphone, badge: announcements.length }
      ]
    },
    {
      title: 'REPORTS & SYSTEM',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'reports', label: 'Reports Export', icon: FileSpreadsheet },
        { id: 'audit', label: 'Audit Trail', icon: History },
        { id: 'settings', label: 'Center Settings', icon: Settings },
        { id: 'subscription', label: 'Billing & Plan', icon: ShieldCheck }
      ]
    }
  ];

  // Role-based navigation filtering: Front Desk Staff cannot access faculty salaries/mgmt, center P&L analytics, reports, audit, settings, or SaaS billing
  // ('staffops' joins 'teachers' — salary slips stay owner/admin-only in the UI; the Firestore rules still allow staff writes per spec.)
  const STAFF_RESTRICTED_TABS = ['teachers', 'staffops', 'analytics', 'reports', 'audit', 'settings', 'subscription'];
  const isStaff = currentUser?.role === 'STAFF';

  const visibleNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !isStaff || !STAFF_RESTRICTED_TABS.includes(item.id))
  })).filter(group => group.items.length > 0);

  return (
    <>
      {/* Mobile Off-Canvas Drawer Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar-backdrop"
            onClick={onToggle}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ChatGPT-style Smooth & Resizable Navigation Sidebar */}
      <aside
        style={{
          width: isOpen
            ? (typeof window !== 'undefined' && window.innerWidth >= 768 ? `${isCollapsed ? COLLAPSED_WIDTH : sidebarWidth}px` : undefined)
            : '0px',
          minWidth: isOpen
            ? (typeof window !== 'undefined' && window.innerWidth >= 768 ? `${isCollapsed ? COLLAPSED_WIDTH : sidebarWidth}px` : undefined)
            : '0px'
        }}
        className={`bg-white dark:bg-[#1C1C1E] border-r border-black/[0.08] dark:border-white/[0.08] flex flex-col flex-shrink-0 select-none relative ${
          isResizing ? 'transition-none select-none' : 'transition-[width,opacity] duration-300 ease-in-out'
        } ${
          isOpen
            ? 'fixed inset-y-0 left-0 z-50 w-64 md:w-auto shadow-2xl flex md:relative md:shadow-none md:z-auto opacity-100'
            : 'w-0 opacity-0 pointer-events-none border-r-0 overflow-hidden'
        }`}
        aria-label="Application Navigation"
      >
        {/* Real-time Draggable Resize Handle on Right Border */}
        {isOpen && !isCollapsed && (
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={handleDoubleClick}
            className={`hidden md:flex items-center justify-center absolute top-0 -right-1 w-2.5 h-full cursor-col-resize z-30 group select-none transition-colors ${
              isResizing ? 'bg-[#0071E3]' : 'hover:bg-[#0071E3]/40'
            }`}
            title="Drag to resize sidebar width · Double-click to reset (220px)"
            aria-label="Drag to resize sidebar width"
          >
            {/* Grip indicator pill on hover/drag */}
            <div
              className={`w-1 h-8 rounded-full transition-all duration-150 ${
                isResizing
                  ? 'bg-slate-900 dark:bg-white scale-y-125'
                  : 'bg-transparent group-hover:bg-[#0071E3]'
              }`}
            />
          </div>
        )}

        <div className={`flex items-center border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] ${isCollapsed ? 'justify-between md:justify-center px-3 md:px-2 py-2' : 'justify-between px-3 py-2'}`}>
          <span className={`text-xs font-bold text-[#86868B] font-apple-text tracking-wider ${isCollapsed ? 'md:hidden' : ''}`}>NAVIGATION</span>
          <button
            onClick={onToggleCollapsed}
            className="hidden md:block p-1.5 rounded-lg text-slate-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
            aria-label={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
            title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
          >
            <PanelLeft className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={onToggle}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
            aria-label="Close Navigation"
            title="Close Navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Front Desk Staff Workspace Pill (If logged in as staff) */}
        {isStaff && (
          <div className={`mx-2 mt-2.5 mb-1 px-3 py-2 bg-[#E8F0FE] dark:bg-[#1A73E8]/15 rounded-xl border border-[#D2E3FC] dark:border-[#1A73E8]/30 flex items-center space-x-2 ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}>
            <span className="w-2 h-2 rounded-full bg-[#1A73E8] animate-pulse shrink-0" />
            <div className={`text-[11px] leading-tight text-[#174EA6] dark:text-[#8AB4F8] ${isCollapsed ? 'md:hidden' : ''}`}>
              <span className="font-bold block">Front Desk Counter</span>
              <span className="text-[10px] text-[#1967D2] dark:text-[#AECBFA]">Limited Staff Mode</span>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Groups */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainerFast}
          className={`flex-1 overflow-y-auto py-2.5 custom-scrollbar space-y-3 ${isCollapsed ? 'px-1.5' : 'px-2'}`}
        >
          {visibleNavGroups.map((group) => (
            <motion.div key={group.title} variants={fadeUp} className="space-y-0.5">
              {/* Group Title */}
              <div className={`flex items-center justify-between px-3 py-1 ${isCollapsed ? 'md:hidden' : ''}`}>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold tracking-wider text-[#86868B] uppercase font-apple-text">
                    {group.title}
                  </span>
                </div>
              </div>

              {/* Navigation Items */}
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <motion.button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      if (window.innerWidth < 768) {
                        onToggle();
                      }
                    }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    aria-label={item.label}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center transition-[color,background-color,box-shadow] duration-150 relative text-left group cursor-pointer rounded-xl text-xs px-3 py-2 space-x-3 ${
                      isCollapsed ? 'md:justify-center md:px-2 md:py-2.5 md:space-x-0' : ''
                    } ${
                      isActive
                        ? 'bg-[#EAF4FF] dark:bg-[#112A43] text-[#005ECF] dark:text-[#5AC8FA] font-bold shadow-2xs'
                        : 'text-[#86868B] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1D1D1F] dark:hover:text-white font-medium'
                    }`}
                  >
                    {/* Active Left Indicator Bar — slides between items via shared layoutId */}
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        transition={tSpring}
                        className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#0071E3]"
                        aria-hidden="true"
                      />
                    )}

                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#0071E3] dark:text-[#5AC8FA]'
                          : 'text-[#86868B] group-hover:text-[#1D1D1F] dark:group-hover:text-white'
                      }`}
                    />

                    <span className={`flex-1 truncate tracking-tight text-xs font-apple-text ${isCollapsed ? 'md:hidden' : ''}`}>
                      {item.label}
                    </span>

                    {item.badge !== undefined && !isCollapsed && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                          item.badgeColor
                            ? item.badgeColor
                            : isActive
                            ? 'bg-[#EAF4FF] text-[#005ECF] dark:text-[#5AC8FA]'
                            : 'bg-black/[0.04] text-[#86868B] dark:bg-white/[0.08] dark:text-[#86868B]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          ))}
        </motion.div>
      </aside>
    </>
  );
};
