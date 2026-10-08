import React from 'react';
import { Printer, X, IdCard } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleButton, VidyaWatermark } from '../ui';
import { Student } from '../../types';
import { barcodeBars } from '../../lib/issuedDocuments';
import { DocumentPrintStyles } from './DocumentPrintStyles';

interface StudentIdCardModalProps {
  student: Student | null;
  onClose: () => void;
}

/** Deterministic barcode-style strip built from the enrollment number. */
const Barcode: React.FC<{ value: string }> = ({ value }) => (
  <div className="flex items-end gap-[2px] h-8" aria-hidden="true">
    {barcodeBars(value).map((width, index) => (
      <span
        key={index}
        className="inline-block bg-black"
        style={{ width: `${width}px`, height: index % 6 === 0 ? '100%' : '80%' }}
      />
    ))}
  </div>
);

/**
 * F9 — print-ready student ID card. A fixed credit-card layout with the org
 * mark, a photo placeholder, the learner's class/enrollment/batch and an
 * enrollment barcode. Printing records the issue in the accession register
 * (desk only); a learner can open and print their own card but creates no
 * `issuedDocuments` row, exactly as the rules require.
 */
export const StudentIdCardModal: React.FC<StudentIdCardModalProps> = ({ student, onClose }) => {
  const { currentOrg, batches, canIssueDocuments, issueIdCard, showToast } = useApp();

  if (!student) return null;

  const batch = batches.find(b => student.batchIds.includes(b.id));
  const cardNo = `ID-${(student.enrollmentNo || student.id).replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase()}`;

  const handlePrint = () => {
    if (canIssueDocuments) {
      const issued = issueIdCard(student);
      if (issued) showToast(`ID card issued to ${student.name} · logged in the register.`, 'success');
    }
    // The print CSS hides everything except `.doc-print-area`.
    window.setTimeout(() => window.print(), 60);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <DocumentPrintStyles />
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <IdCard className="w-4 h-4 text-[var(--fb-accent)]" />
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Student ID Card
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

        <div className="p-5 sm:p-7 flex flex-col items-center gap-5 bg-black/[0.02] dark:bg-black/20">
          {/* --- printable card --- */}
          <div
            className="doc-print-area rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.18)]"
            style={{ position: 'relative', width: '420px', maxWidth: '100%', background: '#ffffff', color: '#111111', fontFamily: 'inherit' }}
          >
            <VidyaWatermark size={72} opacity={0.06} />
            <div className="relative z-10">
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg,#101828,#1A73E8)' }}
            >
              <div>
                <div className="text-white font-extrabold tracking-wider text-lg leading-none">
                  {currentOrg.logoText || 'VIDYAOS'}
                </div>
                <div className="text-white/80 text-[10px] mt-1 leading-tight">
                  {currentOrg.name || 'Coaching Academy'}
                </div>
              </div>
              <div className="text-right text-white/90 text-[9px] leading-tight">
                <div className="font-semibold uppercase tracking-widest">Student Identity</div>
                <div>{currentOrg.city || currentOrg.address || 'India'}</div>
              </div>
            </div>

            <div className="flex gap-4 px-5 py-4">
              {/* photo placeholder */}
              <div
                className="flex-shrink-0 rounded-lg flex items-center justify-center text-[9px] text-center leading-tight"
                style={{ width: '86px', height: '104px', border: '1.5px dashed #9AA0A6', color: '#9AA0A6', background: '#F5F6F8' }}
              >
                AFFIX<br />PHOTO
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[17px] font-extrabold leading-tight truncate">{student.name}</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#5F6368' }}>
                  {student.classGrade} · {student.board} · Roll {student.rollNo}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                  <Field label="Enrollment No" value={student.enrollmentNo} mono />
                  <Field label="Batch" value={batch?.name || student.batchIds[0] || '—'} />
                  <Field label="Date of Birth" value={student.dateOfBirth} />
                  <Field label="Blood Group" value={student.bloodGroup || '—'} />
                  <Field label="Guardian" value={student.guardian?.fatherName || '—'} />
                  <Field label="Contact" value={student.phone} mono />
                </div>
              </div>
            </div>

            <div className="px-5 pb-4 flex items-end justify-between">
              <Barcode value={student.enrollmentNo || student.id} />
              <div className="text-right text-[9px]" style={{ color: '#5F6368' }}>
                <div className="font-semibold" style={{ color: '#111111' }}>{cardNo}</div>
                <div>{currentOrg.phone}</div>
                <div className="mt-1">Valid through current session</div>
              </div>
            </div>

            <div className="px-5 py-1.5 text-[8px] text-center" style={{ background: '#F5F6F8', color: '#5F6368' }}>
              This card is the property of {currentOrg.name || 'the institute'} and must be produced on demand.
            </div>
            </div>
          </div>
          {/* --- /printable card --- */}

          {canIssueDocuments ? (
            <p className="text-[11px] text-[#86868B] text-center max-w-md">
              Printing records this card in the issued-document register.
            </p>
          ) : (
            <p className="text-[11px] text-[#86868B] text-center max-w-md">
              You can print your own card. Ask the front desk for a replacement or a correction.
            </p>
          )}

          <div className="flex items-center gap-2">
            <ConsoleButton
              variant="secondary"
              size="sm"
              icon={<X className="w-3.5 h-3.5" />}
              onClick={onClose}
            >
              Close
            </ConsoleButton>
            <ConsoleButton
              variant="primary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
            >
              {canIssueDocuments ? 'Issue & Print' : 'Print ID Card'}
            </ConsoleButton>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="min-w-0">
    <div className="text-[8px] uppercase tracking-wide" style={{ color: '#9AA0A6' }}>{label}</div>
    <div className={`truncate font-semibold ${mono ? 'font-mono' : ''}`}>{value}</div>
  </div>
);