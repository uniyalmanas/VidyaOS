import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

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
}

const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 190;
const MAX_WIDTH = 480;

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onToggle
}) => {
  const { students, batches, invoices, announcements, teachers } = useApp();
  const { currentUser } = useAuth();

  // Real-time custom resizable sidebar width state (persisted in localStorage)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vidyaos_sidebar_custom_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          return parsed;
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
          badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 font-bold'
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
        { id: 'teachers', label: 'Faculty', icon: UserCheck, badge: teachers.length },
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
        { id: 'settings', label: 'Center Settings', icon: Settings },
        { id: 'subscription', label: 'Billing & Plan', icon: ShieldCheck }
      ]
    }
  ];

  // Role-based navigation filtering: Front Desk Staff cannot access faculty salaries/mgmt, center P&L analytics, reports, settings, or SaaS billing
  const STAFF_RESTRICTED_TABS = ['teachers', 'analytics', 'reports', 'settings', 'subscription'];
  const isStaff = currentUser?.role === 'STAFF';

  const visibleNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !isStaff || !STAFF_RESTRICTED_TABS.includes(item.id))
  })).filter(group => group.items.length > 0);

  return (
    <>
      {/* Mobile Off-Canvas Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* ChatGPT-style Smooth & Resizable Navigation Sidebar */}
      <aside
        style={{
          width: isOpen
            ? (typeof window !== 'undefined' && window.innerWidth >= 768 ? `${sidebarWidth || 256}px` : undefined)
            : '0px',
          minWidth: isOpen
            ? (typeof window !== 'undefined' && window.innerWidth >= 768 ? `${sidebarWidth || 256}px` : undefined)
            : '0px'
        }}
        className={`bg-white dark:bg-[#1E1F20] border-r border-[#DADCE0] dark:border-[#3C4043] flex flex-col flex-shrink-0 select-none relative ${
          isResizing ? 'transition-none select-none' : 'transition-[width,opacity] duration-300 ease-in-out'
        } ${
          isOpen
            ? 'fixed inset-y-0 left-0 z-50 w-72 md:w-auto shadow-2xl flex md:relative md:shadow-none md:z-auto opacity-100'
            : 'w-0 opacity-0 pointer-events-none border-r-0 overflow-hidden'
        }`}
        aria-label="Application Navigation"
      >
        {/* Real-time Draggable Resize Handle on Right Border */}
        {isOpen && (
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={handleDoubleClick}
            className={`hidden md:flex items-center justify-center absolute top-0 -right-1 w-2.5 h-full cursor-col-resize z-30 group select-none transition-colors ${
              isResizing ? 'bg-[#FFA000]' : 'hover:bg-[#FFA000]/40'
            }`}
            title="Drag to resize sidebar width · Double-click to reset (256px)"
            aria-label="Drag to resize sidebar width"
          >
            {/* Grip indicator pill on hover/drag */}
            <div
              className={`w-1 h-8 rounded-full transition-all duration-150 ${
                isResizing
                  ? 'bg-slate-900 dark:bg-white scale-y-125'
                  : 'bg-transparent group-hover:bg-[#FFA000]'
              }`}
            />
          </div>
        )}

        {/* Mobile Close Button in Drawer Header */}
        <div className="flex md:hidden items-center justify-between p-2.5 border-b border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C]">
          <span className="text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] font-google-sans">NAVIGATION</span>
          <button
            onClick={onToggle}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            aria-label="Close Navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Front Desk Staff Workspace Pill (If logged in as staff) */}
        {isStaff && (
          <div className="mx-2 mt-2.5 mb-1 px-3 py-2 bg-[#E8F0FE] dark:bg-[#1A73E8]/15 rounded-xl border border-[#D2E3FC] dark:border-[#1A73E8]/30 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#1A73E8] animate-pulse shrink-0" />
            <div className="text-[11px] leading-tight text-[#174EA6] dark:text-[#8AB4F8]">
              <span className="font-bold block">Front Desk Counter</span>
              <span className="text-[10px] text-[#1967D2] dark:text-[#AECBFA]">Limited Staff Mode</span>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-2.5 px-2 custom-scrollbar space-y-3">
          {visibleNavGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              {/* Group Title */}
              <div className="flex items-center justify-between px-3 py-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold tracking-wider text-[#80868B] dark:text-[#9AA0A6] uppercase font-google-sans">
                    {group.title}
                  </span>
                  {group.title === 'CORE OPERATIONS' && (
                    <button
                      onClick={onToggle}
                      className="p-1 rounded-md text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] hover:text-[#202124] dark:hover:text-white transition-all cursor-pointer group/toggle inline-flex items-center justify-center"
                      title="Collapse sidebar"
                      aria-label="Collapse sidebar"
                    >
                      <PanelLeft className="w-3.5 h-3.5 transition-transform group-hover/toggle:scale-110" />
                    </button>
                  )}
                </div>
              </div>

              {/* Navigation Items */}
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      if (window.innerWidth < 768) {
                        onToggle();
                      }
                    }}
                    aria-label={item.label}
                    className={`w-full flex items-center transition-all duration-150 relative text-left group cursor-pointer px-3 py-2 rounded-xl space-x-3 text-xs ${
                      isActive
                        ? 'bg-[#FFF8E1] dark:bg-[#FFA000]/15 text-[#E65100] dark:text-[#FFCA28] font-bold shadow-2xs'
                        : 'text-[#5F6368] dark:text-[#C4C7C5] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] hover:text-[#202124] dark:hover:text-white font-medium'
                    }`}
                  >
                    {/* Active Left Indicator Bar */}
                    {isActive && (
                      <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#FFA000]" />
                    )}

                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#FFA000]'
                          : 'text-[#5F6368] dark:text-[#9AA0A6] group-hover:text-[#202124] dark:group-hover:text-white'
                      }`}
                    />

                    <span className="flex-1 truncate tracking-tight text-xs font-google-sans">
                      {item.label}
                    </span>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.badgeColor
                            ? item.badgeColor
                            : isActive
                            ? 'bg-[#FFA000]/25 text-[#B06000] dark:text-[#FFD54F]'
                            : 'bg-[#F1F3F4] text-[#5F6368] dark:bg-[#3C4043] dark:text-[#9AA0A6]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};
