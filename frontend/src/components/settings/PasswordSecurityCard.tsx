'use client';

import React, { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import { updateUserPassword } from '@/lib/api/authService';
import { Lock, Eye, EyeOff, ShieldCheck, Check, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PasswordSecurityCardProps {
  onToast: (msg: string) => void;
}

export default function PasswordSecurityCard({ onToast }: PasswordSecurityCardProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [savedPassword, setSavedPassword] = useState(false);

  const passwordErrorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPasswordError = (msg: string) => {
    setPasswordError(msg);
    if (passwordErrorTimerRef.current) {
      clearTimeout(passwordErrorTimerRef.current);
    }
    if (msg) {
      passwordErrorTimerRef.current = setTimeout(() => {
        setPasswordError('');
      }, 4000);
    }
  };

  const getPasswordRuleErrors = (val: string) => {
    const errors: string[] = [];
    if (!val) return errors;
    if (val.length < 8) errors.push('Must be at least 8 characters long');
    if (!/[A-Z]/.test(val)) errors.push('Must contain at least one uppercase letter (A-Z)');
    if (!/[a-z]/.test(val)) errors.push('Must contain at least one lowercase letter (a-z)');
    if (!/[0-9]/.test(val)) errors.push('Must contain at least one number (0-9)');
    if (!/[^A-Za-z0-9]/.test(val)) errors.push('Must contain at least one symbol (e.g. !@#$%^&*)');
    return errors;
  };

  const runRealtimePasswordValidation = (newVal: string, confirmVal: string) => {
    if (!newVal) {
      setPasswordError('');
      return;
    }

    const ruleErrors = getPasswordRuleErrors(newVal);
    if (ruleErrors.length > 0) {
      triggerPasswordError(`New password does not meet security requirements:\n• ${ruleErrors.join('\n• ')}`);
      return;
    }

    if (confirmVal && newVal !== confirmVal) {
      triggerPasswordError('New password and confirm password do not match.');
      return;
    }

    setPasswordError('');
  };

  const isChanged =
    currentPassword.length > 0 ||
    newPassword.length > 0 ||
    confirmPassword.length > 0;

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    getPasswordRuleErrors(newPassword).length === 0 &&
    newPassword === confirmPassword;

  const isUpdatePasswordActive = isChanged && isValid && !isSubmittingPassword;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUpdatePasswordActive) {
      return;
    }
    setPasswordError('');
    setIsSubmittingPassword(true);
    try {
      await updateUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSavedPassword(true);
      onToast('Password updated successfully!');
      setTimeout(() => setSavedPassword(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      triggerPasswordError(msg);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
          <Lock size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Password & Account Security</h3>
          <p className="text-xs text-slate-500">Ensure your account is using a strong password</p>
        </div>
      </div>

      <form onSubmit={handleUpdatePassword} className="space-y-4">
        {passwordError && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="whitespace-pre-line">{passwordError}</div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all pr-10"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  runRealtimePasswordValidation(e.target.value, confirmPassword);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all pr-10"
                placeholder="At least 8 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  runRealtimePasswordValidation(newPassword, e.target.value);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all pr-10"
                placeholder="Re-type new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Live Security Checklist */}
        {newPassword && (
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
            <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Password Requirements</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 font-medium">
              <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? 'text-emerald-600 font-bold' : ''}`}>
                <Check size={14} className={newPassword.length >= 8 ? 'text-emerald-500' : 'text-slate-300'} />
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(newPassword) ? 'text-emerald-600 font-bold' : ''}`}>
                <Check size={14} className={/[A-Z]/.test(newPassword) ? 'text-emerald-500' : 'text-slate-300'} />
                <span>One uppercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${/[a-z]/.test(newPassword) ? 'text-emerald-600 font-bold' : ''}`}>
                <Check size={14} className={/[a-z]/.test(newPassword) ? 'text-emerald-500' : 'text-slate-300'} />
                <span>One lowercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${/[0-9]/.test(newPassword) ? 'text-emerald-600 font-bold' : ''}`}>
                <Check size={14} className={/[0-9]/.test(newPassword) ? 'text-emerald-500' : 'text-slate-300'} />
                <span>One number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-600 font-bold' : ''}`}>
                <Check size={14} className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-500' : 'text-slate-300'} />
                <span>One special symbol</span>
              </div>
              <div className={`flex items-center gap-1.5 ${newPassword && confirmPassword && newPassword === confirmPassword ? 'text-emerald-600 font-bold' : ''}`}>
                <Check size={14} className={newPassword && confirmPassword && newPassword === confirmPassword ? 'text-emerald-500' : 'text-slate-300'} />
                <span>Passwords match</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={!isUpdatePasswordActive}
            variant={isUpdatePasswordActive ? 'primary' : 'secondary'}
            className={
              savedPassword
                ? '!bg-emerald-50 !text-emerald-700 !border-emerald-200 !shadow-none !cursor-default disabled:!opacity-100'
                : !isUpdatePasswordActive
                ? '!bg-slate-200 !text-slate-400 !border-slate-200 !shadow-none !cursor-not-allowed hover:!bg-slate-200 hover:!text-slate-400 hover:!translate-y-0 active:!scale-100 disabled:!opacity-100'
                : ''
            }
            icon={savedPassword ? <CheckCircle2 size={16} className="text-emerald-600" /> : <ShieldCheck size={16} />}
          >
            {isSubmittingPassword ? 'Updating Password...' : savedPassword ? 'Password Updated!' : 'Update Password'}
          </Button>
        </div>
      </form>
    </div>
  );
}
