import Button from '@/Components/Button';
import InputError from '@/Components/InputError';
import { CheckCircle2, Instagram, Link2, MessageSquare } from 'lucide-react';
import Icon from '@/Components/Icon';

const DESKTOP_BANNER_SRC = '/images/empty-states/instagram-not-connected-desktop.png';
const MOBILE_BANNER_SRC = '/images/empty-states/instagram-not-connected-mobile.png';

export default function NoAccountConnectedState({
    error = null,
    showBackToFlows = true,
    className = '',
    showConnectButton = true,
    upgradeHref = null,
    helperMessage = null,
}) {
    return (
        <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
            <div className="grid gap-6 lg:grid-cols-[1.25fr,0.85fr] lg:gap-8">
                <div className="min-w-0">
                    <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                        <Icon name="wrench" size={14} />
                        Setup Required
                    </p>

                    <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-pink-200 bg-pink-50 shadow-sm">
                            <Instagram className="h-7 w-7 text-pink-600" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                                Connect Instagram to start Automation
                            </h3>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                                AutoDM needs one connected Instagram account before you can deploy flows. Once connected, you can set keywords, replies, and CTA steps in this builder.
                            </p>
                        </div>
                    </div>

                    <InputError message={error} className="mt-4" />
                    {helperMessage && (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                            {helperMessage}
                        </p>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        {showConnectButton ? (
                            <Button
                                href={route('settings', { tab: 'integration' }, false)}
                                icon={Instagram}
                            >
                                Connect Instagram
                            </Button>
                        ) : (
                            <Button
                                href={upgradeHref || route('settings.upgrade', [], false)}
                                variant="secondary"
                            >
                                Upgrade to connect
                            </Button>
                        )}
                        {showBackToFlows && (
                            <Button
                                href={route('autodm.index', [], false)}
                                variant="outline"
                            >
                                Back to flows
                            </Button>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                    <picture className="mb-4 block overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <source media="(min-width: 768px)" srcSet={DESKTOP_BANNER_SRC} />
                        <img
                            src={MOBILE_BANNER_SRC}
                            alt="Instagram account connection required illustration"
                            className="h-auto w-full object-cover"
                            loading="lazy"
                        />
                    </picture>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        What unlocks after connect
                    </p>
                    <ul className="mt-4 space-y-3">
                        <li className="flex items-start gap-2.5 text-sm text-slate-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span>Select your post, reel, or story as a trigger source.</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-sm text-slate-700">
                            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                            <span>Configure opening message, ask-to-follow, and your reply message.</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-sm text-slate-700">
                            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                            <span>Deploy and track comment-to-DM automation instantly.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
