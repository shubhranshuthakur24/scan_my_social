'use client';

import React, { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { updateBankDetails, getUserSettings } from '@/lib/api/authService';
import { Building2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BankDetailsCardProps {
  onToast: (msg: string) => void;
}

export default function BankDetailsCard({ onToast }: BankDetailsCardProps) {
  const [initialValues, setInitialValues] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    routingNumber: '',
  });

  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [hasUserEdited, setHasUserEdited] = useState(false);

  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [savedBank, setSavedBank] = useState(false);
  const [bankError, setBankError] = useState('');

  const bankErrorTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch saved bank details on mount
  useEffect(() => {
    let isMounted = true;
    getUserSettings()
      .then((data) => {
        if (!isMounted) return;
        if (data.bankDetails) {
          const bName = data.bankDetails.bank_name || '';
          const bHolder = data.bankDetails.account_holder_name || '';
          const bNumber = data.bankDetails.account_number || '';
          const bRouting = data.bankDetails.ifsc_code || '';
          if (!hasUserEdited) {
            setBankName(bName);
            setAccountHolder(bHolder);
            setAccountNumber(bNumber);
            setRoutingNumber(bRouting);
            setInitialValues({
              bankName: bName,
              accountHolder: bHolder,
              accountNumber: bNumber,
              routingNumber: bRouting,
            });
          }
        }
      })
      .catch(() => {
        // Silently retain state if offline
      });

    return () => {
      isMounted = false;
    };
  }, [hasUserEdited]);

  const triggerBankError = (msg: string) => {
    setBankError(msg);
    if (bankErrorTimerRef.current) {
      clearTimeout(bankErrorTimerRef.current);
    }
    if (msg) {
      bankErrorTimerRef.current = setTimeout(() => {
        setBankError('');
      }, 4000);
    }
  };

  const isChanged =
    bankName !== initialValues.bankName ||
    accountHolder !== initialValues.accountHolder ||
    accountNumber !== initialValues.accountNumber ||
    routingNumber !== initialValues.routingNumber;

  const isValid =
    bankName.trim().length > 0 &&
    accountHolder.trim().length > 0 &&
    accountNumber.trim().length > 0 &&
    routingNumber.trim().length > 0;

  const isSaveBankActive = isChanged && isValid && !isSubmittingBank;

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSaveBankActive) {
      return;
    }
    setBankError('');
    setIsSubmittingBank(true);
    try {
      await updateBankDetails({
        bank_name: bankName.trim(),
        account_holder_name: accountHolder.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: routingNumber.trim(),
      });
      setInitialValues({
        bankName: bankName.trim(),
        accountHolder: accountHolder.trim(),
        accountNumber: accountNumber.trim(),
        routingNumber: routingNumber.trim(),
      });
      setHasUserEdited(false);
      setSavedBank(true);
      onToast('Payout bank details updated successfully!');
      setTimeout(() => setSavedBank(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update bank details.';
      triggerBankError(msg);
    } finally {
      setIsSubmittingBank(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Affiliate Payout Bank Details</h3>
            <p className="text-xs text-slate-500">Receive monthly referral commission payouts directly to your bank account</p>
          </div>
        </div>

        {isChanged && (
          <Badge variant="warning" className="animate-pulse">
            Unsaved Changes
          </Badge>
        )}
      </div>

      <form onSubmit={handleSaveBank} className="space-y-4">
        {bankError && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{bankError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => {
                setBankName(e.target.value);
                setHasUserEdited(true);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="e.g., HDFC Bank"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Holder Name</label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => {
                setAccountHolder(e.target.value);
                setHasUserEdited(true);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="Full name as on bank account"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Number</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                setHasUserEdited(true);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="•••• •••• •••• 9876"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">IFSC Code</label>
            <input
              type="text"
              value={routingNumber}
              onChange={(e) => {
                setRoutingNumber(e.target.value);
                setHasUserEdited(true);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all uppercase"
              placeholder="HDFC0001234 / 123456789"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={!isSaveBankActive}
            variant={isSaveBankActive ? 'primary' : 'secondary'}
            className={
              savedBank
                ? '!bg-emerald-50 !text-emerald-700 !border-emerald-200 !shadow-none !cursor-default disabled:!opacity-100'
                : !isSaveBankActive
                ? '!bg-slate-200 !text-slate-400 !border-slate-200 !shadow-none !cursor-not-allowed hover:!bg-slate-200 hover:!text-slate-400 hover:!translate-y-0 active:!scale-100 disabled:!opacity-100'
                : ''
            }
            icon={savedBank ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Sparkles size={16} />}
          >
            {isSubmittingBank ? 'Saving Bank Details...' : savedBank ? 'Saved!' : 'Save Payout Details'}
          </Button>
        </div>
      </form>
    </div>
  );
}
