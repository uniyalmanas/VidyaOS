import React from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, Download, Share2, X, CheckCircle } from 'lucide-react';

export const ReceiptModal: React.FC = () => {
  const { activeReceiptInvoice, setActiveReceiptInvoice, currentOrg, students, batches, setActiveWhatsappModal } = useApp();

  if (!activeReceiptInvoice) return null;

  const student = students.find(s => s.id === activeReceiptInvoice.studentId);
  const batch = batches.find(b => b.id === activeReceiptInvoice.batchId);
  const lastPayment = activeReceiptInvoice.payments[activeReceiptInvoice.payments.length - 1];

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!student) return;
    const phone = student.guardian.fatherPhone || student.phone;
    const text = `*FEE PAYMENT RECEIPT - ${currentOrg.name}*\n` +
      `Receipt No: ${lastPayment?.receiptNo || activeReceiptInvoice.invoiceNo}\n` +
      `Student: ${student.name} (${student.enrollmentNo})\n` +
      `Class/Batch: ${batch?.name || student.classGrade}\n` +
      `Month: ${activeReceiptInvoice.monthYear}\n` +
      `Amount Paid: ₹${(activeReceiptInvoice.paidAmount ?? 0).toLocaleString('en-IN')}\n` +
      `Status: ${activeReceiptInvoice.status.toUpperCase()}\n` +
      `Date: ${lastPayment?.paymentDate || activeReceiptInvoice.createdAt}\n\n` +
      `Thank you for trusting ${currentOrg.name}.`;

    setActiveWhatsappModal({
      title: `Send Receipt to ${student.name}'s Guardian`,
      phone,
      message: text
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        {/* Modal Actions Header */}
        <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center space-x-2 text-sm font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Digital Fee Receipt Verified</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition text-slate-200"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 transition text-white"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share WhatsApp</span>
            </button>
            <button
              onClick={() => setActiveReceiptInvoice(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 printable-area bg-white text-slate-900">
          {/* Institute Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6 flex justify-between items-start">
            <div>
              <div className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {currentOrg.name}
              </div>
              <p className="text-xs text-slate-600 font-medium">{currentOrg.tagline}</p>
              <p className="text-xs text-slate-500 mt-1">{currentOrg.address}, {currentOrg.city}, {currentOrg.state}</p>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1">
                <span>Phone: {currentOrg.phone}</span>
                {currentOrg.gstin && <span>GSTIN: <strong className="font-mono">{currentOrg.gstin}</strong></span>}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono text-xs font-bold tracking-widest uppercase">
                Fee Receipt
              </span>
              <p className="text-xs font-mono font-semibold text-slate-700 mt-2">
                No: {lastPayment?.receiptNo || activeReceiptInvoice.invoiceNo}
              </p>
              <p className="text-xs text-slate-500">
                Date: {lastPayment?.paymentDate || activeReceiptInvoice.createdAt}
              </p>
            </div>
          </div>

          {/* Student & Invoice details */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
            <div className="space-y-1">
              <div className="text-slate-500 font-medium">Student Name:</div>
              <div className="font-bold text-slate-900 text-sm">{student?.name}</div>
              <div className="text-slate-600">Enrollment No: <span className="font-mono font-medium">{student?.enrollmentNo}</span></div>
              <div className="text-slate-600">Class & Board: {student?.classGrade} ({student?.board})</div>
              <div className="text-slate-600">Parent / Guardian: {student?.guardian.fatherName}</div>
            </div>
            <div className="space-y-1 text-right sm:text-left">
              <div className="text-slate-500 font-medium">Billing Period:</div>
              <div className="font-bold text-slate-900 text-sm">{activeReceiptInvoice.monthYear}</div>
              <div className="text-slate-600">Batch: {batch?.name || 'Academic Coaching'}</div>
              <div className="text-slate-600">Mode: <strong className="font-semibold text-indigo-700">{lastPayment?.paymentMethod || 'UPI / Cash'}</strong></div>
              <div className="text-slate-600 truncate">Ref: <span className="font-mono text-[11px]">{lastPayment?.transactionRef || 'OFFLINE-CONFIRMED'}</span></div>
            </div>
          </div>

          {/* Fee Itemization Table */}
          <table className="w-full text-xs mb-6 border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
              <tr>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-right">Fee (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="p-3 font-medium">
                  {activeReceiptInvoice.title}
                  <p className="text-[11px] text-slate-500 mt-0.5">Faculty lectures, coaching coursework, diagnostics & test series.</p>
                </td>
                <td className="p-3 text-right font-mono font-semibold">₹{(activeReceiptInvoice.amount ?? 0).toLocaleString('en-IN')}</td>
              </tr>
              {(activeReceiptInvoice.discount || 0) > 0 && (
                <tr className="text-emerald-700">
                  <td className="p-3">Special Concession / Scholarship / Sibling Discount</td>
                  <td className="p-3 text-right font-mono font-semibold">- ₹{(activeReceiptInvoice.discount ?? 0).toLocaleString('en-IN')}</td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-semibold text-slate-900">
              <tr>
                <td className="p-3">Total Payable Amount</td>
                <td className="p-3 text-right font-mono font-bold text-sm">₹{(activeReceiptInvoice.netAmount ?? 0).toLocaleString('en-IN')}</td>
              </tr>
              <tr className="bg-emerald-50 text-emerald-900">
                <td className="p-3 font-bold">Total Amount Received</td>
                <td className="p-3 text-right font-mono font-bold text-sm">₹{(activeReceiptInvoice.paidAmount ?? 0).toLocaleString('en-IN')}</td>
              </tr>
              {((activeReceiptInvoice.netAmount ?? 0) - (activeReceiptInvoice.paidAmount ?? 0)) > 0 && (
                <tr className="bg-amber-50 text-amber-900">
                  <td className="p-3 font-semibold">Balance Due</td>
                  <td className="p-3 text-right font-mono font-bold text-sm">
                    ₹{(((activeReceiptInvoice.netAmount ?? 0) - (activeReceiptInvoice.paidAmount ?? 0))).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>

          {/* Footer Note & Signatory */}
          <div className="grid grid-cols-2 gap-6 items-end pt-6 border-t border-slate-200 text-xs">
            <div className="text-slate-500 text-[11px] space-y-1">
              <p>• Fees once paid are non-refundable & non-transferable.</p>
              <p>• This is a computer-generated official receipt via VidyaOS.</p>
              <p className="font-semibold text-slate-700 mt-1">UPI ID: {currentOrg.upiId}</p>
            </div>
            <div className="text-right">
              <div className="inline-block border-b-2 border-slate-400 pb-1 w-44 text-center">
                <span className="font-serif italic text-slate-800 text-sm font-semibold">{currentOrg.ownerName}</span>
              </div>
              <div className="text-[11px] font-bold text-slate-700 mt-1 uppercase">Authorized Signatory / Seal</div>
              <div className="text-[10px] text-slate-400">{currentOrg.name}</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end no-print">
          <button
            onClick={() => setActiveReceiptInvoice(null)}
            className="px-5 py-2 bg-slate-900 text-white font-medium text-xs rounded-xl hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
