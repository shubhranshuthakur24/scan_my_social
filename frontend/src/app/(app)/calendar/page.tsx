'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  User,
  Plus,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  service: string;
  time: string;
  date: string;
  status: 'Confirmed' | 'Pending';
  meetingUrl: string;
}

const mockBookings: Booking[] = [
  {
    id: 'b-1',
    clientName: 'David Chen',
    clientEmail: 'david@synthetix.ai',
    service: '30-Min AI Viral Growth Audit',
    time: '2:00 PM - 2:30 PM',
    date: 'Tomorrow, Sep 14',
    status: 'Confirmed',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
  },
  {
    id: 'b-2',
    clientName: 'Emma Watson',
    clientEmail: 'emma@sparkcreative.co',
    service: 'Strategy Call: Scripting Optimization',
    time: '4:00 PM - 4:45 PM',
    date: 'Tuesday, Sep 15',
    status: 'Confirmed',
    meetingUrl: 'https://meet.google.com/xyz-uvw-rst',
  },
];

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Appointments & Strategy Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View booked consultations, manage your availability slots, and send calendar invites directly to leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs">
            <ExternalLink size={14} /> Public Booking Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar View (Left 7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">September 2026</h2>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                <ChevronLeft size={14} />
              </button>
              <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day} className="font-bold text-slate-400 py-2 text-[11px] uppercase">
                {day}
              </span>
            ))}

            {Array.from({ length: 30 }).map((_, i) => {
              const dayNum = i + 1;
              const hasBooking = dayNum === 14 || dayNum === 15;
              return (
                <div
                  key={dayNum}
                  className={`h-14 rounded-xl border p-1 flex flex-col justify-between transition-all ${hasBooking
                      ? 'border-purple-300 bg-purple-50/60 font-bold text-purple-900 shadow-2xs'
                      : 'border-slate-100 hover:border-slate-300 text-slate-700'
                    }`}
                >
                  <span className="text-[11px] text-left pl-1">{dayNum}</span>
                  {hasBooking && (
                    <span className="w-full truncate rounded-sm bg-purple-600 px-1 py-0.5 text-[9px] font-bold text-white text-center">
                      1 Call
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Bookings (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-black text-slate-900">Upcoming Strategy Sessions</h2>

          {bookings.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900">{b.clientName}</h3>
                  <p className="text-[11px] text-slate-400">{b.clientEmail}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 size={10} /> {b.status}
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CalendarIcon size={12} className="text-primary-600" />
                  {b.date} • {b.time}
                </div>
                <div className="text-[11px] text-slate-500">{b.service}</div>
              </div>

              <a
                href={b.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20"
              >
                <Video size={14} /> Join Video Call
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
