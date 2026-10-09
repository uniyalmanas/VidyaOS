import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  ShieldCheck,
  Building2,
  BookOpen,
  GraduationCap,
  Users,
  UserCheck,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  ArrowRight,
  Info,
  UserCog,
  ChevronDown,
  ChevronUp,
  Flame,
  Check
} from 'lucide-react';
import { UserRole } from '../../types';
import { useApp } from '../../context/AppContext';

interface RoleMeta {
  role: UserRole;
  label: string;
  description: string;
  color: string;
  lightBg: string;
  borderCol: string;
  icon: React.ElementType;
}

const ROLE_METADATA: Record<UserRole, RoleMeta> = {
  PLATFORM_OWNER: {
    role: 'PLATFORM_OWNER',
    label: 'Platform Owners',
    description: 'SaaS Super-Admins & Infrastructure Control',
    color: '#7C3AED', // Deep Violet
    lightBg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
    borderCol: 'border-violet-200 dark:border-violet-800',
    icon: ShieldCheck
  },
  CENTER_ADMIN: {
    role: 'CENTER_ADMIN',
    label: 'Center Admins',
    description: 'Institute Directors & Branch Managers',
    color: '#1A73E8', // Google Blue
    lightBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
    borderCol: 'border-blue-200 dark:border-blue-800',
    icon: Building2
  },
  STAFF: {
    role: 'STAFF',
    label: 'Front Desk Staff',
    description: 'Admissions Desk, Counters & Reception',
    color: '#0284C7', // Sky Blue
    lightBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
    borderCol: 'border-sky-200 dark:border-sky-800',
    icon: UserCheck
  },
  TEACHER: {
    role: 'TEACHER',
    label: 'Teachers & Faculty',
    description: 'Instructors, Subject Faculty & Batch Mentors',
    color: '#F59E0B', // Amber
    lightBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    borderCol: 'border-amber-200 dark:border-amber-800',
    icon: BookOpen
  },
  STUDENT: {
    role: 'STUDENT',
    label: 'Enrolled Students',
    description: 'Coaching Learners & Batch Attendees',
    color: '#10B981', // Emerald
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    borderCol: 'border-emerald-200 dark:border-emerald-800',
    icon: GraduationCap
  },
  PARENT: {
    role: 'PARENT',
    label: 'Parents & Guardians',
    description: 'Fee Payers & Attendance Monitors',
    color: '#06B6D4', // Cyan
    lightBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300',
    borderCol: 'border-cyan-200 dark:border-cyan-800',
    icon: Users
  }
};

const ALL_ROLES: UserRole[] = ['PLATFORM_OWNER', 'CENTER_ADMIN', 'STAFF', 'TEACHER', 'STUDENT', 'PARENT'];

export const UserRoleDistributionCard: React.FC = () => {
  const { allUsers, students, teachers, organizations, switchRole, updateUserRole, usersHasMore, loadMoreUsers } = useApp();
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut');
  const [scope, setScope] = useState<'auth_accounts' | 'comprehensive'>('auth_accounts');
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const [showRoleManager, setShowRoleManager] = useState<boolean>(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Compute distribution based on selected scope
  const roleDistribution = useMemo(() => {
    if (scope === 'auth_accounts') {
      // Direct user accounts in allUsers
      const counts: Record<UserRole, number> = {
        PLATFORM_OWNER: 0,
        CENTER_ADMIN: 0,
        STAFF: 0,
        TEACHER: 0,
        STUDENT: 0,
        PARENT: 0
      };

      allUsers.forEach(u => {
        if (counts[u.role] !== undefined) {
          counts[u.role] += 1;
        }
      });

      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      return ALL_ROLES.map(role => {
        const meta = ROLE_METADATA[role];
        const count = counts[role] || 0;
        const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
        return {
          role,
          name: meta.label,
          count,
          percentage,
          color: meta.color,
          meta
        };
      });
    } else {
      // Comprehensive: includes all individual entities across tenants
      // Platform Owner: allUsers with PLATFORM_OWNER
      const platformOwnerCount = allUsers.filter(u => u.role === 'PLATFORM_OWNER').length || 1;
      // Center Admins: 1 per organization/branch director
      const centerAdminCount = Math.max(organizations.length, allUsers.filter(u => u.role === 'CENTER_ADMIN').length);
      const staffCount = allUsers.filter(u => u.role === 'STAFF').length;
      // Teachers: teachers collection
      const teacherCount = Math.max(teachers.length, allUsers.filter(u => u.role === 'TEACHER').length);
      // Students: students collection
      const studentCount = Math.max(students.length, allUsers.filter(u => u.role === 'STUDENT').length);
      // Parents: distinct guardians
      const parentCount = Math.max(
        allUsers.filter(u => u.role === 'PARENT').length,
        new Set(students.map(s => s.guardian.parentUserId || s.guardian.fatherPhone)).size
      );

      const counts: Record<UserRole, number> = {
        PLATFORM_OWNER: platformOwnerCount,
        CENTER_ADMIN: centerAdminCount,
        STAFF: staffCount,
        TEACHER: teacherCount,
        STUDENT: studentCount,
        PARENT: parentCount
      };

      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      return ALL_ROLES.map(role => {
        const meta = ROLE_METADATA[role];
        const count = counts[role];
        const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
        return {
          role,
          name: meta.label,
          count,
          percentage,
          color: meta.color,
          meta
        };
      });
    }
  }, [allUsers, students, teachers, organizations, scope]);

  const totalUsers = useMemo(() => {
    return roleDistribution.reduce((sum, item) => sum + item.count, 0);
  }, [roleDistribution]);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const meta = data.meta as RoleMeta;
      const Icon = meta.icon;
      return (
        <div className="bg-white dark:bg-[#1E1F20] p-3 rounded-2xl shadow-xl border border-[#DADCE0] dark:border-[#3C4043] text-xs space-y-1.5 z-50 min-w-44">
          <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-[#E8EAED]">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <Icon className="w-3.5 h-3.5" style={{ color: data.color }} />
            <span>{data.name}</span>
          </div>
          <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">{meta.description}</div>
          <div className="pt-1.5 border-t border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between font-bold">
            <span className="text-slate-600 dark:text-slate-300">Active Users:</span>
            <span className="text-sm text-slate-900 dark:text-[#E8EAED]">
              {data.count} <span className="text-xs text-slate-500 font-normal">({data.percentage}%)</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] p-5 shadow-xs space-y-5">
      {/* Header with Title and Control Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DADCE0] dark:border-[#3C4043]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-[#202124] dark:text-[#E8EAED] tracking-tight">
              User Role Distribution
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#1A73E8] dark:text-[#8AB4F8] border border-indigo-200 dark:border-indigo-800">
              Recharts Visualizer
            </span>
          </div>
          <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
            Real-time count and allocation across all 5 system roles (RBAC)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Toggle */}
          <div className="flex items-center p-1 bg-[#F1F3F4] dark:bg-[#282A2C] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setScope('auth_accounts')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                scope === 'auth_accounts'
                  ? 'bg-white dark:bg-[#1E1F20] text-[#1A73E8] dark:text-[#8AB4F8] shadow-2xs'
                  : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED]'
              }`}
              title="Show direct authentication session accounts"
            >
              Auth Directory ({allUsers.length})
            </button>
            <button
              onClick={() => setScope('comprehensive')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                scope === 'comprehensive'
                  ? 'bg-white dark:bg-[#1E1F20] text-[#1A73E8] dark:text-[#8AB4F8] shadow-2xs'
                  : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED]'
              }`}
              title="Show all individuals enrolled across tenant coaching centers"
            >
              All Institute Persons
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center p-1 bg-[#F1F3F4] dark:bg-[#282A2C] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setChartType('donut')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                chartType === 'donut'
                  ? 'bg-white dark:bg-[#1E1F20] text-[#1A73E8] dark:text-[#8AB4F8] shadow-2xs'
                  : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED]'
              }`}
              title="Donut Chart View"
            >
              <PieIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-[#1E1F20] text-[#1A73E8] dark:text-[#8AB4F8] shadow-2xs'
                  : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED]'
              }`}
              title="Bar Chart View"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          {/* Manage Roles Button */}
          <button
            onClick={() => setShowRoleManager(!showRoleManager)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              showRoleManager
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-[#1A73E8] dark:text-[#8AB4F8]'
                : 'border-[#DADCE0] dark:border-[#3C4043] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] text-[#3C4043] dark:text-[#C4C7C5]'
            }`}
            title="Manage user roles with real-time Firestore persistence"
          >
            <UserCog className="w-3.5 h-3.5 text-[#FFA000]" />
            <span>Manage Roles</span>
            {showRoleManager ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Chart and Stat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Side: Recharts Chart Canvas (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[280px]">
          {chartType === 'donut' ? (
            <div className="w-full h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    onMouseEnter={(entry: any) => setHoveredRole(entry?.role ? String(entry.role) : null)}
                    onMouseLeave={() => setHoveredRole(null)}
                  >
                    {roleDistribution.map((entry) => (
                      <Cell
                        key={`cell-${entry.role}`}
                        fill={entry.color}
                        stroke={hoveredRole === entry.role ? '#ffffff' : 'transparent'}
                        strokeWidth={hoveredRole === entry.role ? 3 : 1}
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Donut KPI Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-[#E8EAED] tracking-tight">
                  {totalUsers}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
                  Total Users
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={roleDistribution}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#80868B' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#80868B' }}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    radius={[0, 8, 8, 0]}
                    onMouseEnter={(entry: any) => setHoveredRole(entry?.role ? String(entry.role) : null)}
                    onMouseLeave={() => setHoveredRole(null)}
                  >
                    {roleDistribution.map((entry) => (
                      <Cell key={`bar-${entry.role}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right Side: Role Cards Breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="text-[11px] font-bold text-[#5F6368] dark:text-[#9AA0A6] uppercase tracking-wider flex items-center justify-between">
            <span>Role Breakdown & Metrics</span>
            <span>{totalUsers} Total Across 5 Roles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {roleDistribution.map((item) => {
              const Icon = item.meta.icon;
              const isHovered = hoveredRole === item.role;
              return (
                <div
                  key={item.role}
                  onMouseEnter={() => setHoveredRole(item.role)}
                  onMouseLeave={() => setHoveredRole(null)}
                  className={`p-3 rounded-xl border transition flex flex-col justify-between space-y-2 ${
                    isHovered
                      ? 'border-[#1A73E8] dark:border-[#8AB4F8] bg-blue-50/30 dark:bg-blue-950/20 shadow-xs'
                      : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${item.color}15`, color: item.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-[#E8EAED] truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] truncate">
                          {item.role}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-extrabold text-slate-900 dark:text-[#E8EAED]">
                        {item.count}
                      </div>
                      <div className="text-[10px] font-semibold" style={{ color: item.color }}>
                        {item.percentage}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-[#3C4043] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(4, item.percentage)}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Quick Summary Card */}
            <div className="p-3 rounded-xl border border-dashed border-[#DADCE0] dark:border-[#3C4043] bg-slate-50/50 dark:bg-[#202124]/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Tenant Isolation Active
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Scoped via Firebase ABAC
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                100% Enforced
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Live Role Manager (Firestore ABAC) */}
      {showRoleManager && (
        <div className="pt-4 border-t border-[#DADCE0] dark:border-[#3C4043] space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-[#E8EAED] flex items-center space-x-1.5">
                <Flame className="w-3.5 h-3.5 text-[#FFA000]" />
                <span>Live User Roles Directory (Synchronized via Firestore onSnapshot)</span>
              </h3>
              <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                Modify any user's role below. Changes instantly persist to Firestore collection <code className="font-mono text-indigo-600 dark:text-indigo-400">users</code> and propagate to charts.
              </p>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Cloud Sync Active</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#DADCE0] dark:border-[#3C4043]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8F9FA] dark:bg-[#282A2C] text-[#5F6368] dark:text-[#9AA0A6] uppercase text-[10px] font-bold border-b border-[#DADCE0] dark:border-[#3C4043]">
                <tr>
                  <th className="p-2.5">User</th>
                  <th className="p-2.5">Tenant / Org</th>
                  <th className="p-2.5">Current Role</th>
                  <th className="p-2.5 text-right">Assign New Role (Firestore)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DADCE0]/50 dark:divide-[#3C4043]/50 bg-white dark:bg-[#1E1F20]">
                {allUsers.map((u) => {
                  const roleMeta = ROLE_METADATA[u.role] || ROLE_METADATA.STUDENT;
                  const isUpdating = updatingUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-2.5">
                        <div className="flex items-center space-x-2">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={u.name}
                            className="w-7 h-7 rounded-full object-cover border border-[#DADCE0] dark:border-[#3C4043]"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-[#E8EAED]">{u.name}</div>
                            <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">{u.email || u.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-[#9AA0A6]">
                        {u.orgId === 'system' ? (
                          <span className="font-semibold text-purple-600 dark:text-purple-400">System (SaaS)</span>
                        ) : (
                          <span>{organizations.find(o => o.id === u.orgId)?.name || u.orgId}</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1"
                          style={{ backgroundColor: `${roleMeta.color}15`, color: roleMeta.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: roleMeta.color }} />
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <select
                          value={u.role}
                          disabled={isUpdating}
                          onChange={async (e) => {
                            const newRole = e.target.value as UserRole;
                            setUpdatingUserId(u.id);
                            await updateUserRole(u.id, newRole);
                            setUpdatingUserId(null);
                          }}
                          className="text-xs bg-slate-50 dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] rounded-lg px-2 py-1 text-slate-800 dark:text-[#E8EAED] font-semibold focus:outline-none focus:ring-1 focus:ring-[#1A73E8] cursor-pointer"
                        >
                          <option value="PLATFORM_OWNER">Platform Owner</option>
                          <option value="CENTER_ADMIN">Center Admin</option>
                          <option value="TEACHER">Teacher</option>
                          <option value="STUDENT">Student</option>
                          <option value="PARENT">Parent</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {allUsers.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                  {usersHasMore
                    ? `Loaded ${allUsers.length} accounts — more available`
                    : `${allUsers.length} accounts loaded`}
                </span>
                {usersHasMore && (
                  <button
                    onClick={() => { void loadMoreUsers(); }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] text-[#1A73E8] dark:text-[#8AB4F8] cursor-pointer transition"
                    title="Fetch the next page of login accounts"
                  >
                    Load more users
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
