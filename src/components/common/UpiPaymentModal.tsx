import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QrCode, Smartphone, CheckCircle, X, ShieldCheck, ArrowRight, Copy, Check } from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { ConsoleButton, StatusChip, CountUp } from '../ui';
import { easings, tSpring, fadeUp, staggerContainerFast } from '../../lib/motion';

/** Modal shell: spring pop-in cascading header → payment body. */
const upiPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...tSpring, delayChildren: 0.05, staggerChildren: 0.06 }
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: { duration: 0.16, ease: easings.inOut }
  }
};

/** The QR / UPI block scales up gently, like a code being presented. */
const qrScaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: tSpring },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.12, ease: easings.inOut } }
};

export const UpiPaymentModal: React.FC = () => {
  const { activeUpiModalInvoice, setActiveUpiModalInvoice, currentOrg, submitPendingPayment, showToast } = useApp();
  const [selectedApp, setSelectedApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [customUtr, setCustomUtr] = useState<string>('');
  const [submissionSent, setSubmissionSent] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  const dueAmount = activeUpiModalInvoice
    ? activeUpiModalInvoice.netAmount - activeUpiModalInvoice.paidAmount
    : 0;
  const upiLink = activeUpiModalInvoice
    ? `upi://pay?pa=${encodeURIComponent(currentOrg.upiId)}&pn=${encodeURIComponent(currentOrg.upiMerchantName || currentOrg.name)}&am=${encodeURIComponent(dueAmount.toFixed(2))}&cu=INR&tn=${encodeURIComponent(`Invoice ${activeUpiModalInvoice.invoiceNo}`)}`
    : '';

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(currentOrg.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      setSubmitError('Could not copy the UPI ID. Please copy it manually.');
    }
  };

  const handleSubmitPayment = async () => {
    if (!activeUpiModalInvoice) return;
    const utr = customUtr.trim();
    if (!/^\d{12}$/.test(utr)) {
      setSubmitError('Enter the 12-digit UTR shown by your UPI app after the payment.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitPendingPayment(activeUpiModalInvoice.id, {
        amount: dueAmount,
        paymentMethod: 'UPI',
        transactionRef: utr,
        upiApp: selectedApp
      });
      setSubmissionSent(true);
      showToast('Payment reported and sent for center verification.', 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment report could not be submitted.';
      setSubmitError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {activeUpiModalInvoice && (
        <motion.div
          key="upi-payment-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: easings.outQuart }}
        >
          <motion.div
            variants={upiPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white dark:bg-[#1E1F20] w-full max-w-md rounded-2xl shadow-xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden"
          >
            {/* Header */}
            <motion.div variants={fadeUp} className="px-5 py-4 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between bg-white dark:bg-[#1E1F20]">
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
          </motion.div>

        {submissionSent ? (
          <motion.div
            key="upi-submitted"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: easings.outQuart, delay: 0.06 }}
            className="p-8 text-center space-y-3"
          >
            <div className="w-14 h-14 bg-[#E6F4EA] dark:bg-emerald-950/60 text-[#188038] dark:text-[#81C995] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold font-google-sans text-[#202124] dark:text-[#E8EAED]">Payment Reported</h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Your ₹{dueAmount.toLocaleString('en-IN')} payment report is awaiting verification by the center. A paid receipt will be available only after they verify the transfer.
            </p>
            <ConsoleButton variant="primary" onClick={() => setActiveUpiModalInvoice(null)}>Done</ConsoleButton>
          </motion.div>
        ) : (
          <motion.div variants={staggerContainerFast} className="p-5 space-y-4">
            {/* Amount Banner */}
            <motion.div variants={fadeUp} className="bg-[#F8F9FA] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] uppercase tracking-wider">
                  Amount Payable
                </span>
                <div className="text-2xl font-bold font-google-sans text-[#202124] dark:text-[#E8EAED]">
                  <CountUp value={dueAmount} prefix="₹" duration={0.9} />
                </div>
                <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] truncate max-w-[200px]">
                  {activeUpiModalInvoice.title}
                </div>
              </div>
              <StatusChip label={currentOrg.name} variant="info" size="xs" />
            </motion.div>

            {/* UPI payment instructions */}
            <motion.div variants={qrScaleVariants} className="border border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-4 text-center bg-white dark:bg-[#1E1F20] space-y-3">
              <div className="text-xs font-semibold text-[#202124] dark:text-[#E8EAED] flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4 text-[#1A73E8]" />
                Pay directly to the center's UPI ID
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
              <a
                href={upiLink}
                className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-[#1A73E8] px-3 py-2 text-xs font-bold text-white hover:bg-[#1557B0] hover:shadow-[var(--fb-glow-primary)] transition"
              >
                <Smartphone className="w-4 h-4" />
                Open UPI app · ₹{dueAmount.toLocaleString('en-IN')}
              </a>
              <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                If the link does not open, pay this UPI ID manually and enter the bank UTR below.
              </p>
            </motion.div>

            {/* Direct App Selection */}
            <motion.div variants={fadeUp}>
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
                  <motion.button
                    key={app.id}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.6 }}
                    onClick={() => setSelectedApp(app.id as 'gpay' | 'phonepe' | 'paytm' | 'bhim')}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition flex flex-col items-center justify-center cursor-pointer ${
                      selectedApp === app.id
                        ? 'border-[#FFA000] bg-[#FFA000]/10 text-[#202124] dark:text-white font-bold ring-1 ring-[#FFA000]'
                        : 'border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4]'
                    }`}
                  >
                    {app.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Optional UTR / Reference */}
            <motion.div variants={fadeUp}>
              <label className="block text-[11px] font-medium text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                Bank UTR (required; 12 digits)
              </label>
              <input
                type="text"
                placeholder="e.g. 428198273619"
                value={customUtr}
                inputMode="numeric"
                maxLength={12}
                onChange={e => {
                  setCustomUtr(e.target.value.replace(/\D/g, '').slice(0, 12));
                  setSubmitError(null);
                }}
                className="w-full text-xs font-mono px-3 py-2 border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
              />
            </motion.div>
            {submitError && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: easings.outQuart }}
                className="text-xs text-rose-600 dark:text-rose-400"
              >
                {submitError}
              </motion.p>
            )}

            {/* Action buttons */}
            <motion.div variants={fadeUp} className="pt-2 space-y-2">
              <ConsoleButton
                variant="primary"
                size="md"
                onClick={handleSubmitPayment}
                disabled={submitting || dueAmount <= 0}
                className="w-full justify-center"
                iconRight={<ArrowRight className="w-4 h-4" />}
              >
                {submitting ? 'Submitting...' : 'Submit for verification'}
              </ConsoleButton>
              <div className="flex items-center justify-center space-x-1 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
                <span>Submitting this report does not confirm receipt of funds.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
