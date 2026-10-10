import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { IndianBoard } from '../../types';
import { PROGRAM_TRACKS } from '../../lib/programs';
import { resolveEntitlements, isUnlimited } from '../../lib/entitlements';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Users,
  Sparkles
} from 'lucide-react';
import { ConsoleButton, StatusChip } from '../ui';

interface ParsedStudentRow {
  name: string;
  classGrade: string;
  board: IndianBoard;
  schoolName: string;
  fatherName: string;
  fatherPhone: string;
  motherName?: string;
  gender: 'Male' | 'Female' | 'Other';
  isValid: boolean;
  errors: string[];
}

interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkStudentImportModal: React.FC<BulkStudentImportModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentOrg, batches, students, addStudent, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'Name,Class,Level,SchoolName,FatherName,FatherPhone,MotherName,Gender\n' +
      'Aarav Sharma,Class 11,Board level,DPS Dehradun,Rajesh Sharma,9876543210,Pooja Sharma,Male\n' +
      'Ananya Verma,Class 12,Board level,St Joseph Academy,Er. Manoj Verma,9897123456,Sunita Verma,Female\n' +
      'Rohan Mehta,Class 10,Coaching,Brightland School,Suresh Mehta,9837012345,Kavita Mehta,Male\n' +
      'Priya Rawat,Class 11,Coaching,Kendriya Vidyalaya,Vikram Rawat,9812345678,Anita Rawat,Female\n' +
      'Karan Singh,Class 9,Board level,Model Public School,Harish Singh,9856712340,Manju Singh,Male';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'vidyaos_students_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parser function for CSV text
  const parseCsvContent = (content: string) => {
    const lines = content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    // Determine delimiter (comma or tab)
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';

    // Check if first line is a header
    const hasHeader =
      firstLine.toLowerCase().includes('name') ||
      firstLine.toLowerCase().includes('class') ||
      firstLine.toLowerCase().includes('phone');

    const dataLines = hasHeader ? lines.slice(1) : lines;

    const rows: ParsedStudentRow[] = dataLines.map((line, idx) => {
      // Basic CSV token split handling quotes
      const cells = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());

      const name = cells[0] || '';
      const classGrade = cells[1] || 'Class 11';
      const rawBoard = (cells[2] || 'Board level').trim();
      // Resolve the program/track written in the CSV against the catalog:
      // exact id first, then a friendly keyword match, then sane fallbacks.
      let board: IndianBoard = 'Board level';
      const exact = PROGRAM_TRACKS.find(t => t.id.toLowerCase() === rawBoard.toLowerCase());
      if (exact) {
        board = exact.id;
      } else {
        const upper = rawBoard.toUpperCase();
        const keyword = PROGRAM_TRACKS.find(
          t => upper.includes(t.id.toUpperCase()) || t.label.toUpperCase().includes(upper)
        );
        if (keyword) board = keyword.id;
        else if (upper.includes('JEE')) board = 'JEE Main & Advanced';
        else if (upper.includes('NEET')) board = 'NEET UG';
        else if (upper.includes('BOTH') || upper.includes('INTEGRATED')) board = 'Board level & Coaching';
      }

      const schoolName = cells[3] || 'City High School';
      const fatherName = cells[4] || 'Guardian Name';
      const fatherPhone = (cells[5] || '').replace(/[^0-9]/g, '');
      const motherName = cells[6] || undefined;
      const rawGender = (cells[7] || 'Male').toLowerCase();
      const gender: 'Male' | 'Female' | 'Other' =
        rawGender.startsWith('f') ? 'Female' : 'Male';

      const errors: string[] = [];
      if (!name || name.length < 2) errors.push('Missing student name');
      if (!fatherPhone || fatherPhone.length < 10) errors.push('Invalid 10-digit mobile number');

      return {
        name,
        classGrade,
        board,
        schoolName,
        fatherName,
        fatherPhone,
        motherName,
        gender,
        isValid: errors.length === 0,
        errors
      };
    });

    setParsedRows(rows);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseCsvContent(text);
      }
    };
    reader.readAsText(file);
  };

  // Handle Raw Text Paste
  const handleTextPasteChange = (text: string) => {
    setPastedText(text);
    parseCsvContent(text);
  };

  // Execute Bulk Import
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    // Free-tier cap gate before any row is written: import only what fits and
    // tell the owner how many were skipped and why.
    const ent = resolveEntitlements(currentOrg);
    const curCount = students.filter(s => s.orgId === currentOrg.id).length;
    const unlimited = isUnlimited(ent.maxStudents);
    const remainingSlots = unlimited ? validRows.length : Math.max(0, ent.maxStudents - curCount);
    const rowsToImport = validRows.slice(0, unlimited ? validRows.length : remainingSlots);
    const skipped = validRows.length - rowsToImport.length;

    if (rowsToImport.length === 0) {
      showToast(
        `Student limit reached (${ent.maxStudents}). Add the Growth or Cloud Pro SKU to import more students.`,
        'error'
      );
      return;
    }

    setIsProcessing(true);

    try {
      let importedCount = 0;
      const branchId = currentOrg.branches?.[0]?.id || 'branch-1';

      rowsToImport.forEach((row, i) => {
        const rollNumber = String(100 + i + 1);
        addStudent({
          branchId,
          rollNo: rollNumber,
          name: row.name,
          gender: row.gender,
          classGrade: row.classGrade,
          board: row.board,
          schoolName: row.schoolName,
          dateOfBirth: '',
          admissionDate: new Date().toISOString().split('T')[0],
          phone: row.fatherPhone,
          address: currentOrg.city ? `${currentOrg.city}, India` : '',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}`,
          batchIds: selectedBatchId ? [selectedBatchId] : [],
          guardian: {
            fatherName: row.fatherName,
            fatherPhone: row.fatherPhone,
            motherName: row.motherName,
            // No login is created during bulk import (the CSV carries no password),
            // so there is no parent account to link to yet.
            parentUserId: ''
          },
          status: 'active'
        });
        importedCount++;
      });

      showToast(
        skipped > 0
          ? `Admitted ${importedCount} students — ${skipped} skipped (student cap of ${ent.maxStudents} reached). Add the Growth or Cloud Pro SKU to admit more.`
          : `Admitted ${importedCount} students to ${currentOrg.name}!`,
        skipped > 0 ? 'warning' : 'success'
      );
      setIsProcessing(false);
      onClose();
    } catch (err) {
      console.error('Error importing students:', err);
      showToast('Encountered an error while importing some students.', 'warning');
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1E1F20] w-full max-w-3xl rounded-3xl shadow-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between bg-white dark:bg-[#1E1F20]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#188038]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
                Bulk Student Admissions (CSV / Excel)
              </h3>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                Admit multiple students at once to {currentOrg.name} with parent phone numbers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Top Options Strip: Batch Selector & Download Sample */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#282A2C] p-3.5 rounded-2xl border border-[#DADCE0]/70 dark:border-[#3C4043]">
            <div className="flex items-center space-x-2">
              <label className="text-[#5F6368] dark:text-[#9AA0A6] font-semibold shrink-0">
                Enroll Into Batch:
              </label>
              <select
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] rounded-lg px-2.5 py-1 font-medium focus:outline-none"
              >
                <option value="">No Batch (Unassigned)</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.classGrade})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#1A73E8] dark:text-[#8AB4F8] hover:underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV Template</span>
            </button>
          </div>

          {/* Tab Selector: Upload vs Paste */}
          <div className="flex border-b border-[#DADCE0] dark:border-[#3C4043]">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-2 px-4 font-semibold transition border-b-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-[#FFA000] text-[#E65100] dark:text-[#FFCA28]'
                  : 'border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124]'
              }`}
            >
              Upload CSV / Excel File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`pb-2 px-4 font-semibold transition border-b-2 cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-[#FFA000] text-[#E65100] dark:text-[#FFCA28]'
                  : 'border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124]'
              }`}
            >
              Paste Spreadsheet Data
            </button>
          </div>

          {/* Mode 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="border-2 border-dashed border-[#DADCE0] dark:border-[#3C4043] rounded-2xl p-6 text-center hover:border-[#FFA000] transition bg-white dark:bg-[#1E1F20]">
              <input
                type="file"
                id="csv-file-input"
                accept=".csv, .txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer block space-y-2">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-[#FFA000] flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-semibold text-sm text-[#202124] dark:text-[#E8EAED]">
                  {fileName ? `Selected: ${fileName}` : 'Choose CSV file or drag & drop here'}
                </div>
                <p className="text-[#5F6368] dark:text-[#9AA0A6] text-[11px]">
                  Supports standard CSV exports from Excel, Google Sheets, or school registers
                </p>
              </label>
            </div>
          )}

          {/* Mode 2: Paste Raw Data */}
          {activeTab === 'paste' && (
            <div className="space-y-1.5">
              <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium">
                Paste lines directly from Excel or Google Sheets (columns: Name, Class, Level, School, Father, Phone, Mother, Gender):
              </label>
              <textarea
                value={pastedText}
                onChange={e => handleTextPasteChange(e.target.value)}
                rows={5}
                placeholder="Aarav Sharma, Class 11, Board level, DPS Dehradun, Rajesh Sharma, 9876543210, Pooja Sharma, Male"
                className="w-full border border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-3 bg-white dark:bg-[#282A2C] font-mono text-[11px] text-[#202124] dark:text-[#E8EAED] focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
              />
            </div>
          )}

          {/* Parse Results Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#202124] dark:text-[#E8EAED]">
                    Import Preview:
                  </span>
                  <StatusChip label={`${validCount} Ready`} variant="success" size="xs" />
                  {invalidCount > 0 && (
                    <StatusChip label={`${invalidCount} Invalid`} variant="warning" size="xs" />
                  )}
                </div>
                <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                  Total rows parsed: {parsedRows.length}
                </span>
              </div>

              <div className="border border-[#DADCE0] dark:border-[#3C4043] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#F8F9FA] dark:bg-[#282A2C] text-[#5F6368] dark:text-[#9AA0A6] border-b border-[#DADCE0] dark:border-[#3C4043] sticky top-0">
                    <tr>
                      <th className="p-2.5 font-semibold">Student Name</th>
                      <th className="p-2.5 font-semibold">Class & Board</th>
                      <th className="p-2.5 font-semibold">Parent / Phone</th>
                      <th className="p-2.5 font-semibold">School</th>
                      <th className="p-2.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DADCE0]/60 dark:divide-[#3C4043]">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? 'hover:bg-slate-50 dark:hover:bg-[#282A2C]/60' : 'bg-red-50/40 dark:bg-red-950/20'}
                      >
                        <td className="p-2.5 font-bold text-[#202124] dark:text-[#E8EAED]">
                          {row.name || <span className="text-red-500 font-normal">Missing Name</span>}
                        </td>
                        <td className="p-2.5 text-[#5F6368] dark:text-[#9AA0A6]">
                          {row.classGrade} · <span className="font-semibold">{row.board}</span>
                        </td>
                        <td className="p-2.5">
                          <div className="text-[#202124] dark:text-[#E8EAED]">{row.fatherName}</div>
                          <div className="font-mono text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                            {row.fatherPhone || <span className="text-red-500">No Mobile</span>}
                          </div>
                        </td>
                        <td className="p-2.5 text-[#5F6368] dark:text-[#9AA0A6] truncate max-w-[120px]">
                          {row.schoolName}
                        </td>
                        <td className="p-2.5 text-right">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[#188038] font-semibold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-[10px]" title={row.errors.join(', ')}>
                              <AlertCircle className="w-3.5 h-3.5" /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#282A2C] border-t border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between">
          <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
            {validCount > 0 ? (
              <span>Will admit <strong>{validCount}</strong> students to <strong>{currentOrg.name}</strong></span>
            ) : (
              <span>Upload or paste student records to proceed</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <ConsoleButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </ConsoleButton>

            <ConsoleButton
              variant="primary"
              size="sm"
              icon={<Users className="w-3.5 h-3.5" />}
              onClick={handleExecuteImport}
              disabled={validCount === 0 || isProcessing}
            >
              {isProcessing ? 'Admitting Students...' : `Import ${validCount} Students`}
            </ConsoleButton>
          </div>
        </div>
      </div>
    </div>
  );
};
