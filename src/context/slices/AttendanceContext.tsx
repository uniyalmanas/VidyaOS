import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { AttendanceRecord, AttendanceStatus, Batch, Branch, Organization, User } from '../../types';
import { MOCK_ATTENDANCE } from '../../data/mockData';
import { subscribeAttendancePaginated, persistAttendanceToFirestore } from '../../lib/firestoreService';

export interface AttendanceContextType {
  attendanceRecords: AttendanceRecord[];
  attendanceHasMore: boolean;
  loadMoreAttendance: () => Promise<number>;
  markAttendance: (record: { batchId: string; studentId: string; date: string; status: AttendanceStatus; remarks?: string }) => void;
  markBatchAllPresent: (batchId: string, date: string) => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

interface AttendanceProviderProps {
  currentOrg: Organization;
  selectedBranchId: string;
  currentUser: User;
  batches: Batch[];
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

export const AttendanceProvider: React.FC<AttendanceProviderProps> = ({
  currentOrg,
  selectedBranchId,
  currentUser,
  batches,
  isPlatformOwner,
  children
}) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    // DEV-only mirror; production boots from Firestore (persistent cache) alone.
    const saved = import.meta.env.DEV ? localStorage.getItem('vidyaos_attendance') : null;
    return saved ? JSON.parse(saved) : (import.meta.env.DEV ? MOCK_ATTENDANCE : []);
  });

  // DEV-only mirror — attendance is PII and must not outlive a logout in prod.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('vidyaos_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  // G1 — paginated attendance stream. First page live; `loadMoreAttendance`
  // fetches the next cursor page so older marks stop silently dropping off.
  const [attendanceHasMore, setAttendanceHasMore] = useState(false);
  const attendanceHandleRef = useRef<ReturnType<typeof subscribeAttendancePaginated> | null>(null);

  // Real-time Firestore Subscriptions for Attendance
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;

    const handle = subscribeAttendancePaginated((data, meta) => {
      if (data) {
        setAttendanceRecords(data);
        setAttendanceHasMore(meta.hasMore);
      }
    }, targetOrg);
    attendanceHandleRef.current = handle;

    return () => {
      if (attendanceHandleRef.current) {
        attendanceHandleRef.current.unsubscribe();
        attendanceHandleRef.current = null;
      }
    };
  }, [currentOrg.id, isPlatformOwner]);

  /**
   * G1 — fetch the next page of attendance on demand. Returns how many records
   * were actually added (for the UI state).
   */
  const loadMoreAttendance = async (): Promise<number> => {
    if (!attendanceHandleRef.current) return 0;
    return attendanceHandleRef.current.loadMore();
  };

  // Multi-Tenant Isolation: Filtered data views
  const tenantAttendance = useMemo(() => {
    if (isPlatformOwner) return attendanceRecords;
    return attendanceRecords.filter(a => a.orgId === currentOrg.id);
  }, [attendanceRecords, currentOrg.id, isPlatformOwner]);

  const markAttendance = ({ batchId, studentId, date, status, remarks }: { batchId: string; studentId: string; date: string; status: AttendanceStatus; remarks?: string }) => {
    setAttendanceRecords(prev => {
      const existingIdx = prev.findIndex(a => a.batchId === batchId && a.studentId === studentId && a.date === date);
      const isAbsent = status === 'absent';

      const record: AttendanceRecord = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `att-${Date.now()}-${studentId}`,
        orgId: currentOrg.id,
        branchId: selectedBranchId !== 'all' ? selectedBranchId : (currentOrg.branches[0]?.id || 'branch-1'),
        batchId,
        studentId,
        date,
        status,
        remarks,
        markedByUserId: currentUser.id,
        markedAt: new Date().toISOString(),
        whatsappAlertSent: isAbsent
      };

      persistAttendanceToFirestore(record);

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = record;
        return updated;
      }
      return [record, ...prev];
    });
  };

  const markBatchAllPresent = (batchId: string, date: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    const newRecords: AttendanceRecord[] = batch.studentIds.map(studentId => {
      const rec: AttendanceRecord = {
        id: `att-${Date.now()}-${studentId}`,
        orgId: currentOrg.id,
        branchId: batch.branchId,
        batchId,
        studentId,
        date,
        status: 'present',
        markedByUserId: currentUser.id,
        markedAt: new Date().toISOString()
      };
      persistAttendanceToFirestore(rec);
      return rec;
    });

    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => !(r.batchId === batchId && r.date === date));
      return [...newRecords, ...filtered];
    });
  };

  return (
    <AttendanceContext.Provider
      value={{
        attendanceRecords: tenantAttendance,
        attendanceHasMore,
        loadMoreAttendance,
        markAttendance,
        markBatchAllPresent
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
