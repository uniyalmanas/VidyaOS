import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  PanelLeft,
  DownloadCloud
} from 'lucide-react';
import { UserRole } from '../../types';
import { VidyaLogo } from '../ui';
import { EditProfileModal } from '../profile/EditProfileModal';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PwaInstallModal } from './PwaInstallModal';

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
    announcements
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
    <header className="bg-white dark:bg-[#1E1F20] border-b border-[#DADCE0] dark:border-[#3C4043] sticky top-0 z-40 h-14 transition-colors duration-150 select-none">
      <div className="h-full px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section: Sidebar Toggle & Brand */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          {/* Sidebar Open Button (shown only when sidebar is closed, allowing user to reopen it) */}
          {setSidebarOpen && !sidebarOpen && (currentUser.role === 'CENTER_ADMIN' || currentUser.role === 'STAFF' || currentUser.role === 'PLATFORM_OWNER') && (
            <div className="relative group">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl text-[#202124] dark:text-[#E8EAED] bg-[#F1F3F4] dark:bg-[#282A2C] hover:bg-[#E8EAED] dark:hover:bg-[#3C4043] shadow-2xs transition-all duration-200 cursor-pointer flex items-center justify-center"
                aria-label="Open sidebar"
                title="Open sidebar"
              >
                <PanelLeft className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
              </button>
              {/* Tooltip */}
              <div className="hidden sm:block absolute left-0 top-full mt-1 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                Open sidebar
              </div>
            </div>
          )}

          {/* Mobile Drawer Hamburger for other roles if applicable */}
          {setSidebarOpen && currentUser.role !== 'CENTER_ADMIN' && currentUser.role !== 'STAFF' && currentUser.role !== 'PLATFORM_OWNER' && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition focus:outline-none cursor-pointer"
              title="Toggle navigation"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Official VidyaOS Brand Anchor (Disabled when logged in with a role) */}
          <div
            onClick={isAuthenticated ? undefined : () => navigate('/')}
            className={`flex items-center select-none ${
              isAuthenticated ? 'cursor-default' : 'cursor-pointer group'
            }`}
            title={isAuthenticated ? 'VidyaOS' : 'VidyaOS Home'}
          >
            <VidyaLogo size="sm" showBadge={false} />
          </div>

          <div className="h-4 w-px bg-[#DADCE0] dark:bg-[#3C4043] hidden sm:block mx-0.5" />

          {/* Coaching Center Display: When logged in, show ONLY current coaching name without dropdown */}
          {isAuthenticated && currentUser.role !== 'PLATFORM_OWNER' ? (
            <div
              className="flex items-center space-x-2 px-2.5 py-1 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-left shadow-2xs select-none"
              title={`Active Coaching Center: ${currentOrg.name}`}
            >
              <div className="w-4 h-4 rounded bg-[#FFA000] text-slate-950 text-[9px] font-black flex items-center justify-center flex-shrink-0">
                {currentOrg.logoText.slice(0, 2)}
              </div>
              <div className="max-w-[120px] sm:max-w-[200px] truncate">
                <span className="text-xs font-semibold font-google-sans text-[#202124] dark:text-[#E8EAED] truncate block leading-tight">
                  {currentOrg.name}
                </span>
              </div>
            </div>
          ) : currentUser.role === 'PLATFORM_OWNER' ? (
            <div ref={orgDropdownRef} className="relative">
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="flex items-center space-x-2 px-2.5 py-1 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] hover:bg-[#F1F3F4] dark:hover:bg-[#303134] hover:border-[#BDC1C6] transition text-left cursor-pointer shadow-2xs"
                title="Select Coaching Center Workspace"
              >
                <div className="w-4 h-4 rounded bg-[#FFA000] text-slate-950 text-[9px] font-black flex items-center justify-center flex-shrink-0">
                  {currentOrg.logoText.slice(0, 2)}
                </div>
                <div className="max-w-[100px] sm:max-w-[150px] truncate">
                  <span className="text-xs font-semibold font-google-sans text-[#202124] dark:text-[#E8EAED] truncate block leading-tight">
                    {currentOrg.name}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#5F6368] dark:text-[#9AA0A6] flex-shrink-0" />
              </button>

              {/* Firebase Project Switcher Dropdown (Super Admin only) */}
              {showOrgDropdown && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-[#1E1F20] rounded-xl shadow-lg border border-[#DADCE0] dark:border-[#3C4043] p-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
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
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#FFF8E1] dark:bg-[#FFA000]/15 text-[#E65100] dark:text-[#FFCA28] font-bold'
                              : 'hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED]'
                          }`}
                        >
                          <div className="truncate">
                            <div className="text-xs font-medium font-google-sans leading-tight">
                              {org.name}
                            </div>
                            <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                              {org.city} · {org.branches.length} Branch · {org.planId.toUpperCase()}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#FFA000] flex-shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>

                  {onOpenRegister && (
                    <div className="pt-1.5 mt-1 border-t border-[#DADCE0] dark:border-[#3C4043]">
                      <button
                        onClick={() => {
                          setShowOrgDropdown(false);
                          onOpenRegister();
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#FFF8E1] to-[#FFE082] dark:from-[#3E2723] dark:to-[#4E342E] text-[#B06000] dark:text-[#FFD54F] font-bold text-xs hover:shadow-2xs transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>+ Register New Center</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-left shadow-2xs select-none">
              <div className="w-4 h-4 rounded bg-[#FFA000] text-slate-950 text-[9px] font-black flex items-center justify-center flex-shrink-0">
                {currentOrg.logoText.slice(0, 2)}
              </div>
              <div className="max-w-[120px] sm:max-w-[200px] truncate">
                <span className="text-xs font-semibold font-google-sans text-[#202124] dark:text-[#E8EAED] truncate block leading-tight">
                  {currentOrg.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Google Omnibox Search Bar */}
        <div ref={searchRef} className="flex-1 max-w-lg mx-2 relative hidden md:block">
          <div
            className={`flex items-center px-3.5 py-1.5 rounded-full transition-all duration-150 border ${
              searchFocused
                ? 'bg-white dark:bg-[#1E1F20] border-[#FFA000] shadow-sm ring-2 ring-[#FFA000]/25'
                : 'bg-[#F1F3F4] dark:bg-[#282A2C] border-transparent hover:bg-[#E8EAED] dark:hover:bg-[#333538]'
            }`}
          >
            <Search
              className={`w-4 h-4 mr-2.5 flex-shrink-0 transition-colors ${
                searchFocused ? 'text-[#FFA000]' : 'text-[#5F6368] dark:text-[#9AA0A6]'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search students, batches, fees, teachers..."
              className="w-full bg-transparent text-xs text-[#202124] dark:text-[#E8EAED] placeholder-[#5F6368] dark:placeholder-[#9AA0A6] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-0.5 rounded-full hover:bg-black/10 text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Omnibox Search Results Dropdown */}
          {searchFocused && searchResults && (
            <div className="absolute top-10 left-0 right-0 bg-white dark:bg-[#1E1F20] rounded-xl shadow-xl border border-[#DADCE0] dark:border-[#3C4043] p-2 z-50 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1">
              {!searchResults.hasResults ? (
                <div className="py-6 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">
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
            </div>
          )}
        </div>

        {/* Right Section: Utility actions, Notifications, Help & Profile */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">

          {/* Install App Quick Action (Visible if not in standalone) */}
          {!pwaState.isInstalled && (
            <button
              onClick={() => setShowPwaModal(true)}
              className="px-2 py-1 rounded-lg text-[#FFA000] dark:text-[#FFCA28] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition focus:outline-none cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Install VidyaOS App on Android, iOS, or Laptop"
              aria-label="Install VidyaOS App"
            >
              <DownloadCloud className="w-4 h-4 text-[#FFA000] dark:text-[#FFCA28]" />
              <span className="text-xs font-semibold hidden sm:inline">Install App</span>
              <span className="text-[11px] font-semibold sm:hidden">App</span>
            </button>
          )}

          {/* Theme Quick Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition focus:outline-none cursor-pointer tooltip-bottom"
            data-tooltip={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark/light theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#FFA000]" />
            ) : (
              <Moon className="w-4 h-4 text-[#1A73E8]" />
            )}
          </button>

          {/* Help & Support Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 rounded-lg text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition focus:outline-none cursor-pointer tooltip-bottom"
            data-tooltip="Help & Documentation"
            aria-label="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Notifications Center */}
          <div ref={notifDropdownRef} className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-1.5 rounded-lg text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition relative focus:outline-none cursor-pointer tooltip-bottom"
              data-tooltip="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D93025]" />
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-1.5 w-80 bg-white dark:bg-[#1E1F20] rounded-xl shadow-xl border border-[#DADCE0] dark:border-[#3C4043] p-3 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between pb-2 border-b border-[#DADCE0] dark:border-[#3C4043]">
                  <span className="text-xs font-bold text-[#202124] dark:text-[#E8EAED]">Notifications</span>
                  <span className="text-[10px] text-[#1A73E8] dark:text-[#8AB4F8] font-medium cursor-pointer hover:underline">
                    Mark all read
                  </span>
                </div>
                <div className="divide-y divide-[#DADCE0]/50 dark:divide-[#3C4043] max-h-64 overflow-y-auto mt-1 custom-scrollbar">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.linkTab) {
                          setActiveTab(n.linkTab);
                          if (currentUser.role === 'CENTER_ADMIN') {
                            navigate(`/admin/${currentOrg.id}/${n.linkTab}`);
                          }
                        }
                        setShowNotifDropdown(false);
                      }}
                      className="py-2 px-1.5 hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] rounded-lg cursor-pointer transition text-xs space-y-0.5"
                    >
                      <div className="font-semibold text-[#202124] dark:text-[#E8EAED] flex items-center justify-between">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-[#80868B] font-normal">{n.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] line-clamp-2">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[#DADCE0] dark:bg-[#3C4043] mx-0.5" />

          {/* User Account Avatar & Dropdown (Google Account Menu) */}
          <div ref={userDropdownRef} className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-[#FFA000]/40 transition cursor-pointer"
              title={`${currentUser.name} (${currentUser.role})`}
              aria-label="User Account Menu"
            >
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-[#DADCE0] dark:border-[#3C4043]"
              />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-[#1E1F20] rounded-2xl shadow-xl border border-[#DADCE0] dark:border-[#3C4043] p-3 z-50 animate-in fade-in slide-in-from-top-1 text-left">
                {/* Account Header */}
                <div className="flex items-center space-x-3 pb-3 border-b border-[#DADCE0] dark:border-[#3C4043]">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#DADCE0] dark:border-[#3C4043]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold font-google-sans text-xs text-[#202124] dark:text-[#E8EAED] truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] truncate font-mono">
                      {currentUser.email}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-[#E65100] dark:text-[#FFD54F] mt-0.5">
                      {currentUser.role.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                {/* Edit Profile Button */}
                <div className="py-2 border-b border-[#DADCE0] dark:border-[#3C4043]">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowEditProfileModal(true);
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-lg bg-[#FFF8E1] dark:bg-[#FFA000]/15 border border-[#FFE082] dark:border-[#FFA000]/30 hover:bg-[#FFE082]/60 text-[#B06000] dark:text-[#FFCA28] font-bold text-xs transition cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Edit Person Profile</span>
                  </button>
                </div>

                {/* Switch Workspace Role Section */}
                <div className="py-2 border-b border-[#DADCE0] dark:border-[#3C4043]">
                  <div className="text-[10px] uppercase font-bold text-[#5F6368] dark:text-[#9AA0A6] px-2 mb-1">
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
                    ].map(r => (
                      <button
                        key={r.role}
                        onClick={() => {
                          switchRole(r.role as UserRole);
                          if (r.role === 'CENTER_ADMIN') {
                            navigate(`/admin/${currentOrg.id}`);
                          } else {
                            navigate(r.path);
                          }
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                          currentUser.role === r.role
                            ? 'bg-[#FFF8E1] dark:bg-[#FFA000]/15 text-[#E65100] dark:text-[#FFCA28] font-bold'
                            : 'hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED]'
                        }`}
                      >
                        <span>{r.label}</span>
                        {currentUser.role === r.role && <Check className="w-3.5 h-3.5 text-[#FFA000]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Actions */}
                <div className="pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowEditProfileModal(true);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] text-xs font-medium text-[#202124] dark:text-[#E8EAED] transition cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#5F6368] dark:text-[#9AA0A6]" />
                    <span>My Account Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowLoginModal(true);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] text-xs font-medium text-[#202124] dark:text-[#E8EAED] transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#5F6368] dark:text-[#9AA0A6]" />
                    <span>Switch Profile / Login</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium text-[#D93025] dark:text-[#F28B82] transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
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
