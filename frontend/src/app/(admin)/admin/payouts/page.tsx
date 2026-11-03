'use client';

import React, { useState } from 'react';
import {
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  DollarSign,
  TrendingUp,
  User
} from 'lucide-react';

interface PayoutRequest {
  id: string;
  creatorName: string;
  email: string;
  amount: number;
  paymentMethod: string;
  paypalOrBank: string;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected';
  requestedAt: string;
}

const mockPayouts: PayoutRequest[] = [
  {
    id: 'pay-1',
    creatorName: 'Alex Rivers',
    email: 'alex.rivers@gmail.com',
    amount: 588.0,
    paymentMethod: 'PayPal',
    paypalOrBank: 'alexrivers@paypal.me',
    status: 'Pending',
    requestedAt: 'Today at 10:15 AM',
  },
  {
    id: 'pay-2',
    creatorName: 'Jordan Lee',
    email: 'jordan@leeagency.co',
    amount: 450.0,
    paymentMethod: 'Bank Wire (ACH)',
    paypalOrBank: 'Chase Checking ****4921',
    status: 'Approved',
    requestedAt: 'Yesterday',
  },
  {
    id: 'pay-3',
    creatorName: 'Taylor Scott',
    email: 'taylor@scottvisuals.com',
    amount: 1200.0,
    paymentMethod: 'Wise',
    paypalOrBank: 'taylor.scott@wise.com',
    status: 'Paid',
    requestedAt: 'Sep 8, 2026',
  },
];

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>(mockPayouts);

  const handleAction = (id: string, newStatus: 'Paid' | 'Rejected') => {
    setPayouts(payouts.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Affiliate Payout Requests</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review, approve, and execute referral commission payouts for partner creators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-700 border border-purple-200">
            Total Pending: $1,038.00
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Affiliate Partner</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Payment Details</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <h4 className="font-bold text-slate-900 text-xs">{payout.creatorName}</h4>
                    <p className="text-[11px] text-slate-400">{payout.email}</p>
                  </td>

                  <td className="px-6 py-4 font-black text-sm text-slate-900">
                    ${payout.amount.toFixed(2)}
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800 block text-xs">{payout.paymentMethod}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{payout.paypalOrBank}</span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        payout.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : payout.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : payout.status === 'Approved'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {payout.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-[11px] text-slate-400">{payout.requestedAt}</td>

                  <td className="px-6 py-4 text-right">
                    {payout.status === 'Pending' || payout.status === 'Approved' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAction(payout.id, 'Paid')}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-xs"
                        >
                          Mark Paid
                        </button>
                        <button
                          onClick={() => handleAction(payout.id, 'Rejected')}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
