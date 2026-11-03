import { useState } from 'react';
import { LoaderCircle, Zap } from 'lucide-react';

export default function InstagramDisconnectedHero({
    username = null,
    reconnectAccountId = null,
    actionText = 'continue',
    className = '',
}) {
    const [isConnecting, setIsConnecting] = useState(false);

    const displayUsername = username
        ? `@${String(username).replace(/^@+/, '')}`
        : 'your Instagram account';

    const reconnectHref = reconnectAccountId
        ? route('social-integrations.instagram.connect', { reconnect_account_id: reconnectAccountId })
        : route('settings', { tab: 'integration' }, false);

    const manageHref = route('settings', { tab: 'integration' }, false);

    const handleConnectClick = () => {
        setIsConnecting(true);
    };

    return (
        <section className={`overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm ${className}`.trim()}>
            <div className="bg-amber-50/60 px-6 py-8 text-center sm:px-8 sm:py-10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
                    <Zap className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    Instagram Account Disconnected
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-600">
                    ScanMySocial is no longer authorized to connect to{' '}
                    <span className="font-bold text-slate-800">{displayUsername}</span>{' '}
                    because the connection has expired or been revoked. Reconnect your account to {actionText}.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <a
                        href={reconnectHref}
                        onClick={handleConnectClick}
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-primary-700 hover:scale-[1.01] active:scale-95 ${
                            isConnecting ? 'pointer-events-none opacity-85 cursor-wait' : ''
                        }`.trim()}
                        aria-busy={isConnecting}
                    >
                        {isConnecting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        {isConnecting ? 'Redirecting to Instagram...' : 'Fix Now'}
                    </a>
                    <a
                        href={manageHref}
                        className={`inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 ${
                            isConnecting ? 'pointer-events-none opacity-60' : ''
                        }`.trim()}
                    >
                        Manage Integrations
                    </a>
                </div>
            </div>
        </section>
    );
}
