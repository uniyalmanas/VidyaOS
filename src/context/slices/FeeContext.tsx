import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { FeeInvoice, PaymentRecord, PaymentSubmission, Organization, User } from '../../types';
import { MOCK_INVOICES } from '../../data/mockData';
import {
  createPaymentSubmission,
  rejectPaymentSubmission,
  subscribeToInvoices,
  subscribeToPaymentSubmissions,
  persistInvoiceToFirestore,
  recordPaymentAtomically,
  verifyPaymentSubmission
} from '../../lib/firestoreService';

export interface FeeContextType {
  invoices: FeeInvoice[];
  pendingPaymentSubmissions: PaymentSubmission[];
  recordPayment: (invoiceId: string, paymentData: { amount: number; paymentMethod: PaymentRecord['paymentMethod']; transactionRef?: string; upiApp?: PaymentRecord['upiApp'] }) => Promise<PaymentRecord>;
  submitPendingPayment: (invoiceId: string, paymentData: { amount: number; paymentMethod: 'UPI'; transactionRef: string; upiApp?: PaymentRecord['upiApp'] }) => Promise<PaymentSubmission>;
  verifyPayment: (submissionId: string) => Promise<void>;
  rejectPayment: (submissionId: string, reason?: string) => Promise<void>;
  createInvoice: (invoice: Omit<FeeInvoice, 'id' | 'orgId' | 'invoiceNo' | 'payments' | 'createdAt'>) => FeeInvoice;
  activeReceiptInvoice: FeeInvoice | null;
  setActiveReceiptInvoice: (inv: FeeInvoice | null) => void;
  activeUpiModalInvoice: FeeInvoice | null;
  setActiveUpiModalInvoice: (inv: FeeInvoice | null) => void;
}

const FeeContext = createContext<FeeContextType | undefined>(undefined);

interface FeeProviderProps {
  currentOrg: Organization;
  selectedBranchId: string;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

export const FeeProvider: React.FC<FeeProviderProps> = ({
  currentOrg,
  selectedBranchId,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const [invoices, setInvoices] = useState<FeeInvoice[]>(() => {
    // The localStorage mirror is DEV-only. Production hydrates from Firestore
    // alone (see the subscription below and the persistent cache in firebase.ts)
    // so a browser that a tenant has logged out of can never replay their
    // invoices back on the next boot.
    const saved = import.meta.env.DEV ? localStorage.getItem('vidyaos_invoices') : null;
    return saved ? JSON.parse(saved) : (import.meta.env.DEV ? MOCK_INVOICES : []);
  });

  const [activeReceiptInvoice, setActiveReceiptInvoice] = useState<FeeInvoice | null>(null);
  const [activeUpiModalInvoice, setActiveUpiModalInvoice] = useState<FeeInvoice | null>(null);
  const [pendingPaymentSubmissions, setPendingPaymentSubmissions] = useState<PaymentSubmission[]>([]);

  // DEV-only mirror, so mock-mode invoices survive a reload. In production
  // Firestore is the single source of truth — writing a second, unauthenticated
  // copy of every invoice here would only leave PII behind after logout.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    localStorage.setItem('vidyaos_invoices', JSON.stringify(invoices));
  }, [invoices]);

  // Real-time Firestore Subscriptions for Invoices
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;

    const unsubInvoices = subscribeToInvoices(data => {
      if (data) {
        setInvoices(data.map(inv => ({
          ...inv,
          netAmount: typeof inv.netAmount === 'number' ? inv.netAmount : (inv.amount || 0),
          paidAmount: typeof inv.paidAmount === 'number' ? inv.paidAmount : 0,
          amount: typeof inv.amount === 'number' ? inv.amount : 0,
          discount: typeof inv.discount === 'number' ? inv.discount : 0
        })));
      }
    }, targetOrg);

    return () => {
      unsubInvoices();
    };
  }, [currentOrg.id, isPlatformOwner]);

  useEffect(() => {
    const canReviewPayments = ['CENTER_ADMIN', 'STAFF', 'PLATFORM_OWNER'].includes(currentUser.role);
    if (!canReviewPayments || !currentOrg.id) {
      setPendingPaymentSubmissions([]);
      return;
    }
    return subscribeToPaymentSubmissions(setPendingPaymentSubmissions, currentOrg.id);
  }, [currentOrg.id, currentUser.role]);

  // Multi-Tenant Isolation: Filtered data views
  const tenantInvoices = useMemo(() => {
    if (isPlatformOwner) return invoices;
    return invoices.filter(i => i.orgId === currentOrg.id && (selectedBranchId === 'all' || i.branchId === selectedBranchId));
  }, [invoices, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const recordPayment = async (invoiceId: string, paymentData: { amount: number; paymentMethod: PaymentRecord['paymentMethod']; transactionRef?: string; upiApp?: PaymentRecord['upiApp'] }): Promise<PaymentRecord> => {
    if (paymentData.paymentMethod === 'UPI' && !/^\d{12}$/.test(paymentData.transactionRef || '')) {
      throw new Error('Enter the 12-digit UPI UTR before recording this payment.');
    }
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      invoiceId,
      amount: paymentData.amount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: paymentData.paymentMethod,
      transactionRef: paymentData.transactionRef || `CASH-${Date.now()}`,
      receivedBy: currentUser.name,
      receiptNo: `REC-${Date.now()}-${Math.random().toString(36).slice(-6)}`,
      upiApp: paymentData.upiApp,
      status: 'verified',
      verifiedBy: currentUser.name,
      verifiedAt: new Date().toISOString()
    };

    const updatedInvoice = await recordPaymentAtomically(invoiceId, newPayment);
    setInvoices(prev => prev.map(invoice => invoice.id === invoiceId ? updatedInvoice : invoice));
    return newPayment;
  };

  const submitPendingPayment = async (
    invoiceId: string,
    paymentData: { amount: number; paymentMethod: 'UPI'; transactionRef: string; upiApp?: PaymentRecord['upiApp'] }
  ): Promise<PaymentSubmission> => {
    const invoice = tenantInvoices.find(item => item.id === invoiceId);
    const transactionRef = paymentData.transactionRef.trim();
    if (!invoice) throw new Error('Invoice not found in this center.');
    if (!/^\d{12}$/.test(transactionRef)) throw new Error('Enter a valid 12-digit UPI UTR.');
    const balance = invoice.netAmount - invoice.paidAmount;
    if (!Number.isFinite(paymentData.amount) || paymentData.amount <= 0 || paymentData.amount > balance) {
      throw new Error('Payment amount must be positive and cannot exceed the current balance.');
    }
    const submission: PaymentSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orgId: invoice.orgId,
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      amount: paymentData.amount,
      paymentMethod: 'UPI',
      transactionRef,
      upiApp: paymentData.upiApp,
      submittedBy: currentUser.id,
      submittedByName: currentUser.name,
      submittedAt: new Date().toISOString(),
      status: 'pending_verification'
    };
    await createPaymentSubmission(submission);
    return submission;
  };

  const verifyPayment = async (submissionId: string): Promise<void> => {
    await verifyPaymentSubmission(submissionId, currentUser.id, currentUser.name);
  };

  const rejectPayment = async (submissionId: string, reason?: string): Promise<void> => {
    await rejectPaymentSubmission(submissionId, currentUser.id, reason || '');
  };

  const createInvoice = (data: Omit<FeeInvoice, 'id' | 'orgId' | 'invoiceNo' | 'payments' | 'createdAt'>): FeeInvoice => {
    const invoiceNo = `INV/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
    const newInvoice: FeeInvoice = {
      ...data,
      id: `inv-${Date.now()}`,
      orgId: currentOrg.id,
      invoiceNo,
      payments: [],
      createdAt: new Date().toISOString().split('T')[0]
    };
    setInvoices(prev => [newInvoice, ...prev]);
    persistInvoiceToFirestore(newInvoice);
    return newInvoice;
  };

  return (
    <FeeContext.Provider
      value={{
        invoices: tenantInvoices,
        pendingPaymentSubmissions,
        recordPayment,
        submitPendingPayment,
        verifyPayment,
        rejectPayment,
        createInvoice,
        activeReceiptInvoice,
        setActiveReceiptInvoice,
        activeUpiModalInvoice,
        setActiveUpiModalInvoice
      }}
    >
      {children}
    </FeeContext.Provider>
  );
};

export const useFees = () => {
  const context = useContext(FeeContext);
  if (!context) {
    throw new Error('useFees must be used within a FeeProvider');
  }
  return context;
};
