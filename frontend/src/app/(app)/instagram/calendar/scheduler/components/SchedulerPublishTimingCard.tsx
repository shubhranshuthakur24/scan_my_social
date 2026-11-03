'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Calendar, Clock, Send, Sparkles, Flame, RefreshCw } from 'lucide-react';

export interface SchedulerPublishTimingCardProps {
  scheduleMode: 'recommended' | 'custom' | 'now';
  setScheduleMode: (mode: 'recommended' | 'custom' | 'now') => void;
  selectedRecommendation: string;
  setSelectedRecommendation: (rec: string) => void;
  customDate: string;
  setCustomDate: (date: string) => void;
  customTime: string;
  setCustomTime: (time: string) => void;
  isSubmitting: boolean;
  isUploading: boolean;
  handleScheduleSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export default function SchedulerPublishTimingCard({
  scheduleMode,
  setScheduleMode,
  selectedRecommendation,
  setSelectedRecommendation,
  customDate,
  setCustomDate,
  customTime,
  setCustomTime,
  isSubmitting,
  isUploading,
  handleScheduleSubmit,
  className = '',
}: SchedulerPublishTimingCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 ${className}`}>
      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">5. Publishing Schedule</span>

      <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setScheduleMode('recommended')}
          className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            scheduleMode === 'recommended' ? 'bg-white text-primary-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Flame size={13} className="text-rose-500 fill-rose-500" /> Peak Audience
        </button>
        <button
          type="button"
          onClick={() => setScheduleMode('custom')}
          className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            scheduleMode === 'custom' ? 'bg-white text-primary-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar size={13} /> Custom Slot
        </button>
        <button
          type="button"
          onClick={() => setScheduleMode('now')}
          className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            scheduleMode === 'now' ? 'bg-white text-primary-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send size={13} /> Post Now
        </button>
      </div>

      {/* Recommended slots */}
      {scheduleMode === 'recommended' && (
        <div className="space-y-2">
          {[
            'Tomorrow at 6:00 PM (Peak Audience)',
            'Friday at 2:30 PM (High Retention)',
            'Sunday at 7:00 PM (Weekend Spike)',
          ].map((rec) => (
            <label
              key={rec}
              onClick={() => setSelectedRecommendation(rec)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                selectedRecommendation === rec
                  ? 'border-primary-600 bg-primary-50 text-primary-950 font-bold ring-1 ring-primary-600'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <Clock size={14} className="text-primary-600" />
                <span>{rec}</span>
              </div>
              {selectedRecommendation === rec && (
                <span className="w-2 h-2 rounded-full bg-primary-600" />
              )}
            </label>
          ))}
        </div>
      )}

      {/* Custom Slot */}
      {scheduleMode === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Select Date"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            leftIcon={Calendar}
          />
          <Input
            label="Select Time"
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            leftIcon={Clock}
          />
        </div>
      )}

      {/* Primary Action Button */}
      <div className="pt-2">
        <Button
          variant="gradient"
          size="lg"
          fullWidth
          disabled={isSubmitting || isUploading}
          icon={isSubmitting ? RefreshCw : scheduleMode === 'now' ? Send : Sparkles}
          onClick={handleScheduleSubmit}
        >
          {isSubmitting
            ? 'Saving to Queue...'
            : isUploading
            ? 'Uploading Media Asset...'
            : scheduleMode === 'now'
            ? 'Publish Immediately to Instagram'
            : 'Schedule Content to Queue'}
        </Button>
      </div>
    </div>
  );
}
