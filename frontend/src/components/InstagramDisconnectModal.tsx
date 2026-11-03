'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { ArrowLeftRight, Loader2, X } from 'lucide-react';
import { getInstagramConnectUrl } from '@/lib/api/instagramService';

interface InstagramDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string | null;
  accountId?: string | null;
}

export default function InstagramDisconnectModal({
  isOpen,
  onClose,
  username,
  accountId,
}: InstagramDisconnectModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const displayUsername = username
    ? `@${username.replace(/^@+/, '')}`
    : 'your Instagram account';

  const handleFixNow = async () => {
    setIsConnecting(true);
    try {
      const data = await getInstagramConnectUrl(accountId || undefined);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to initiate Instagram reconnection', err);
      setIsConnecting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeable={!isConnecting}
    >
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8">
        {/* Background soft glow gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-purple-50/60 via-white to-pink-50/60" />

        {/* Top header row with Brand Logo */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo.webp"
              alt="ScanMySocial Logo"
              className="h-8 w-8 object-contain"
              onError={(e: any) => {
                e.target.src = '/images/logo.png';
              }}
            />
            <span className="text-sm font-black tracking-tight text-slate-900">
              scanmysocial
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isConnecting}
            className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer ${isConnecting ? 'pointer-events-none opacity-40' : ''
              }`}
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Heading */}
        <h2 className="mb-6 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl leading-tight">
          ScanMySocial is no longer authorized to connect to{' '}
          <span className="text-primary-600 font-black">{displayUsername}</span>
        </h2>

        {/* Visual swap connection element */}
        <div className="mb-8 flex items-center justify-center gap-5">
          {/* ScanMySocial Logo container */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-100 animate-pulse">
            <img
              src="/images/logo.webp"
              alt="ScanMySocial Logo"
              className="h-10 w-10 object-contain"
              onError={(e: any) => {
                e.target.src = '/images/logo.png';
              }}
            />
          </div>

          {/* Swap arrows */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <ArrowLeftRight className="h-4 w-4" />
          </div>

          {/* Instagram Logo container */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 text-white shadow-md">
            <svg className="h-10 w-10 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </div>
        </div>

        {/* Primary & Secondary Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleFixNow}
            disabled={isConnecting}
            className={`btn-sweep flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-sm font-bold text-white shadow-md transition-all hover:bg-purple-700 hover:scale-[1.01] active:scale-95 cursor-pointer ${isConnecting ? 'pointer-events-none opacity-85 cursor-wait' : ''
              }`}
          >
            {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isConnecting ? 'Redirecting to Instagram...' : 'Fix Now'}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isConnecting}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            Maybe Later
          </button>
        </div>

        {/* Footnotes / Instructions */}
        <div className="mt-8 space-y-3 border-t border-slate-100 pt-5 text-center text-xs leading-relaxed text-slate-500">
          <p className="font-semibold text-slate-600">
            Please click &quot;Fix Now&quot; to re-enable automation.
          </p>
          <p>
            If you have any questions or you&apos;re not sure why you&apos;re receiving this, contact at{' '}
            <a href="mailto:contact@scanmysocial.com" className="font-semibold text-primary-600 hover:underline">
              contact@scanmysocial.com
            </a>
            .
          </p>
          <p className="font-semibold text-slate-600">We&apos;re happy to help.</p>
        </div>
      </div>
    </Modal>
  );
}
