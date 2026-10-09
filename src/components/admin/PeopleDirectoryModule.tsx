import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Users,
  GraduationCap,
  HeartHandshake,
  X,
  Download,
  Eye,
  Pencil,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Droplets,
  BookOpen,
  IndianRupee,
  Briefcase,
  Link2,
  BadgeCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { FeeInvoice, Student, Teacher, User } from '../../types';
import { ConsoleButton, DataTable, StatusChip, type Column } from '../ui';

type RoleKey = 'STUDENT' | 'TEACHER' | 'PARENT';
type RoleFilter = 'ALL' | RoleKey;

interface ParentView {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  occupation?: string;
  motherName?: string;
  motherPhone?: string;
  address?: string;
  children: Student[];
}

interface DirectoryRow {
  key: string;
  role: RoleKey;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  student?: Student;
  teacher?: Teacher;
  parent?: ParentView;
}

interface PeopleDirectoryModuleProps {
  /** Reuse the existing profile editor (AdminDashboard owns the modal). */
  onEditPerson?: (user: User) => void;
}

const initialsAvatar = (name: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'Person')}`;

const formatRupees = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const ROLE_META: Record<RoleKey, { label: string; variant: 'info' | 'success' | 'warning' }> = {
  STUDENT: { label: 'Student', variant: 'info' },
  TEACHER: { label: 'Faculty', variant: 'success' },
  PARENT: { label: 'Parent', variant: 'warning' }
};

const feeSummary = (studentId: string, invoices: FeeInvoice[]) => {
  const list = invoices.filter(i => i.studentId === studentId);
  const total = list.reduce((sum, i) => sum + (i.netAmount || 0), 0);
  const paid = list.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  return { total, paid, due: Math.max(total - paid, 0), count: list.length };
};

const Field: React.FC<{ label: string; value?: React.ReactNode; icon?: React.ReactNode }> = ({
  label,
  value,
  icon
}) => (
  <div className="flex items-start gap-2 py-1.5 min-w-0">
    {icon && <span className="mt-0.5 text-[#86868B] flex-shrink-0">{icon}</span>}
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-[#86868B] font-semibold">{label}</div>
      <div className="text-xs text-[#1D1D1F] dark:text-[#F5F5F7] font-medium break-words">
        {value === undefined || value === null || value === '' ? '—' : value}
      </div>
    </div>
  </div>
);

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children
}) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] border-b border-black/[0.06] dark:border-white/[0.08] pb-1.5">
      {icon}
      <span>{title}</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">{children}</div>
  </div>
);

export const PeopleDirectoryModule: React.FC<PeopleDirectoryModuleProps> = ({ onEditPerson }) => {
  const { currentOrg, students, teachers, batches, invoices, attendanceRecords, allUsers } = useApp();

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<DirectoryRow | null>(null);

  // Parents live on the student guardian record; merge richer PARENT auth accounts when present.
  const parentViews = useMemo<ParentView[]>(() => {
    const userById = new Map(allUsers.filter(u => u.role === 'PARENT').map(u => [u.id, u]));
    const map = new Map<string, ParentView>();

    students.forEach(s => {
      const g = s.guardian;
      if (!g || (!g.fatherName && !g.fatherPhone)) return;
      const key = g.parentUserId ? `uid:${g.parentUserId}` : `phone:${g.fatherPhone || g.fatherName}`;
      let pv = map.get(key);
      if (!pv) {
        const u = g.parentUserId ? userById.get(g.parentUserId) : undefined;
        pv = {
          id: key,
          userId: g.parentUserId || undefined,
          name: g.fatherName || u?.name || 'Guardian',
          phone: g.fatherPhone || u?.phone || '',
          email: u?.email,
          occupation: g.fatherOccupation || u?.occupation,
          motherName: g.motherName,
          motherPhone: g.motherPhone,
          address: u?.address || s.address,
          children: []
        };
        map.set(key, pv);
      }
      pv.children.push(s);
      if (!pv.motherName && g.motherName) pv.motherName = g.motherName;
      if (!pv.motherPhone && g.motherPhone) pv.motherPhone = g.motherPhone;
      if (!pv.address && s.address) pv.address = s.address;
    });

    return [...map.values()];
  }, [students, allUsers]);

  const rows = useMemo<DirectoryRow[]>(() => {
    const list: DirectoryRow[] = [];
    students.forEach(s =>
      list.push({
        key: `s-${s.id}`,
        role: 'STUDENT',
        name: s.name,
        phone: s.phone,
        email: s.email || '',
        avatar: s.avatar || initialsAvatar(s.name),
        student: s
      })
    );
    teachers.forEach(t =>
      list.push({
        key: `t-${t.id}`,
        role: 'TEACHER',
        name: t.name,
        phone: t.phone,
        email: t.email,
        avatar: t.avatar || initialsAvatar(t.name),
        teacher: t
      })
    );
    parentViews.forEach(p =>
      list.push({
        key: `p-${p.id}`,
        role: 'PARENT',
        name: p.name,
        phone: p.phone,
        email: p.email || '',
        avatar: initialsAvatar(p.name),
        parent: p
      })
    );
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, teachers, parentViews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      if (roleFilter !== 'ALL' && r.role !== roleFilter) return false;
      if (!q) return true;

      const hay: string[] = [r.name, r.phone, r.email, ROLE_META[r.role].label];
      if (r.student) {
        const s = r.student;
        hay.push(s.classGrade, s.board, s.rollNo, s.enrollmentNo, s.schoolName, s.guardian?.fatherName || '');
        batches.filter(b => s.batchIds?.includes(b.id)).forEach(b => hay.push(b.name, b.subject));
      } else if (r.teacher) {
        const t = r.teacher;
        hay.push(t.qualification, ...(t.subjects || []));
      } else if (r.parent) {
        const p = r.parent;
        hay.push(p.occupation || '', ...p.children.map(c => `${c.name} ${c.classGrade}`));
      }
      return hay.some(h => (h || '').toLowerCase().includes(q));
    });
  }, [rows, roleFilter, query, batches]);

  const batchNames = (ids: string[] = []) =>
    ids
      .map(id => batches.find(b => b.id === id)?.name)
      .filter(Boolean)
      .join(', ') || '—';

  const attendance = (studentId: string) => {
    const recs = attendanceRecords.filter(a => a.studentId === studentId);
    const present = recs.filter(a => a.status === 'present').length;
    return { rate: recs.length ? Math.round((present / recs.length) * 100) : null, total: recs.length };
  };

  const toUser = (r: DirectoryRow): User => {
    if (r.student) {
      const s = r.student;
      return {
        id: s.userId || s.id,
        orgId: s.orgId,
        role: 'STUDENT',
        name: s.name,
        phone: s.phone,
        email: s.email || '',
        avatar: s.avatar,
        branchId: s.branchId,
        classGrade: s.classGrade,
        rollNo: s.rollNo,
        schoolName: s.schoolName,
        address: s.address,
        bloodGroup: s.bloodGroup,
        dateOfBirth: s.dateOfBirth,
        emergencyContact: s.guardian?.fatherPhone
      };
    }
    if (r.teacher) {
      const t = r.teacher;
      return {
        id: t.userId || t.id,
        orgId: t.orgId,
        role: 'TEACHER',
        name: t.name,
        phone: t.phone,
        email: t.email,
        avatar: t.avatar,
        branchId: t.branchId,
        qualification: t.qualification,
        subjects: t.subjects
      };
    }
    const p = r.parent!;
    return {
      id: p.userId || '',
      orgId: currentOrg.id,
      role: 'PARENT',
      name: p.name,
      phone: p.phone,
      email: p.email || '',
      avatar: initialsAvatar(p.name),
      occupation: p.occupation,
      address: p.address,
      emergencyContact: p.motherPhone || p.phone
    };
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    const headers = [
      'Role',
      'Name',
      'Phone',
      'Email',
      'Class / Subjects',
      'Batch / Children',
      'Enrollment / Roll / UID',
      'Status / Fee',
      'Address'
    ];
    const data = filtered.map(r => {
      if (r.student) {
        const s = r.student;
        const fee = feeSummary(s.id, invoices);
        return [
          'Student',
          s.name,
          s.phone,
          s.email || '',
          `${s.classGrade} · ${s.board}`,
          batchNames(s.batchIds),
          `${s.enrollmentNo} / ${s.rollNo} / ${s.userId || s.id}`,
          fee.due > 0 ? `Due ${formatRupees(fee.due)}` : 'Paid',
          s.address
        ];
      }
      if (r.teacher) {
        const t = r.teacher;
        return [
          'Faculty',
          t.name,
          t.phone,
          t.email,
          `${t.qualification} · ${(t.subjects || []).join(', ')}`,
          batchNames(t.assignedBatchIds),
          t.userId || t.id,
          t.status,
          ''
        ];
      }
      const p = r.parent!;
      const due = p.children.reduce((sum, c) => sum + feeSummary(c.id, invoices).due, 0);
      return [
        'Parent',
        p.name,
        p.phone,
        p.email || '',
        p.occupation || '',
        p.children.map(c => `${c.name} (${c.classGrade})`).join('; '),
        p.userId || p.id,
        due > 0 ? `Due ${formatRupees(due)}` : 'Paid',
        p.address || ''
      ];
    });
    const csv = [headers, ...data]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `people-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statCards: { key: RoleFilter; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'ALL', label: 'All People', count: rows.length, icon: <Users className="w-4 h-4" /> },
    { key: 'STUDENT', label: 'Students', count: students.length, icon: <GraduationCap className="w-4 h-4" /> },
    { key: 'TEACHER', label: 'Faculty', count: teachers.length, icon: <BadgeCheck className="w-4 h-4" /> },
    { key: 'PARENT', label: 'Parents', count: parentViews.length, icon: <HeartHandshake className="w-4 h-4" /> }
  ];

  const columns: Column<DirectoryRow>[] = [
    {
      key: 'name',
      header: 'Person',
      sortable: true,
      render: r => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <img
            src={r.avatar}
            alt={r.name}
            className="w-9 h-9 rounded-full object-cover border border-[#DADCE0] dark:border-[#3C4043]"
          />
          <div className="min-w-0">
            <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-sm truncate">{r.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusChip label={ROLE_META[r.role].label} variant={ROLE_META[r.role].variant} />
              <span className="font-mono text-[9px] text-[#1A73E8] dark:text-[#8AB4F8] bg-[#E8F0FE] dark:bg-[#1E3A5F] px-1 py-0.5 rounded border border-[#1A73E8]/20 dark:border-[#8AB4F8]/20 truncate max-w-[120px]">
                {r.student?.userId || r.teacher?.userId || r.parent?.userId || r.student?.id || r.teacher?.id || r.parent?.id}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      header: 'Contact',
      render: r => (
        <div className="text-xs">
          <div className="font-mono text-[#1D1D1F] dark:text-[#E8EAED]">{r.phone || '—'}</div>
          <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] truncate max-w-[180px]">
            {r.email || '—'}
          </div>
        </div>
      )
    },
    {
      key: 'primary',
      header: 'Class / Subjects / Children',
      render: r => {
        if (r.student) {
          const s = r.student;
          return (
            <div>
              <div className="font-semibold text-[#1D1D1F] dark:text-[#E8EAED]">
                {s.classGrade} · {s.board}
              </div>
              <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">{s.schoolName}</div>
            </div>
          );
        }
        if (r.teacher) {
          const t = r.teacher;
          return (
            <div>
              <div className="font-semibold text-[#1D1D1F] dark:text-[#E8EAED]">
                {(t.subjects || []).join(', ') || '—'}
              </div>
              <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">{t.qualification}</div>
            </div>
          );
        }
        const p = r.parent!;
        return (
          <div>
            <div className="font-semibold text-[#1D1D1F] dark:text-[#E8EAED] truncate max-w-[220px]">
              {p.children.map(c => c.name).join(', ') || '—'}
            </div>
            <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
              {p.children.length} child(ren) · {p.occupation || 'Occupation n/a'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'secondary',
      header: 'Batches / Detail',
      render: r => {
        if (r.student) {
          return (
            <div className="flex flex-wrap gap-1 max-w-[220px]">
              {r.student.batchIds?.length ? (
                r.student.batchIds.map(bid => {
                  const b = batches.find(x => x.id === bid);
                  return (
                    <span
                      key={bid}
                      className="text-[10px] bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8] px-2 py-0.5 rounded font-medium"
                    >
                      {b?.name.split('-')[0] || 'Batch'}
                    </span>
                  );
                })
              ) : (
                <span className="text-[#86868B] text-xs">No batch</span>
              )}
            </div>
          );
        }
        if (r.teacher) {
          return (
            <div className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              {r.teacher.assignedBatchIds?.length || 0} batch(es) assigned
            </div>
          );
        }
        const p = r.parent!;
        return (
          <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] max-w-[220px]">
            {p.children.map(c => `${c.name} (${c.classGrade})`).join(' · ') || '—'}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: r => {
        if (r.student) {
          const fee = feeSummary(r.student.id, invoices);
          const att = attendance(r.student.id);
          return (
            <div className="flex flex-col items-start gap-1">
              <StatusChip
                label={fee.due > 0 ? `Due ${formatRupees(fee.due)}` : 'Fees Paid'}
                variant={fee.due > 0 ? 'warning' : 'success'}
              />
              {att.rate !== null && (
                <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                  Attendance {att.rate}%
                </span>
              )}
            </div>
          );
        }
        if (r.teacher) {
          return (
            <StatusChip
              label={r.teacher.status === 'active' ? 'Active' : 'On Leave'}
              variant={r.teacher.status === 'active' ? 'success' : 'warning'}
            />
          );
        }
        const p = r.parent!;
        const due = p.children.reduce((sum, c) => sum + feeSummary(c.id, invoices).due, 0);
        return (
          <StatusChip
            label={due > 0 ? `Due ${formatRupees(due)}` : 'Fees Paid'}
            variant={due > 0 ? 'warning' : 'success'}
          />
        );
      }
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-1.5">
          <ConsoleButton
            variant="secondary"
            size="xs"
            icon={<Eye className="w-3 h-3 text-[#1A73E8]" />}
            onClick={e => {
              e.stopPropagation();
              setDetail(r);
            }}
            title="View full profile"
          >
            View
          </ConsoleButton>
          {onEditPerson && (
            <ConsoleButton
              variant="secondary"
              size="xs"
              icon={<Pencil className="w-3 h-3 text-[#188038]" />}
              onClick={e => {
                e.stopPropagation();
                onEditPerson(toUser(r));
              }}
              title="Edit profile"
            >
              Edit
            </ConsoleButton>
          )}
        </div>
      )
    }
  ];

  const detailBatchNames = (ids?: string[]) => batchNames(ids || []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(card => {
          const active = roleFilter === card.key;
          return (
            <button
              key={card.key}
              onClick={() => setRoleFilter(card.key)}
              className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                active
                  ? 'border-[#FFA000]/50 bg-[#FFA000]/10 ring-2 ring-[#FFA000]/30'
                  : 'border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#1C1C1E]/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[#5F6368] dark:text-[#9AA0A6]">{card.icon}</span>
                <span className="text-2xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                  {card.count}
                </span>
              </div>
              <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-1">
                {card.label}
              </div>
            </button>
          );
        })}
      </div>

      <DataTable
        key={roleFilter}
        columns={columns}
        data={filtered}
        keyExtractor={r => r.key}
        searchPlaceholder="Search by name, phone, email, class, subject, batch…"
        onSearchChange={setQuery}
        pageSize={12}
        onRowClick={r => setDetail(r)}
        toolbarActions={
          <ConsoleButton
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
          >
            Export CSV
          </ConsoleButton>
        }
        emptyState={{
          title: 'No people found',
          description: 'Try a different search term or filter, or add students, faculty, and parents to see them here.'
        }}
      />

      {createPortal(
        <AnimatePresence>
          {detail && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetail(null)}
            >
              <motion.div
                className="w-full max-w-3xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={detail.avatar}
                      alt={detail.name}
                      className="w-12 h-12 rounded-full object-cover border border-[#DADCE0] dark:border-[#3C4043]"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-base text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        {detail.name}
                      </div>
                      <div className="mt-0.5">
                        <StatusChip
                          label={ROLE_META[detail.role].label}
                          variant={ROLE_META[detail.role].variant}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetail(null)}
                    className="p-2 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-[#5F6368] dark:text-[#9AA0A6] cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 sm:p-5 space-y-5">
                  {/* STUDENT */}
                  {detail.student && (
                    <>
                      <Section title="Identity & Academics" icon={<GraduationCap className="w-3.5 h-3.5" />}>
                        <Field label="Enrollment No" value={detail.student.enrollmentNo} />
                        <Field label="Roll No" value={detail.student.rollNo} />
                        <Field label="Class" value={detail.student.classGrade} />
                        <Field label="Board" value={detail.student.board} />
                        <Field label="School" value={detail.student.schoolName} />
                        <Field label="Gender" value={detail.student.gender} />
                        <Field label="Date of Birth" value={detail.student.dateOfBirth} />
                        <Field label="Admission Date" value={detail.student.admissionDate} />
                        <Field label="Blood Group" value={detail.student.bloodGroup} icon={<Droplets className="w-3.5 h-3.5" />} />
                        <Field label="Status" value={detail.student.status} />
                      </Section>

                      <Section title="Contact" icon={<Phone className="w-3.5 h-3.5" />}>
                        <Field label="Phone" value={detail.student.phone} icon={<Phone className="w-3.5 h-3.5" />} />
                        <Field label="Email" value={detail.student.email} icon={<Mail className="w-3.5 h-3.5" />} />
                        <Field label="Address" value={detail.student.address} icon={<MapPin className="w-3.5 h-3.5" />} />
                        <Field label="User ID" value={detail.student.userId || detail.student.id} />
                      </Section>

                      <Section title="Guardian" icon={<HeartHandshake className="w-3.5 h-3.5" />}>
                        <Field label="Father" value={detail.student.guardian?.fatherName} />
                        <Field label="Father Phone" value={detail.student.guardian?.fatherPhone} />
                        <Field label="Father Occupation" value={detail.student.guardian?.fatherOccupation} />
                        <Field label="Mother" value={detail.student.guardian?.motherName} />
                        <Field label="Mother Phone" value={detail.student.guardian?.motherPhone} />
                        <Field label="Parent Account" value={detail.student.guardian?.parentUserId || 'Not linked'} />
                      </Section>

                      <Section title="Batches & Performance" icon={<BookOpen className="w-3.5 h-3.5" />}>
                        <Field label="Batches" value={detailBatchNames(detail.student.batchIds)} />
                        <Field
                          label="Attendance"
                          value={(() => {
                            const a = attendance(detail.student!.id);
                            return a.rate === null ? 'No records' : `${a.rate}% (${a.total} sessions)`;
                          })()}
                        />
                        <Field
                          label="Fees Billed"
                          value={formatRupees(feeSummary(detail.student.id, invoices).total)}
                          icon={<IndianRupee className="w-3.5 h-3.5" />}
                        />
                        <Field
                          label="Fees Paid / Due"
                          value={`${formatRupees(feeSummary(detail.student.id, invoices).paid)} / ${formatRupees(
                            feeSummary(detail.student.id, invoices).due
                          )}`}
                        />
                      </Section>
                    </>
                  )}

                  {/* TEACHER */}
                  {detail.teacher && (
                    <>
                      <Section title="Identity & Role" icon={<BadgeCheck className="w-3.5 h-3.5" />}>
                        <Field label="Qualification" value={detail.teacher.qualification} />
                        <Field label="Subjects" value={(detail.teacher.subjects || []).join(', ')} icon={<BookOpen className="w-3.5 h-3.5" />} />
                        <Field label="Joining Date" value={detail.teacher.joiningDate} icon={<CalendarDays className="w-3.5 h-3.5" />} />
                        <Field label="Status" value={detail.teacher.status} />
                        <Field label="User ID" value={detail.teacher.userId || detail.teacher.id} />
                        {typeof detail.teacher.salary === 'number' && (
                          <Field label="Monthly Salary" value={formatRupees(detail.teacher.salary)} />
                        )}
                      </Section>

                      <Section title="Contact" icon={<Phone className="w-3.5 h-3.5" />}>
                        <Field label="Phone" value={detail.teacher.phone} icon={<Phone className="w-3.5 h-3.5" />} />
                        <Field label="Email" value={detail.teacher.email} icon={<Mail className="w-3.5 h-3.5" />} />
                      </Section>

                      <Section title="Teaching Load" icon={<BookOpen className="w-3.5 h-3.5" />}>
                        <Field label="Assigned Batches" value={detailBatchNames(detail.teacher.assignedBatchIds)} />
                        <Field label="Batch Count" value={`${detail.teacher.assignedBatchIds?.length || 0} batch(es)`} />
                      </Section>
                    </>
                  )}

                  {/* PARENT */}
                  {detail.parent && (
                    <>
                      <Section title="Identity & Contact" icon={<HeartHandshake className="w-3.5 h-3.5" />}>
                        <Field label="Phone" value={detail.parent.phone} icon={<Phone className="w-3.5 h-3.5" />} />
                        <Field label="Email" value={detail.parent.email} icon={<Mail className="w-3.5 h-3.5" />} />
                        <Field label="Occupation" value={detail.parent.occupation} icon={<Briefcase className="w-3.5 h-3.5" />} />
                        <Field label="Mother" value={detail.parent.motherName} />
                        <Field label="Mother Phone" value={detail.parent.motherPhone} />
                        <Field label="Address" value={detail.parent.address} icon={<MapPin className="w-3.5 h-3.5" />} />
                        <Field label="Parent Account" value={detail.parent.userId || 'No login'} icon={<Link2 className="w-3.5 h-3.5" />} />
                        <Field
                          label="Total Fees Due"
                          value={formatRupees(
                            detail.parent.children.reduce((sum, c) => sum + feeSummary(c.id, invoices).due, 0)
                          )}
                        />
                      </Section>

                      <Section title="Linked Children" icon={<Users className="w-3.5 h-3.5" />}>
                        {detail.parent.children.length === 0 ? (
                          <div className="text-xs text-[#86868B] py-1.5">No linked students</div>
                        ) : (
                          detail.parent.children.map(child => {
                            const fee = feeSummary(child.id, invoices);
                            return (
                              <div
                                key={child.id}
                                className="flex items-center justify-between gap-3 py-2 border-b border-black/[0.05] dark:border-white/[0.06] last:border-0"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                                    {child.name}
                                  </div>
                                  <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                                    {child.classGrade} · Roll {child.rollNo} · {detailBatchNames(child.batchIds)}
                                  </div>
                                </div>
                                <StatusChip
                                  label={fee.due > 0 ? `Due ${formatRupees(fee.due)}` : 'Paid'}
                                  variant={fee.due > 0 ? 'warning' : 'success'}
                                />
                              </div>
                            );
                          })
                        )}
                      </Section>
                    </>
                  )}

                  {/* Actions */}
                  {onEditPerson && (
                    <div className="flex justify-end gap-2 pt-1">
                      <ConsoleButton
                        variant="primary"
                        size="sm"
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => {
                          onEditPerson(toUser(detail));
                          setDetail(null);
                        }}
                      >
                        Edit Profile
                      </ConsoleButton>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
