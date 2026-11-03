'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  CheckCircle2,
  XCircle,
  TrendingUp,
  DollarSign,
  Users
} from 'lucide-react';

interface AffiliatePartner {
  id: string;
  name: string;
  email: string;
  referralsCount: number;
  unpaidEarnings: number;
  totalPaid: number;
  status: 'Approved' | 'Pending Approval';
}

const mockAffiliates: AffiliatePartner[] = [
  {
    id: 'aff-1',
    name: 'Alex Rivers',
    email: 'alex.rivers@gmail.com',
    referralsCount: 42,
    unpaidEarnings: 588.0,
    totalPaid: 1862.0,
    status: 'Approved',
  },
  {
    id: 'aff-2',
    name: 'Jordan Lee',
    email: 'jordan@leeagency.co',
    referralsCount: 28,
    unpaidEarnings: 450.0,
    totalPaid: 920.0,
    status: 'Approved',
  },
  {
    id: 'aff-3',
    name: 'Chloe Monet',
    email: 'chloe@monetcreators.io',
    referralsCount: 0,
    unpaidEarnings: 0,
    totalPaid: 0,
    status: 'Pending Approval',
  },
];

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliatePartner[]>(mockAffiliates);

  const handleApprove = (id: string) => {
    setAffiliates(
      affiliates.map((a) => (a.id === id ? { ...a, status: 'Approved' } : a))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Partner & Affiliate Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Approve partner applications, track referred creator signups, and monitor commission liabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200">
            Active Partners: {affiliates.filter((a) => a.status === 'Approved').length}
          </span>
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Creator / Agency</th>
                <th className="px-6 py-3.5">Referrals</th>
                <th className="px-6 py-3.5">Unpaid Balance</th>
                <th className="px-6 py-3.5">Total Paid</th>
                <th className="px-6 py-3.5">Account Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {affiliates.map((aff) => (
                <tr key={aff.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <h4 className="font-bold text-slate-900 text-xs">{aff.name}</h4>
                    <p className="text-[11px] text-slate-400">{aff.email}</p>
                  </td>

                  <td className="px-6 py-4 font-black text-slate-900 text-xs">
                    {aff.referralsCount}
                  </td>

                  <td className="px-6 py-4 font-bold text-primary-600">
                    ${aff.unpaidEarnings.toFixed(2)}
                  </td>

                  <td className="px-6 py-4 font-medium text-slate-600">
                    ${aff.totalPaid.toFixed(2)}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${aff.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                    >
                      {aff.status === 'Approved' ? <CheckCircle2 size={10} /> : null}
                      {aff.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    {aff.status === 'Pending Approval' ? (
                      <button
                        onClick={() => handleApprove(aff.id)}
                        className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-bold text-white hover:bg-purple-700 shadow-xs"
                      >
                        Approve Partner
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">Active</span>
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
