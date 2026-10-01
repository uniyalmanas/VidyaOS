import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { FeeInvoice, PaymentRecord, Organization, User } from '../../types';
import { MOCK_INVOICES } from '../../data/mockData';
import { subscribeToInvoices, persistInvoiceToFirestore } from '../../lib/firestoreService';

export interface FeeContextType {
  invoices: FeeInvoice[];
  recordPayment: (invoiceId: string, paymentData: { amount: number; paymentMethod: PaymentRecord['paymentMethod']; transactionRef?: string; upiApp?: PaymentRecord['upiApp'] }) => PaymentRecord;
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
    const saved = localStorage.getItem('vidyaos_invoices');
    return saved ? JSON.parse(saved) : MOCK_INVOICES;
  });

  const [activeReceiptInvoice, setActiveReceiptInvoice] = useState<FeeInvoice | null>(null);
  const [activeUpiModalInvoice, setActiveUpiModalInvoice] = useState<FeeInvoice | null>(null);

  // Sync to localStorage
  useEffect(() => {
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

  // Multi-Tenant Isolation: Filtered data views
  const tenantInvoices = useMemo(() => {
    if (isPlatformOwner) return invoices;
    return invoices.filter(i => i.orgId === currentOrg.id && (selectedBranchId === 'all' || i.branchId === selectedBranchId));
  }, [invoices, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const recordPayment = (invoiceId: string, paymentData: { amount: number; paymentMethod: PaymentRecord['paymentMethod']; transactionRef?: string; upiApp?: PaymentRecord['upiApp'] }): PaymentRecord => {
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      invoiceId,
      amount: paymentData.amount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: paymentData.paymentMethod,
      transactionRef: paymentData.transactionRef || `REF/${Date.now().toString().slice(-8)}`,
      receivedBy: currentUser.name,
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      upiApp: paymentData.upiApp
    };

    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const newPaidAmount = inv.paidAmount + paymentData.amount;
        const newStatus = newPaidAmount >= inv.netAmount ? 'paid' : 'partially_paid';
        const updatedInvoice: FeeInvoice = {
          ...inv,
          paidAmount: newPaidAmount,
          status: newStatus,
          payments: [...inv.payments, newPayment]
        };
        persistInvoiceToFirestore(updatedInvoice);
        return updatedInvoice;
      }
      return inv;
    }));

    return newPayment;
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
        recordPayment,
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
