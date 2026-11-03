'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { downloadUserInvoiceReceipt } from '@/lib/api/authService';
import { CreditCard, Download, FileText } from 'lucide-react';

interface InvoiceHistoryTableProps {
  invoicesList: any[];
  onToast: (msg: string) => void;
}

export default function InvoiceHistoryTable({
  invoicesList,
  onToast,
}: InvoiceHistoryTableProps) {
  const handleDownloadInvoice = async (invoiceId: string | number) => {
    try {
      await downloadUserInvoiceReceipt(invoiceId);
      onToast(`Downloading invoice receipt #${invoiceId}...`);
    } catch (err: any) {
      onToast(err.message || 'Failed to download invoice receipt.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-primary-600">
          <CreditCard size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Billing & Invoice History</h3>
          <p className="text-xs text-slate-500">Download past payment receipts and official tax invoices</p>
        </div>
      </div>

      {invoicesList.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
          <FileText className="mx-auto text-slate-300" size={32} />
          <p className="text-xs font-bold text-slate-700">No Invoices Found</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Your official payment receipts and invoices will appear here automatically after your first subscription billing transaction.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                <th className="pb-3">Invoice Number</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Plan Description</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {invoicesList.map((inv: any) => {
                const invoiceId = inv.raw_id || inv.id;
                const displayNum = inv.invoice_number || inv.id || `INV-${invoiceId}`;
                const displayDate = inv.date || (inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'N/A');
                const displayPlan = inv.plan || inv.plan_name || 'Subscription Plan';
                const displayAmount = inv.amount || (inv.amount_cents ? `$${(inv.amount_cents / 100).toFixed(2)}` : '$0.00');
                const displayStatus = (inv.status || 'paid').toLowerCase();

                return (
                  <tr key={invoiceId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-bold text-slate-900">{displayNum}</td>
                    <td className="py-3 text-slate-500">{displayDate}</td>
                    <td className="py-3 font-semibold text-slate-800">{displayPlan}</td>
                    <td className="py-3 font-black text-slate-900">{displayAmount}</td>
                    <td className="py-3">
                      <Badge
                        variant={displayStatus === 'paid' || displayStatus === 'success' ? 'success' : 'warning'}
                        className="uppercase text-[9px] font-black tracking-wider"
                      >
                        {displayStatus}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoiceId)}
                        icon={<Download size={14} />}
                        className="text-primary-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        PDF Receipt
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
