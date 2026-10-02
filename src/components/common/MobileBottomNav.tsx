import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  CreditCard,
  Menu,
  Award,
  Users,
  MessageSquare
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../context/RouterContext';
import { UserRole } from '../../types';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu }) => {
  const { currentUser, currentOrg, activeTab, setActiveTab, invoices, notifications } = useApp();
  const { navigate } = useRouter();

  // Calculate pending dues count for badge
  const pendingDuesCount = invoices.filter(
    i => i.status === 'pending' || i.status === 'overdue' || i.status === 'partially_paid'
  ).length;

  const unreadNotifs = notifications.filter(n => !n.read).length;

  // Define role-specific navigation items
  const getNavItems = (role: UserRole) => {
    switch (role) {
      case 'CENTER_ADMIN':
      case 'STAFF':
        return [
          { id: 'overview', label: 'Home', icon: LayoutDashboard },
          { id: 'batches', label: 'Batches', icon: BookOpen },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          {
            id: 'fees',
            label: 'Fees',
            icon: CreditCard,
            badge: pendingDuesCount > 0 ? pendingDuesCount : undefined
          },
          { id: 'menu', label: 'More', icon: Menu, isMenuTrigger: true }
        ];

      case 'TEACHER':
        return [
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'batches', label: 'Batches', icon: BookOpen },
          { id: 'marks', label: 'Marks', icon: Award },
          { id: 'menu', label: 'Menu', icon: Menu, isMenuTrigger: true }
        ];

      case 'PARENT':
        return [
          { id: 'overview', label: 'Summary', icon: LayoutDashboard },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          {
            id: 'fees',
            label: 'Pay Fees',
            icon: CreditCard,
            badge: pendingDuesCount > 0 ? pendingDuesCount : undefined
          },
          { id: 'results', label: 'Report', icon: Award },
          { id: 'menu', label: 'Menu', icon: Menu, isMenuTrigger: true }
        ];

      case 'STUDENT':
        return [
          { id: 'overview', label: 'Home', icon: LayoutDashboard },
          { id: 'schedule', label: 'Classes', icon: BookOpen },
          { id: 'materials', label: 'Notes', icon: Award },
          { id: 'menu', label: 'Menu', icon: Menu, isMenuTrigger: true }
        ];

      case 'PLATFORM_OWNER':
        return [
          { id: 'tenants', label: 'Centers', icon: LayoutDashboard },
          { id: 'plans', label: 'Plans', icon: Award },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'menu', label: 'Menu', icon: Menu, isMenuTrigger: true }
        ];

      default:
        return [
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'menu', label: 'Menu', icon: Menu, isMenuTrigger: true }
        ];
    }
  };

  const navItems = getNavItems(currentUser.role);
  const currentActive = activeTab || 'overview';

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl border-t border-black/[0.08] dark:border-white/[0.1] px-2 py-1.5 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = !item.isMenuTrigger && currentActive === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.isMenuTrigger) {
                  onOpenMenu();
                } else {
                  setActiveTab(item.id);
                  if (currentUser.role === 'CENTER_ADMIN' || currentUser.role === 'STAFF') {
                    if (currentOrg?.id) {
                      navigate(`/admin/${currentOrg.id}/${item.id}`);
                    } else {
                      navigate(`/admin/${item.id}`);
                    }
                  } else if (currentUser.role === 'TEACHER') {
                    navigate(`/teacher/${item.id}`);
                  } else if (currentUser.role === 'PARENT') {
                    navigate(`/parent/${item.id}`);
                  } else if (currentUser.role === 'STUDENT') {
                    navigate(`/student/${item.id}`);
                  } else if (currentUser.role === 'PLATFORM_OWNER') {
                    navigate(`/platform/${item.id}`);
                  }
                }
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[44px] rounded-xl transition-all duration-150 relative cursor-pointer active:scale-95 touch-target ${
                isActive
                  ? 'text-[#FFA000] dark:text-[#FFCA28] bg-amber-500/10 dark:bg-amber-500/15'
                  : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-black flex items-center justify-center shadow-xs tabular-nums">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight font-apple-text ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFA000] mt-0.5 shadow-[0_0_6px_#FFA000]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
