'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-black text-white tracking-tight">Reset Password</h1>
        <p className="text-xs text-slate-400 font-medium">
          Enter your registered email and we will send you a password reset link.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="font-bold text-sm text-white">Reset Link Sent</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            We have dispatched a reset link to <strong className="text-white">{email}</strong>. Check your inbox and spam folder.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 mt-2"
          >
            Return to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@creator.io"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-rose-500 py-3 text-xs font-black text-white shadow-lg shadow-purple-600/30 hover:opacity-95 transition-opacity"
          >
            <Send size={14} />
            <span>Send Reset Instructions</span>
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
            >
              <ArrowLeft size={12} /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
