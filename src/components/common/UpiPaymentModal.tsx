import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QrCode, Smartphone, CheckCircle, X, ShieldCheck, ArrowRight, Copy, Check } from 'lucide-react';
import { ConsoleButton, StatusChip } from '../ui';

export const UpiPaymentModal: React.FC = () => {
  const { activeUpiModalInvoice, setActiveUpiModalInvoice, currentOrg, recordPayment, setActiveReceiptInvoice } = useApp();
  const [selectedApp, setSelectedApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [customUtr, setCustomUtr] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  if (!activeUpiModalInvoice) return null;

  const dueAmount = activeUpiModalInvoice.netAmount - activeUpiModalInvoice.paidAmount;

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(currentOrg.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCompletePayment = () => {
    const utr = customUtr || `UPI/${Date.now().toString().slice(-8)}`;
    recordPayment(activeUpiModalInvoice.id, {
      amount: dueAmount,
      paymentMethod: 'UPI',
      transactionRef: utr,
      upiApp: selectedApp
    });

    setPaymentSuccess(true);
    setTimeout(() => {
      setPaymentSuccess(false);
      setActiveUpiModalInvoice(null);
      // Auto open receipt for gratification!
      setActiveReceiptInvoice(activeUpiModalInvoice);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1E1F20] w-full max-w-md rounded-2xl shadow-xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between bg-white dark:bg-[#1E1F20]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFA000]/15 text-[#FFA000] dark:text-[#FFCA28] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="font-google-sans font-bold text-sm text-[#202124] dark:text-[#E8EAED]">
                Instant UPI Payment
              </div>
              <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                Zero transaction surcharge · Instant digital receipt
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveUpiModalInvoice(null)}
            className="p-1 rounded-lg text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {paymentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-[#E6F4EA] dark:bg-emerald-950/60 text-[#188038] dark:text-[#81C995] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold font-google-sans text-[#202124] dark:text-[#E8EAED]">Payment Successful</h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              ₹{dueAmount.toLocaleString('en-IN')} confirmed. Generating official digital fee receipt...
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Amount Banner */}
            <div className="bg-[#F8F9FA] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] uppercase tracking-wider">
                  Amount Payable
                </span>
                <div className="text-2xl font-bold font-google-sans text-[#202124] dark:text-[#E8EAED]">
                  ₹{dueAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] truncate max-w-[200px]">
                  {activeUpiModalInvoice.title}
                </div>
              </div>
              <StatusChip label={currentOrg.name} variant="info" size="xs" />
            </div>

            {/* QR Code Card */}
            <div className="border border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-4 text-center bg-white dark:bg-[#1E1F20] space-y-3">
              <div className="text-xs font-semibold text-[#202124] dark:text-[#E8EAED] flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4 text-[#1A73E8]" />
                Scan QR with any Indian UPI App
              </div>
              
              {/* QR Mock Graphic */}
              <div className="w-36 h-36 mx-auto bg-[#202124] p-2 rounded-xl flex items-center justify-center relative">
                <div className="w-full h-full bg-white rounded-lg p-2 flex flex-col items-center justify-center border border-slate-300">
                  <div className="grid grid-cols-6 gap-1 w-full h-full p-1 opacity-90">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-xs ${
                          (i % 2 === 0 && i % 3 === 0) || i < 7 || i % 6 === 0 || i > 28
                            ? 'bg-[#202124]'
                            : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-[#1A73E8] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      UPI
                    </span>
                  </div>
                </div>
              </div>

              {/* UPI ID Copy row */}
              <div className="flex items-center justify-between bg-[#F1F3F4] dark:bg-[#282A2C] px-3 py-2 rounded-lg text-xs">
                <div className="text-left font-mono font-semibold text-[#202124] dark:text-[#E8EAED] truncate pr-2">
                  {currentOrg.upiId}
                </div>
                <button
                  onClick={handleCopyUpi}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] rounded-md text-[#202124] dark:text-[#E8EAED] hover:bg-[#F8F9FA] transition text-[11px] font-medium flex-shrink-0 cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-3 h-3 text-[#188038]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Direct App Selection */}
            <div>
              <div className="text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6] mb-2">
                Or Pay via Installed UPI App:
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'gpay', label: 'Google Pay' },
                  { id: 'phonepe', label: 'PhonePe' },
                  { id: 'paytm', label: 'Paytm' },
                  { id: 'bhim', label: 'BHIM UPI' }
                ].map(app => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app.id as any)}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition flex flex-col items-center justify-center cursor-pointer ${
                      selectedApp === app.id
                        ? 'border-[#FFA000] bg-[#FFA000]/10 text-[#202124] dark:text-white font-bold ring-1 ring-[#FFA000]'
                        : 'border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4]'
                    }`}
                  >
                    {app.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional UTR / Reference */}
            <div>
              <label className="block text-[11px] font-medium text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                UPI Reference / UTR Number (Optional verification)
              </label>
              <input
                type="text"
                placeholder="e.g. 428198273619"
                value={customUtr}
                onChange={e => setCustomUtr(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
              />
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <ConsoleButton
                variant="primary"
                size="md"
                onClick={handleCompletePayment}
                className="w-full justify-center"
                iconRight={<ArrowRight className="w-4 h-4" />}
              >
                Confirm & Mark Paid (₹{dueAmount.toLocaleString('en-IN')})
              </ConsoleButton>
              <div className="flex items-center justify-center space-x-1 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
                <span>Encrypted Indian UPI Banking Simulation Protocol</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
