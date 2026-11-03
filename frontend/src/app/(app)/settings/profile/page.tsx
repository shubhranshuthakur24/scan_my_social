'use client';

import React, { useState } from 'react';
import ProfileDetailsCard from '@/components/settings/ProfileDetailsCard';
import PasswordSecurityCard from '@/components/settings/PasswordSecurityCard';
import BankDetailsCard from '@/components/settings/BankDetailsCard';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { deleteUserAccount } from '@/lib/api/authService';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ProfileSettingsPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete my account') return;
    setIsDeletingAccount(true);
    try {
      await deleteUserAccount();
      window.location.href = '/login';
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete account.');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Profile Details Card */}
      <ProfileDetailsCard onToast={triggerToast} />

      {/* Password Security Card */}
      <PasswordSecurityCard onToast={triggerToast} />

      {/* Bank Details Card */}
      <BankDetailsCard onToast={triggerToast} />

      {/* Danger Zone: Delete Account */}
      <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-rose-950 flex items-center gap-2">
              <Trash2 size={18} className="text-rose-600" />
              Danger Zone: Delete Account
            </h3>
            <p className="text-xs text-rose-700 mt-1 max-w-xl">
              Permanently delete your Scan My Social account, connected social channels, custom viral watchlists, auto-DM configurations, and billing subscription history. This action cannot be undone.
            </p>
          </div>

          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={() => setShowDeleteModal(true)}
            className="shrink-0"
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Scan My Social Account">
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-start gap-3">
              <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
              <div className="text-xs text-rose-800 space-y-1">
                <p className="font-bold">Are you absolutely sure?</p>
                <p>
                  Deleting your account will immediately revoke access to all active Instagram automations, scraper credits, and saved competitor intelligence.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Type <span className="font-black text-slate-900">DELETE MY ACCOUNT</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                placeholder="DELETE MY ACCOUNT"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleteConfirmText.toLowerCase() !== 'delete my account' || isDeletingAccount}
                onClick={handleDeleteAccountConfirm}
              >
                {isDeletingAccount ? 'Deleting Account...' : 'Permanently Delete Account'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
