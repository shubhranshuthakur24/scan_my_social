import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import Icon from '@/Components/Icon';
import { Instagram, ArrowLeftRight, LoaderCircle } from 'lucide-react';

/**
 * Premium overlay modal displayed when an Instagram account is disconnected.
 * Guides the user to re-authorize via Facebook Login for Business.
 *
 * @param {{
 *   show: boolean,
 *   onClose: () => void,
 *   username: string|null,
 *   accountId: number,
 * }} props
 */
export default function InstagramDisconnectModal({
    show,
    onClose,
    username,
    accountId,
}) {
    const [isConnecting, setIsConnecting] = useState(false);

    const reconnectUrl = route('social-integrations.instagram.connect', {
        reconnect_account_id: accountId,
    });

    const displayUsername = username ? `@${username.replace(/^@+/, '')}` : 'your Instagram account';

    return (
        <Modal show={show} onClose={onClose} maxWidth="md" closeable={true}>
            <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8">
                {/* Background soft glow gradient */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-purple-50/50 via-white to-pink-50/50" />

                {/* Top header row with Brand Logo */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img
                            src="/images/logo.webp"
                            alt="ScanMySocial Logo"
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
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
                        className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors ${
                            isConnecting ? 'pointer-events-none opacity-40' : ''
                        }`.trim()}
                        aria-label="Close modal"
                    >
                        <Icon name="x" size={4} />
                    </button>
                </div>

                {/* Main Heading */}
                <h2 className="mb-6 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl leading-tight">
                    ScanMySocial is no longer authorized to connect to{' '}
                    <span className="text-primary-600">{displayUsername}</span>
                </h2>

                {/* Visual swap connection element */}
                <div className="mb-8 flex items-center justify-center gap-5">
                    {/* ScanMySocial Logo container */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-100 animate-pulse">
                        <img
                            src="/images/logo.webp"
                            alt="ScanMySocial Logo"
                            className="h-10 w-10 object-contain"
                            onError={(e) => {
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
                        <Instagram className="h-10 w-10" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Primary & Secondary Action Buttons */}
                <div className="flex flex-col gap-3">
                    <a
                        href={reconnectUrl}
                        onClick={() => setIsConnecting(true)}
                        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-700 hover:scale-[1.01] active:scale-95 ${
                            isConnecting ? 'pointer-events-none opacity-85 cursor-wait' : ''
                        }`.trim()}
                        aria-busy={isConnecting}
                    >
                        {isConnecting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        {isConnecting ? 'Redirecting to Instagram...' : 'Fix Now'}
                    </a>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isConnecting}
                        className={`flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 ${
                            isConnecting ? 'pointer-events-none opacity-50' : ''
                        }`.trim()}
                    >
                        Maybe Later
                    </button>
                </div>

                {/* Footnotes / Instructions */}
                <div className="mt-8 space-y-3 border-t border-slate-100 pt-5 text-center text-xs leading-relaxed text-slate-500">
                    <p className="font-semibold text-slate-600">
                        Please click "Fix Now" to re-enable automation.
                    </p>
                    <p>
                        If you have any questions or you're not sure why you're receiving this, contact at{' '}
                        <a href="mailto:contact@scanmysocial.com" className="font-semibold text-primary-600 hover:underline">
                            contact@scanmysocial.com
                        </a>
                        .
                    </p>
                    <p className="font-semibold text-slate-600">We're happy to help.</p>
                </div>
            </div>
        </Modal>
    );
}
