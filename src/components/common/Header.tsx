import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from '../../context/RouterContext';
import {
  Menu,
  Search,
  HelpCircle,
  Bell,
  ChevronDown,
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Check,
  LogOut,
  LogIn,
  KeyRound,
  Shield,
  Clock,
  Sun,
  Moon,
  X,
  CreditCard,
  Layers,
  Flame,
  Sparkles,
  Plus,
  ExternalLink,
  CheckCircle2,
  UserCheck,
  DownloadCloud,
  Lock
} from 'lucide-react';
import { UserRole } from '../../types';
import { VidyaLogo } from '../ui';
import { EditProfileModal } from '../profile/EditProfileModal';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PwaInstallModal } from './PwaInstallModal';
import { dropdownIn, fadeUp, staggerContainerFast, tSpring } from '../../lib/motion';

interface HeaderProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  onOpenLanding?: () => void;
  onOpenRegister?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  onOpenLanding,
  onOpenRegister
}) => {
  const {
    currentOrg,
    organizations,
    setCurrentOrgId,
    currentUser,
    switchRole,
    setShowArchitectureModal,
    setShowHelpModal,
    notifications,
    setActiveTab,
    selectedBranchId,
    setSelectedBranchId,
    students,
    batches,
    invoices,
    teachers,
    announcements,
    showToast
  } = useApp();

  const {
    session,
    isAuthenticated,
    logout,
    setShowLoginModal
  } = useAuth();

  const {
    theme,
    resolvedTheme,
    toggleTheme
  } = useTheme();

  const { navigate } = useRouter();

  // Dropdown states
  const [showOrgDropdown, setShowOrgDropdown] = useState<boolean>(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);

  // PWA Install state
  const pwaState = usePwaInstall();
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);

  // Omnibox Global Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchFocused(false);
      }
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(target)) {
        setShowOrgDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setShowUserDropdown(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter global search results
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();

    const matchedStudents = students
      .filter(s => s.name.toLowerCase().includes(q) || s.enrollmentNo?.toLowerCase().includes(q))
      .slice(0, 3);

    const matchedBatches = batches
      .filter(b => b.name.toLowerCase().includes(q) || b.subject.toLowerCase().includes(q))
      .slice(0, 3);

    const matchedInvoices = invoices
      .filter(i => {
        const student = students.find(s => s.id === i.studentId);
        return i.invoiceNo.toLowerCase().includes(q) || (student && student.name.toLowerCase().includes(q));
      })
      .slice(0, 3);

    const hasResults =
      matchedStudents.length > 0 ||
      matchedBatches.length > 0 ||
      matchedInvoices.length > 0;

    return {
      hasResults,
      students: matchedStudents,
      batches: matchedBatches,
      invoices: matchedInvoices
    };
  }, [searchQuery, students, batches, invoices]);

  const handleResultClick = (tabName: string) => {
    setActiveTab(tabName);
    if (currentUser.role === 'CENTER_ADMIN') {
      navigate(`/admin/${currentOrg.id}/${tabName}`);
    }
    setSearchFocused(false);
    setSearchQuery('');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white/85 dark:bg-[#141416]/85 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.1] sticky top-0 z-40 h-16 sm:h-14 transition-colors duration-150 select-none">
      <div className="h-full px-2.5 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Left Section: Sidebar Toggle & Brand (Flex-shrinkable so right profile never gets pushed out) */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink">
          {/* Mobile Drawer Hamburger for other roles if applicable */}
          {setSidebarOpen && currentUser.role !== 'CENTER_ADMIN' && currentUser.role !== 'STAFF' && currentUser.role !== 'PLATFORM_OWNER' && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 rounded-lg text-[#86868B] dark:text-[#86868B] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition focus:outline-none cursor-pointer flex-shrink-0"
              title="Toggle navigation"
              aria-label="Toggle navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Official VidyaOS Brand Anchor (Disabled when logged in with a role) */}
          <div
            onClick={isAuthenticated ? undefined : () => navigate('/')}
            className={`flex items-center select-none flex-shrink-0 ${
              isAuthenticated ? 'cursor-default' : 'cursor-pointer group'
            }`}
            title={isAuthenticated ? 'VidyaOS' : 'VidyaOS Home'}
          >
            <VidyaLogo size="sm" showBadge={false} />
          </div>

          <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.12] hidden sm:block mx-0.5 flex-shrink-0" />

          {/* Coaching Center Display: Responsive flexbox shrinking */}
          {isAuthenticated && currentUser.role !== 'PLATFORM_OWNER' ? (
            <div
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.06] text-left shadow-2xs select-none min-w-0 flex-shrink"
              title={`Active Coaching Center: ${currentOrg.name}`}
            >
              <div className="w-5 h-5 rounded-lg bg-[#FFA000] text-slate-950 text-[9px] font-black flex items-center justify-center flex-shrink-0 shadow-2xs">
                {currentOrg.logoText.slice(0, 2)}
              </div>
              <div className="max-w-[70px] sm:max-w-[160px] md:max-w-[200px] truncate min-w-0 hidden min-[480px]:block">
                <span className="text-xs font-semibold font-apple-text text-[#1D1D1F] dark:text-[#F5F5F7] truncate block leading-tight">
                  {currentOrg.name}
                </span>
              </div>
            </div>
          ) : currentUser.role === 'PLATFORM_OWNER' ? (
            <div ref={orgDropdownRef} className="relative">
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="flex items-center space-x-2 px-2.5 py-1 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition text-left cursor-pointer shadow-2xs"
                title="Select Coaching Center Workspace"
              >
                <div className="w-4 h-4 rounded-lg bg-[#FFA000] text-slate-950 text-[9px] font-black flex items-center justify-center flex-shrink-0">
                  {currentOrg.logoText.slice(0, 2)}
                </div>
                <div className="max-w-[100px] sm:max-w-[150px] truncate">
                  <span className="text-xs font-semibold font-apple-text text-[#1D1D1F] dark:text-[#F5F5F7] truncate block leading-tight">
                    {currentOrg.name}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#86868B] dark:text-[#86868B] flex-shrink-0" />
              </button>

              {/* Firebase Project Switcher Dropdown (Super Admin only) */}
              <AnimatePresence>
              {showOrgDropdown && (
                <motion.div
                  key="org-dropdown"
                  variants={dropdownIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute left-0 mt-2 w-72 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] p-2 z-50"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
                    Active Centers ({organizations.length})
                  </div>
                  <div className="space-y-0.5 max-h-56 overflow-y-auto custom-scrollbar">
                    {organizations.map(org => {
                      const isSelected = org.id === currentOrg.id;
                      return (
                        <button
                          key={org.id}
                          onClick={() => {
                            setCurrentOrgId(org.id);
                            setShowOrgDropdown(false);
                          }}
                          className={`relative w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer ${
                            isSelected
                              ? 'text-[#E65100] dark:text-[#FFCA28] font-bold'
                              : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[#1D1D1F] dark:text-[#F5F5F7]'
                          }`}
                        >
                          {/* Sliding selected-row indicator */}
                          {isSelected && (
                            <motion.span
                              layoutId="org-switcher-active"
                              transition={tSpring}
                              className="absolute inset-0 rounded-xl bg-[#FFF8E1] dark:bg-[#FFA000]/15"
                              aria-hidden="true"
                            />
                          )}
                          <div className="truncate relative">
                            <div className="text-xs font-semibold font-apple-text leading-tight">
                              {org.name}
                            </div>
                            <div className="text-[10px] text-[#86868B] mt-0.5 font-apple-text">
                              {org.city} · {org.branches.length} Branch · {org.planId.toUpperCase()}
                            </div>
                          </div>
                          {isSelected && <Check className="relative w-4 h-4 text-[#FFA000] flex-shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>

                  {onOpenRegister && (
                    <div className="pt-1.5 mt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
                      <button
                        onClick={() => {
                          setShowOrgDropdown(false);
                          onOpenRegister();
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#FFF8E1] to-[#FFE082] dark:from-[#3E2723] dark:to-[#4E342E] text-[#B06000] dark:text-[#FFD54F] font-bold text-xs hover:shadow-2xs transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>+ Register New Center</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.06] text-left shadow-2xs select-none">
              <div className="w-4 h-4 rounded bg-[#FFA000] text-slate-950 text-[9px] font-black flex items-center justify-center flex-shrink-0">
                {currentOrg.logoText.slice(0, 2)}
              </div>
              <div className="max-w-[120px] sm:max-w-[200px] truncate">
                <span className="text-xs font-semibold font-apple-text text-[#1D1D1F] dark:text-[#F5F5F7] truncate block leading-tight">
                  {currentOrg.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Apple-style Omnibox Search Bar */}
        <div ref={searchRef} className="flex-1 max-w-lg mx-2 relative hidden md:block">
          <div
            className={`flex items-center px-3.5 py-1.5 rounded-full transition-all duration-150 border ${
              searchFocused
                ? 'bg-white dark:bg-[#2C2C2E] border-[#FFA000] shadow-sm ring-2 ring-[#FFA000]/25'
                : 'bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
            }`}
          >
            <Search
              className={`w-4 h-4 mr-2.5 flex-shrink-0 transition-colors ${
                searchFocused ? 'text-[#FFA000]' : 'text-[#86868B]'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search students, batches, fees, teachers..."
              className="w-full bg-transparent text-xs text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none font-apple-text"
            />
            {searchQuery && (
              <motion.button
                onClick={() => setSearchQuery('')}
                whileTap={{ scale: 0.9 }}
                className="p-0.5 rounded-full hover:bg-black/10 text-slate-500 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>

          {/* Omnibox Search Results Dropdown */}
          <AnimatePresence>
          {searchFocused && searchResults && (
            <motion.div
              key="omnibox-results"
              variants={dropdownIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute top-10 left-0 right-0 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] p-2 z-50 max-h-80 overflow-y-auto custom-scrollbar"
            >
              {!searchResults.hasResults ? (
                <div className="py-6 text-center text-xs text-[#86868B]">
                  No matching records found for "{searchQuery}".
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.students.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-[#5F6368] dark:text-[#9AA0A6] uppercase tracking-wider px-2 mb-1">
                        Students
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.students.map(s => (
                          <div
                            key={s.id}
                            onClick={() => handleResultClick('students')}
                            className="p-2 rounded-lg hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] cursor-pointer flex items-center justify-between text-xs transition"
                          >
                            <span className="font-semibold text-[#202124] dark:text-[#E8EAED]">{s.name}</span>
                            <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] font-mono">{s.enrollmentNo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.batches.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-[#5F6368] dark:text-[#9AA0A6] uppercase tracking-wider px-2 mb-1">
                        Batches
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.batches.map(b => (
                          <div
                            key={b.id}
                            onClick={() => handleResultClick('batches')}
                            className="p-2 rounded-lg hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] cursor-pointer flex items-center justify-between text-xs transition"
                          >
                            <span className="font-semibold text-[#202124] dark:text-[#E8EAED]">{b.name}</span>
                            <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">{b.timeSlot}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.invoices.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-[#5F6368] dark:text-[#9AA0A6] uppercase tracking-wider px-2 mb-1">
                        Fee Records
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.invoices.map(inv => {
                          const student = students.find(s => s.id === inv.studentId);
                          return (
                            <div
                              key={inv.id}
                              onClick={() => handleResultClick('fees')}
                              className="p-2 rounded-lg hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] cursor-pointer flex items-center justify-between text-xs transition"
                            >
                              <div>
                                <span className="font-semibold text-[#202124] dark:text-[#E8EAED]">{student?.name || 'Student'}</span>
                                <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] ml-2 font-mono">{inv.invoiceNo}</span>
                              </div>
                              <span className="font-semibold text-[#188038] dark:text-[#81C995]">₹{(inv.netAmount ?? 0).toLocaleString('en-IN')}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Right Section: Utility actions, Notifications, Help & Profile */}
        {/* Right Section: Utility actions, Notifications, Help & Profile */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0 z-10">

          {/* Install App Quick Action (Desktop & Tablet only to conserve mobile space) */}
          {!pwaState.isInstalled && (
            <motion.button
              onClick={() => setShowPwaModal(true)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="hidden md:inline-flex px-2 py-1 rounded-lg text-[#FFA000] dark:text-[#FFCA28] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-[color,background-color,border-color,box-shadow] focus:outline-none cursor-pointer items-center gap-1.5 shadow-2xs flex-shrink-0"
              title="Install VidyaOS App on Android, iOS, or Laptop"
              aria-label="Install VidyaOS App"
            >
              <DownloadCloud className="w-4 h-4 text-[#FFA000] dark:text-[#FFCA28]" />
              <span className="text-xs font-semibold">Install App</span>
            </motion.button>
          )}

          {/* Theme Quick Toggle */}
          <motion.button
            onClick={toggleTheme}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="p-2 rounded-full text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-[color,background-color,box-shadow] focus:outline-none cursor-pointer flex-shrink-0"
            title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark/light theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#FFA000]" />
            ) : (
              <Moon className="w-4 h-4 text-[#0071E3]" />
            )}
          </motion.button>

          {/* Help & Support Button (hidden on narrow screens to prevent crowding) */}
          <motion.button
            onClick={() => setShowHelpModal(true)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="hidden sm:inline-flex p-2 rounded-full text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-[color,background-color,box-shadow] focus:outline-none cursor-pointer flex-shrink-0"
            title="Help & Documentation"
            aria-label="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </motion.button>

          {/* Notifications Center */}
          <div ref={notifDropdownRef} className="relative flex-shrink-0">
            <motion.button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="p-1.5 sm:p-2 rounded-xl text-[#86868B] dark:text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-[color,background-color,box-shadow] relative focus:outline-none cursor-pointer"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF3B30] ring-2 ring-white dark:ring-[#1C1C1E]" />
              )}
            </motion.button>

            <AnimatePresence>
            {showNotifDropdown && (
              <motion.div
                key="notifications-dropdown"
                variants={dropdownIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] p-3 z-50"
              >
                <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <span className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">Notifications</span>
                  <span className="text-[10px] text-[#0071E3] dark:text-[#2997FF] font-semibold cursor-pointer hover:underline">
                    Mark all read
                  </span>
                </div>
                <motion.div
                  variants={staggerContainerFast}
                  className="divide-y divide-black/[0.04] dark:divide-white/[0.06] max-h-64 overflow-y-auto mt-1 custom-scrollbar"
                >
                  {notifications.map(n => (
                    <motion.div
                      key={n.id}
                      variants={fadeUp}
                      onClick={() => {
                        if (n.linkTab) {
                          setActiveTab(n.linkTab);
                          if (currentUser.role === 'CENTER_ADMIN') {
                            navigate(`/admin/${currentOrg.id}/${n.linkTab}`);
                          }
                        }
                        setShowNotifDropdown(false);
                      }}
                      className="py-2.5 px-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl cursor-pointer transition-[color,background-color,border-color] text-xs space-y-0.5"
                    >
                      <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center justify-between">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-[#86868B] font-normal font-apple-text">{n.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-[#86868B] line-clamp-2">{n.message}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.12] mx-0.5" />

          {/* User Account Avatar & Dropdown (Always visible and accessible) */}
          <div ref={userDropdownRef} className="relative flex-shrink-0">
            <motion.button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="flex items-center space-x-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-[#FFA000]/40 transition-[color,background-color,box-shadow] cursor-pointer"
              title={`${currentUser.name} (${currentUser.role})`}
              aria-label="User Account Menu"
            >
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser.name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-[#FFA000]/50 dark:border-[#FFA000]/60 shadow-2xs"
              />
            </motion.button>

            <AnimatePresence>
            {showUserDropdown && (
              <motion.div
                key="user-dropdown"
                variants={dropdownIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] p-3 z-50 text-left"
              >
                {/* Account Header */}
                <div className="flex items-center space-x-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.1]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold font-apple-text text-xs text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-[#86868B] truncate font-mono">
                      {currentUser.email}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-[#E65100] dark:text-[#FFD54F] mt-0.5 font-apple-text">
                      {currentUser.role.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                {/* Edit Profile Button */}
                <div className="py-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowEditProfileModal(true);
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-[#FFF8E1] dark:bg-[#FFA000]/15 border border-[#FFE082] dark:border-[#FFA000]/30 hover:bg-[#FFE082]/60 text-[#B06000] dark:text-[#FFCA28] font-bold text-xs transition cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Edit Person Profile</span>
                  </button>
                </div>

                {/* Switch Workspace Role Section */}
                <div className="py-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="text-[10px] uppercase font-bold text-[#86868B] px-2 mb-1.5 font-apple-text tracking-wider">
                    Switch Active Portal
                  </div>
                  <div className="space-y-0.5">
                    {[
                      { role: 'CENTER_ADMIN', label: 'Center Admin Console', path: '/admin' },
                      { role: 'TEACHER', label: 'Faculty Portal', path: '/teacher' },
                      { role: 'PARENT', label: 'Parent Portal', path: '/parent' },
                      { role: 'STUDENT', label: 'Student Workspace', path: '/student' },
                      ...(currentUser.role === 'PLATFORM_OWNER'
                        ? [{ role: 'PLATFORM_OWNER', label: 'SaaS Super Admin', path: '/owner' }]
                        : [])
                    ].map(r => {
                      const isCurrent = currentUser.role === r.role;
                      // A production session only ever holds one role, so the other
                      // portals belong to different accounts. `switchRole` used to be
                      // called regardless and quietly did nothing — while still
                      // clobbering `activeTab` — which read as broken impersonation
                      // instead of a permission check. Demo persona hopping exists
                      // only in DEV.
                      const canEnter = isCurrent || import.meta.env.DEV;
                      return (
                        <button
                          key={r.role}
                          aria-disabled={!canEnter}
                          onClick={() => {
                            if (!canEnter) {
                              showToast(
                                `Your account is signed in as ${currentUser.role.replace('_', ' ')}. Sign in with the account that owns the ${r.label} to open it.`,
                                'info'
                              );
                              setShowUserDropdown(false);
                              return;
                            }
                            switchRole(r.role as UserRole);
                            if (r.role === 'CENTER_ADMIN') {
                              navigate(`/admin/${currentOrg.id}`);
                            } else {
                              navigate(r.path);
                            }
                            setShowUserDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                            isCurrent
                              ? 'bg-[#FFF8E1] dark:bg-[#FFA000]/15 text-[#E65100] dark:text-[#FFCA28] font-bold'
                              : `hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[#1D1D1F] dark:text-[#F5F5F7]${canEnter ? '' : ' opacity-55'}`
                          }`}
                        >
                          <span className="font-apple-text flex items-center gap-1.5">
                            {!canEnter && <Lock className="w-3 h-3" />}
                            {r.label}
                          </span>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-[#FFA000]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Account Actions */}
                <div className="pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowEditProfileModal(true);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] transition cursor-pointer font-apple-text"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#86868B]" />
                    <span>My Account Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowLoginModal(true);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] transition cursor-pointer font-apple-text"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#86868B]" />
                    <span>Switch Profile / Login</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl hover:bg-rose-500/10 text-xs font-medium text-[#FF3B30] dark:text-[#FF453A] transition cursor-pointer font-apple-text"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Global Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
      />

      {/* PWA Install Modal */}
      <PwaInstallModal
        isOpen={showPwaModal}
        onClose={() => setShowPwaModal(false)}
        pwaState={pwaState}
      />
    </header>
  );
};
