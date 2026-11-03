'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { Bell, Sparkles, CheckCircle2 } from 'lucide-react';

interface NotificationPreferencesCardProps {
  onToast: (msg: string) => void;
}

export default function NotificationPreferencesCard({ onToast }: NotificationPreferencesCardProps) {
  const [emailDigest, setEmailDigest] = useState(true);
  const [viralAlerts, setViralAlerts] = useState(true);
  const [payoutNotifs, setPayoutNotifs] = useState(true);
  const [savedNotif, setSavedNotif] = useState(false);

  const handleSaveNotif = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotif(true);
    onToast('Notification preferences saved!');
    setTimeout(() => setSavedNotif(false), 2000);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Bell size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Notification Preferences</h3>
          <p className="text-xs text-slate-500">Manage email digests, competitor viral spike alerts, and affiliate payout notifications</p>
        </div>
      </div>

      <form onSubmit={handleSaveNotif} className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-900">Viral Outlier Video Alerts</span>
              <p className="text-[11px] text-slate-500">Get notified immediately when a tracked competitor Reel exceeds 5x normal view velocity</p>
            </div>
            <input
              type="checkbox"
              checked={viralAlerts}
              onChange={(e) => setViralAlerts(e.target.checked)}
              className="w-4 h-4 rounded-md text-primary-600 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-900">Weekly Performance Email Digest</span>
              <p className="text-[11px] text-slate-500">Receive a weekly summary of account follower growth, top Reel hooks, and auto-DM conversions</p>
            </div>
            <input
              type="checkbox"
              checked={emailDigest}
              onChange={(e) => setEmailDigest(e.target.checked)}
              className="w-4 h-4 rounded-md text-primary-600 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-900">Affiliate Commission & Payout Notifications</span>
              <p className="text-[11px] text-slate-500">Get notified when new affiliate referrals sign up or monthly commissions deposit</p>
            </div>
            <input
              type="checkbox"
              checked={payoutNotifs}
              onChange={(e) => setPayoutNotifs(e.target.checked)}
              className="w-4 h-4 rounded-md text-primary-600 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            icon={savedNotif ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
          >
            {savedNotif ? 'Preferences Saved!' : 'Save Notification Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
