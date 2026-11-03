'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  getUserInstagramIntegrations,
  toggleInstagramWelcomeDm,
  updateInstagramWelcomeDmMessages,
  disconnectInstagramAccount,
  getInstagramConnectUrl,
} from '@/lib/api/instagramService';
import {
  Camera,
  ExternalLink,
  Plus,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Info,
  Lock,
  Trash2,
  X,
} from 'lucide-react';

interface InstagramIntegrationCardProps {
  onToast: (msg: string) => void;
}

export default function InstagramIntegrationCard({ onToast }: InstagramIntegrationCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [limitMeta, setLimitMeta] = useState<any>({
    connectedCount: 0,
    accountLimit: 1,
    canConnectMore: true,
    hasPaidPlan: true,
    activePlanTier: 'Pro',
  });

  const [selectedWelcomeAccount, setSelectedWelcomeAccount] = useState<any>(null);
  const [variantInputs, setVariantInputs] = useState<string[]>(['', '', '']);
  const [isSavingWelcomeDm, setIsSavingWelcomeDm] = useState(false);
  const [selectedDisconnectAccount, setSelectedDisconnectAccount] = useState<any | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [togglingAccountIds, setTogglingAccountIds] = useState<Set<string>>(new Set());

  const loadIntegrationsData = async () => {
    try {
      setIsLoading(true);
      const data = await getUserInstagramIntegrations();
      setConnectedAccounts(data.accounts || []);
      setLimitMeta(
        data.limitMeta || {
          connectedCount: 0,
          accountLimit: 1,
          canConnectMore: true,
          hasPaidPlan: false,
          activePlanTier: 'Free',
        }
      );
    } catch (err: any) {
      onToast(err.message || 'Failed to load Instagram integrations data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrationsData();
  }, []);

  const handleToggleWelcomeDm = async (account: any) => {
    if (account.status !== 'active') {
      onToast(`Account @${account.username} is disconnected. Please reconnect first to enable Welcome DM.`);
      return;
    }

    const currentlyEnabled = Boolean(account.welcomeDmEnabled);

    // SMS Workflow: If currently OFF, open the 3-variant modal so user can configure & enable
    if (!currentlyEnabled) {
      handleOpenWelcomeDmModal(account);
      return;
    }

    // If currently ON, disable directly via API
    if (togglingAccountIds.has(account.id)) return;
    setTogglingAccountIds((prev) => new Set(prev).add(account.id));

    try {
      const res = await toggleInstagramWelcomeDm(account.id);
      setConnectedAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, welcomeDmEnabled: res.welcomeDmEnabled } : a))
      );
      onToast(`Welcome DM disabled for @${account.username}`);
    } catch (err: any) {
      onToast(err.message || 'Failed to disable Welcome DM status');
    } finally {
      setTogglingAccountIds((prev) => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
    }
  };

  const handleOpenWelcomeDmModal = (account: any) => {
    if (account.status !== 'active') {
      onToast(`Account @${account.username} is disconnected. Please reconnect first to edit message variants.`);
      return;
    }

    setSelectedWelcomeAccount(account);
    const existing = account.welcomeDmVariants || [];
    setVariantInputs([
      existing[0] || 'Thanks for following! Check out our AI video growth tools.',
      existing[1] || 'Welcome aboard! Reply anytime if you have any questions.',
      existing[2] || 'Glad to connect! Check out our latest viral script generator.',
    ]);
  };

  const handleSaveWelcomeDmVariants = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWelcomeAccount) return;

    setIsSavingWelcomeDm(true);
    try {
      const res = await updateInstagramWelcomeDmMessages(selectedWelcomeAccount.id, variantInputs);
      setConnectedAccounts((prev) =>
        prev.map((a) =>
          a.id === selectedWelcomeAccount.id
            ? { ...a, welcomeDmEnabled: true, welcomeDmVariants: res.welcomeDmVariants || variantInputs }
            : a
        )
      );
      setSelectedWelcomeAccount(null);
      onToast(`Welcome DM enabled with 3 message variants for @${selectedWelcomeAccount.username}!`);
    } catch (err: any) {
      onToast(err.message || 'Failed to save Welcome DM variants');
    } finally {
      setIsSavingWelcomeDm(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    if (!selectedDisconnectAccount) return;

    setIsDisconnecting(true);
    try {
      await disconnectInstagramAccount(selectedDisconnectAccount.id);
      setConnectedAccounts((prev) =>
        prev.map((a) => (a.id === selectedDisconnectAccount.id ? { ...a, status: 'disconnected', welcomeDmEnabled: false } : a))
      );
      onToast(`Disconnected @${selectedDisconnectAccount.username} from Scan My Social.`);
      setSelectedDisconnectAccount(null);
    } catch (err: any) {
      onToast(err.message || 'Failed to disconnect account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
      {/* Header section with Connect button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Instagram Account Integrations</h3>
            <p className="text-xs text-slate-500">
              Connect Meta Business Graph accounts for automated Comment-to-DM & Lead magnet triggers
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!limitMeta.canConnectMore}
          onClick={async () => {
            if (limitMeta.canConnectMore) {
              try {
                onToast('Requesting Meta OAuth 2.0 authorization...');
                const data = await getInstagramConnectUrl();
                if (data.url) {
                  onToast('Redirecting to Meta OAuth 2.0...');
                  window.location.href = data.url;
                }
              } catch (err: any) {
                onToast(err.message || 'Failed to initiate Meta OAuth connection.');
              }
            } else {
              onToast('Plan limit reached. Please upgrade your subscription to connect more accounts.');
            }
          }}
          icon={limitMeta.canConnectMore ? <Plus size={14} /> : <Lock size={14} />}
          className={
            limitMeta.canConnectMore
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-none shadow-md shadow-pink-500/20 shrink-0'
              : 'shrink-0'
          }
        >
          {limitMeta.canConnectMore ? 'Connect Instagram Account' : 'Connect Locked'}
        </Button>
      </div>

      {/* Connection Quota Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-black uppercase tracking-wide text-slate-700">
          Connected {limitMeta.connectedCount ?? connectedAccounts.length} / {limitMeta.accountLimit || 1} Accounts
        </span>
        {!limitMeta.hasPaidPlan && (
          <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
            Paid plan required for new connections
          </span>
        )}
        {limitMeta.hasPaidPlan && !limitMeta.canConnectMore && (
          <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-black text-amber-600">
            Plan limit reached — Upgrade for more accounts
          </span>
        )}
      </div>

      {/* Connected Accounts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <RefreshCw className="mx-auto text-primary-600 animate-spin" size={24} />
            <p className="text-xs font-bold text-slate-700 mt-2">Loading Connected Instagram Accounts...</p>
          </div>
        ) : connectedAccounts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <Camera className="mx-auto text-slate-300" size={36} />
            <div>
              <p className="text-xs font-bold text-slate-700">No Accounts Connected</p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                Connect your Instagram Business or Creator account to start using automated Comment-to-DM, Welcome DMs, and scheduling features.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                try {
                  onToast('Requesting Meta OAuth 2.0 authorization...');
                  const data = await getInstagramConnectUrl();
                  if (data.url) {
                    onToast('Redirecting to Meta OAuth 2.0...');
                    window.location.href = data.url;
                  }
                } catch (err: any) {
                  onToast(err.message || 'Failed to initiate Meta OAuth connection.');
                }
              }}
              icon={<ExternalLink size={14} />}
            >
              Authorize via Meta Graph API
            </Button>
          </div>
        ) : (
          connectedAccounts.map((account) => {
            const isActive = account.status === 'active';
            const welcomeEnabled = Boolean(account.welcomeDmEnabled);
            const hasVariants = account.welcomeDmVariants && account.welcomeDmVariants.length > 0;

            return (
              <div
                key={account.id}
                className="p-6 rounded-3xl border border-slate-200/80 bg-white grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-2xs"
              >
                {/* Left Column: Account Profile Details & Quick Actions */}
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-start gap-4">
                    {/* Avatar with Gradient Ring & IG Badge */}
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-xs">
                        <div className="w-full h-full bg-white rounded-full p-0.5 overflow-hidden">
                          {account.avatar || account.profile_picture_url ? (
                            <img
                              src={account.avatar || account.profile_picture_url}
                              alt={account.username}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <Camera className="w-full h-full p-2.5 text-pink-600" />
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 border-2 border-white flex items-center justify-center text-white shadow-xs">
                        <Camera size={10} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900 truncate">@{account.username}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isActive
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80'
                            : 'bg-amber-50 text-amber-600 border border-amber-200/80'
                            }`}
                        >
                          <CheckCircle2 size={11} />
                          <span>{isActive ? 'Connected' : 'Disconnected'}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Instagram Business Account</p>
                      <p className="text-xs text-slate-700 font-bold">{account.followers || 0} followers</p>
                      <a
                        href={account.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-purple-700 pt-0.5"
                      >
                        <span>Visit Profile</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          onToast(`Re-connecting @${account.username}...`);
                          const data = await getInstagramConnectUrl(account.id);
                          if (data.url) {
                            window.location.href = data.url;
                          }
                        } catch (err: any) {
                          onToast(err.message || 'Failed to initiate Meta OAuth connection.');
                        }
                      }}
                      icon={<RefreshCw size={13} />}
                      className="text-xs"
                    >
                      Reconnect
                    </Button>

                    {isActive && (
                      <button
                        type="button"
                        onClick={() => setSelectedDisconnectAccount(account)}
                        className="bg-rose-50/70 hover:bg-rose-100/70 border border-rose-100/80 rounded-2xl p-2 px-3 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                      >
                        <div className="w-8 h-8 rounded-xl bg-rose-100/90 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/50">
                          <Trash2 size={14} />
                        </div>
                        <div className="leading-tight">
                          <h6 className="text-xs font-bold text-rose-600">Disconnect Account</h6>
                          <p className="text-[10px] font-medium text-rose-400">Remove this account</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Middle Vertical Separator Line (Hidden on Mobile, Visible on Desktop) */}
                <div className="hidden md:flex justify-center md:col-span-1 h-full">
                  <div className="w-px bg-slate-100 h-full min-h-[120px]" />
                </div>

                {/* Right Column: Automation Section */}
                <div className="md:col-span-6 space-y-3">
                  {/* Automation Header with Info Icon */}
                  <div className="flex items-center gap-1.5 text-slate-900">
                    <h4 className="text-xs font-black text-slate-900 tracking-tight">Automation</h4>
                    <div
                      title="Automated direct message response triggers for new Instagram followers"
                      className="cursor-help text-slate-400 hover:text-slate-600"
                    >
                      <Info size={14} />
                    </div>
                  </div>

                  {/* Welcome DM Row (Title & Subtitle + Toggle Switch) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <h5 className="text-xs font-bold text-slate-900">Welcome DM</h5>

                      {/* iOS-Style Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleWelcomeDm(account)}
                        disabled={!isActive || togglingAccountIds.has(account.id)}
                        title={
                          !isActive
                            ? 'Account disconnected — Reconnect account to enable Welcome DM'
                            : welcomeEnabled
                              ? 'Turn OFF Welcome DM'
                              : 'Turn ON Welcome DM'
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-hidden ${!isActive
                          ? 'bg-slate-200 cursor-not-allowed opacity-60'
                          : welcomeEnabled
                            ? 'bg-purple-600 cursor-pointer'
                            : 'bg-slate-300 cursor-pointer'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${welcomeEnabled && isActive ? 'translate-x-5.5' : 'translate-x-0.5'
                            }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Automatically reply to new conversations</p>
                  </div>

                  {/* Sub-Card Box */}
                  <div className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${!isActive ? 'bg-rose-50/40 border-rose-100/80' : 'bg-purple-50/40 border-purple-100/60'
                    }`}>
                    <div className="text-xs text-slate-600">
                      {!isActive ? (
                        <div className="flex items-center gap-2 text-rose-600 font-bold">
                          <AlertTriangle size={13} className="shrink-0" />
                          <span>Account Disconnected — Automations Paused</span>
                        </div>
                      ) : hasVariants ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-800">
                            {account.welcomeDmVariants.length} message variant{account.welcomeDmVariants.length > 1 ? 's' : ''} configured
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">No message variants configured</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenWelcomeDmModal(account)}
                      disabled={!isActive}
                      title={!isActive ? 'Account disconnected — Reconnect first' : undefined}
                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-2xs shrink-0 ${!isActive
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                        : 'bg-white text-primary-600 hover:text-purple-700 hover:bg-purple-50 border border-purple-200/80 cursor-pointer'
                        }`}
                    >
                      <Plus size={13} />
                      <span>{hasVariants ? 'Edit Messages' : 'Add Message'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Graph API Help Guidance Card */}
      <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-white text-primary-600 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <HelpCircle size={18} />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-900">How Meta Instagram Graph API Integrations Work</h4>
          <p className="text-slate-600 leading-relaxed">
            Connecting your account grants Scan My Social permission to monitor comments and send automated direct messages via Meta webhooks.
            Re-connecting is occasionally required if permissions expire (typically every 60 days).
          </p>
        </div>
      </div>

      {/* 3-Variant Welcome DM Modal */}
      {selectedWelcomeAccount && (
        <Modal
          isOpen={Boolean(selectedWelcomeAccount)}
          onClose={() => setSelectedWelcomeAccount(null)}
          title={`Randomized Welcome DM Variants — @${selectedWelcomeAccount.username}`}
        >
          <form onSubmit={handleSaveWelcomeDmVariants} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">
              Provide up to 3 randomized message variants for new followers. Scan My Social rotates these variants automatically to ensure natural engagement and prevent Meta spam detection.
            </p>

            {[0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                    Message Variant {idx + 1}
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    {variantInputs[idx]?.length || 0} / 500
                  </span>
                </div>
                <textarea
                  value={variantInputs[idx] || ''}
                  onChange={(e) => {
                    const next = [...variantInputs];
                    next[idx] = e.target.value;
                    setVariantInputs(next);
                  }}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder={`Write Welcome DM variant ${idx + 1}...`}
                />
              </div>
            ))}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setSelectedWelcomeAccount(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingWelcomeDm}
                icon={isSavingWelcomeDm ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              >
                {isSavingWelcomeDm ? 'Saving Variants...' : 'Save & Enable Welcome DM'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Disconnect Account Safety Modal */}
      {selectedDisconnectAccount && (
        <Modal
          isOpen={Boolean(selectedDisconnectAccount)}
          onClose={() => setSelectedDisconnectAccount(null)}
          title="Disconnect Instagram Account?"
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-start gap-3">
              <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
              <div className="text-xs text-rose-800 space-y-1">
                <p className="font-bold">Revoke Meta Graph API Access?</p>
                <p>
                  Disconnecting <strong className="font-bold">@{selectedDisconnectAccount.username}</strong> will immediately pause active Comment-to-DM triggers, Welcome DMs, and scheduled Reel publishing.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setSelectedDisconnectAccount(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={isDisconnecting}
                onClick={handleConfirmDisconnect}
                icon={<Trash2 size={14} />}
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
