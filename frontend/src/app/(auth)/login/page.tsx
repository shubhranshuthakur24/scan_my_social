'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { loginUser } from '@/lib/api/authService';
import SocialProofBadge from '@/components/auth/SocialProofBadge';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const session = await loginUser(email, password);
      if (session.isAuthenticated && (session as any).token) {
        setAuth(
          {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: (session.user.role as any) || 'user',
            plan: 'pro',
            avatar: session.user.avatar,
          },
          (session as any).token
        );
        router.push('/dashboard');
      } else {
        setError('Invalid email address or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-2xl shadow-slate-300/40 backdrop-blur-sm sm:p-8">
      {/* Top Card Header */}
      <div className="mb-5 sm:mb-6">
        <div className="mb-3 flex flex-col gap-3 sm:mb-3 sm:flex-row sm:items-center sm:justify-between lg:block">
          <p className="inline-flex w-fit items-center rounded-full bg-purple-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-700">
            Sign In
          </p>
          <SocialProofBadge className="scale-75 origin-left lg:hidden py-1.5 px-3.5 bg-slate-900/5 border-slate-900/10 shadow-none !text-slate-900" />
        </div>

        <h1 className="font-zain text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Welcome back
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
          Log in to continue monitoring your channels and opportunities.
        </p>
      </div>

      {/* Error Feedback Banner */}
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 font-montserrat">
        {/* Email Address */}
        <div>
          <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500" htmlFor="email">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500" htmlFor="password">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-primary-600 hover:text-purple-700"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <label className="inline-flex items-center gap-3 pt-1 cursor-pointer select-none group">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`h-5 w-5 rounded-full border transition-all flex items-center justify-center ${remember
                  ? 'border-purple-600 bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                  : 'border-slate-300 bg-white group-hover:border-purple-400'
                }`}
            >
              {remember && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
          </div>
          <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
            Keep me signed in
          </span>
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-sweep group mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-purple-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
        >
          <span>{loading ? 'Signing in...' : 'Sign in to dashboard'}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* OR Divider */}
        <div className="relative py-1.5" role="separator">
          <div className="h-px w-full bg-slate-200" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Or
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => {
            window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/google/redirect`;
          }}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>Continue with Google</span>
        </button>
      </form>

      {/* Footer Link */}
      <p className="mt-6 text-center text-sm font-semibold text-slate-500">
        New here?{' '}
        <Link href="/register" className="font-black text-primary-600 hover:text-purple-700">
          Create your account
        </Link>
      </p>
    </div>
  );
}
