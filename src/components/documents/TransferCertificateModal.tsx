import React, { useState } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleButton } from '../ui';
import { Student } from '../../types';
import { getIndiaDateString } from '../../lib/date';
import { MAX_TC_REMARKS } from '../../lib/issuedDocuments';
import { DocumentPrintStyles } from './DocumentPrintStyles';

interface TransferCertificateModalProps {
  student: Student | null;
  onClose: () => void;
}

/**
 * F9 — print-ready Transfer Certificate. The serial is previewed from the
 * accession register (`PREFIX/YEAR/NNN`, max issued + 1) and only committed to
 * `issuedDocuments` when the desk actually prints, so opening the modal doesn't
 * burn a number. Students/parents cannot reach this flow; the create is desk-only.
 */
export const TransferCertificateModal: React.FC<TransferCertificateModalProps> = ({
  student,
  onClose
}) => {
  const { currentOrg, batches, canIssueDocuments, issueTc, nextTcNo, showToast } = useApp();
  const [leavingDate, setLeavingDate] = useState(() => getIndiaDateString());
  const [remarks, setRemarks] = useState('');

  const tcNo = student ? nextTcNo() : '';
  const batch = student ? batches.find(b => student.batchIds.includes(b.id)) : undefined;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  if (!student) return null;

  const handlePrint = () => {
    if (!canIssueDocuments) {
      showToast('Only the front desk or an admin can issue a Transfer Certificate.', 'error');
      return;
    }
    const issued = issueTc(student, { leavingDate, remarks });
    if (!issued) {
      showToast('Please check the leaving date and remarks, then try again.', 'error');
      return;
    }
    showToast(`Transfer Certificate ${issued.tcNo} issued to ${student.name}.`, 'success');
    window.setTimeout(() => window.print(), 60);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/50 p-4 doc-no-print">
      <DocumentPrintStyles />
      <div className="my-4 w-full max-w-3xl rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--fb-accent)]" />
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Transfer Certificate · {student.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center text-[#86868B] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 bg-black/[0.02] dark:bg-black/20">
          {/* Controls (never printed) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs space-y-1 sm:col-span-1">
              <span className="font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Date of leaving</span>
              <input
                type="date"
                value={leavingDate}
                onChange={e => setLeavingDate(e.target.value)}
                className="w-full rounded-lg border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#282A2C] px-3 py-2 text-xs text-[#202124] dark:text-[#E8EAED]"
              />
            </label>
            <label className="text-xs space-y-1 sm:col-span-2">
              <span className="font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Remarks / conduct</span>
              <input
                type="text"
                value={remarks}
                maxLength={500}
                placeholder="Course completed. All dues cleared. Conduct: Excellent."
                onChange={e => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#282A2C] px-3 py-2 text-xs text-[#202124] dark:text-[#E8EAED]"
              />
            </label>
          </div>

          {/* --- printable certificate --- */}
          <div
            className="doc-print-area rounded-xl p-8 sm:p-10"
            style={{ background: '#ffffff', color: '#111111', border: '1px solid #DADCE0' }}
          >
            <div className="text-center">
              <div className="text-2xl font-extrabold tracking-wide">{currentOrg.name || 'Coaching Academy'}</div>
              <div className="text-[11px] mt-1" style={{ color: '#5F6368' }}>
                {currentOrg.address}
                {currentOrg.city ? `, ${currentOrg.city}` : ''} · {currentOrg.phone}
              </div>
              {currentOrg.gstin && (
                <div className="text-[9px]" style={{ color: '#9AA0A6' }}>GSTIN: {currentOrg.gstin}</div>
              )}
              <div className="mt-4 inline-block px-5 py-1.5 text-sm font-bold tracking-[0.25em] border-y-2" style={{ borderColor: '#111111' }}>
                TRANSFER CERTIFICATE
              </div>
              <div className="mt-2 text-[10px]" style={{ color: '#5F6368' }}>
                Serial No. <span className="font-mono font-bold" style={{ color: '#111111' }}>{tcNo}</span>
              </div>
            </div>

            <div className="mt-7 text-[13px] leading-7" style={{ color: '#1D1D1F' }}>
              <p>
                This is to certify that <b>{student.name}</b>, child of{' '}
                <b>{student.guardian?.fatherName || '—'}</b>, was a bonafide student of this
                institute in <b>{student.classGrade}</b>
                {batch ? <> ({batch.name})</> : null}.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-y-2.5 text-[12px]">
                <CertRow label="Enrollment No." value={student.enrollmentNo} mono />
                <CertRow label="Roll No." value={student.rollNo} mono />
                <CertRow label="Board" value={student.board} />
                <CertRow label="Date of Birth" value={student.dateOfBirth} />
                <CertRow label="Date of Admission" value={student.admissionDate} />
                <CertRow label="Date of Leaving" value={leavingDate} />
              </div>
              <p className="mt-5 text-[12px]">
                His/Her conduct and character during the period of study were found to be{' '}
                <b>satisfactory</b>. All dues of the institute have been settled.
              </p>
              {remarks && (
                <p className="mt-3 text-[12px]">
                  <span className="font-semibold">Remarks: </span>
                  {remarks}
                </p>
              )}
            </div>

            <div className="mt-10 flex items-end justify-between text-[11px]">
              <div>
                <div style={{ color: '#5F6368' }}>Date: {today}</div>
                <div className="mt-1" style={{ color: '#9AA0A6' }}>Place: {currentOrg.city || student.address || 'India'}</div>
              </div>
              <div className="text-center">
                <div style={{ width: '180px', borderTop: '1px solid #111111' }} />
                <div className="mt-1 font-semibold">Authorised Signatory</div>
                <div className="text-[9px]" style={{ color: '#5F6368' }}>{currentOrg.name}</div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-[8px]" style={{ color: '#9AA0A6' }}>
              <span>Issued by: {/* operator printed at issue time in the register */}front desk</span>
              <span>Certificate generated by VidyaOS</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#86868B] max-w-lg">
              {canIssueDocuments
                ? 'Printing assigns the serial above and records it permanently in the register.'
                : 'Only the front desk or an admin can issue a Transfer Certificate.'}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ConsoleButton variant="secondary" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={onClose}>
                Close
              </ConsoleButton>
              <ConsoleButton
                variant="primary"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={handlePrint}
                disabled={!canIssueDocuments}
              >
                Issue & Print
              </ConsoleButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CertRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-baseline gap-2 min-w-0">
    <span className="text-[10px] uppercase tracking-wide flex-shrink-0" style={{ color: '#9AA0A6' }}>{label}</span>
    <span className={`font-semibold truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
  </div>
);