'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  TrendingUp,
  UserPlus
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  instagramHandle: string;
  source: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Closed';
  date: string;
}

const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Sarah Miller',
    email: 'sarah@creatorflow.io',
    instagramHandle: 'sarah_creator',
    source: 'AutoDM: PLAYBOOK',
    status: 'Qualified',
    date: 'Today at 2:15 PM',
  },
  {
    id: 'lead-2',
    name: 'Marcus Vance',
    email: 'marcus@vancemedia.com',
    instagramHandle: 'marcusvance',
    source: 'Bio Link Form',
    status: 'New',
    date: 'Today at 11:40 AM',
  },
  {
    id: 'lead-3',
    name: 'Elena Rostova',
    email: 'elena@novastudios.design',
    instagramHandle: 'elenadesigns',
    source: '1-on-1 Consultation Intake',
    status: 'Contacted',
    date: 'Yesterday at 5:20 PM',
  },
];

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [search, setSearch] = useState('');

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.instagramHandle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Lead CRM & Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage inbound leads captured through your Instagram comments, AutoDM campaigns, and Bio Link forms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-md">
            <UserPlus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500">Total Leads Captured</span>
          <p className="mt-2 text-2xl font-black text-slate-900">{leads.length + 180}</p>
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
            <TrendingUp size={12} /> +18 today
          </span>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500">Qualified Pipeline</span>
          <p className="mt-2 text-2xl font-black text-slate-900">42</p>
          <span className="text-[11px] font-medium text-slate-400 mt-1 block">Ready for strategy call</span>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500">Avg Response Time</span>
          <p className="mt-2 text-2xl font-black text-slate-900">&lt; 1 min</p>
          <span className="text-[11px] font-semibold text-primary-600 mt-1 block">Instant AutoDM Webhook</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, email, @handle..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Lead Contact</th>
                <th className="px-6 py-3.5">Instagram</th>
                <th className="px-6 py-3.5">Attribution Source</th>
                <th className="px-6 py-3.5">Pipeline Status</th>
                <th className="px-6 py-3.5 text-right">Captured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <h4 className="font-bold text-slate-900 text-xs">{lead.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{lead.email}</p>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-bold text-primary-600 hover:underline cursor-pointer">
                      @{lead.instagramHandle}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                      {lead.source}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${lead.status === 'Qualified'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : lead.status === 'New'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                    >
                      {lead.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right text-slate-400 text-[11px]">
                    {lead.date}
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
