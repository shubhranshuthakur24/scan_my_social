import { RefreshCw } from 'lucide-react';

export default function AnalyticsHeader({
    selectedAccount = null,
    overview = {},
}) {
    const username = String(selectedAccount?.username || '').replace(/^@+/, '');
    const accountLabel = username !== ''
        ? `@${username}`
        : (selectedAccount?.ig_account_id ? `IG ${selectedAccount.ig_account_id}` : 'No active Instagram account selected');
    const lastSyncedText = overview?.last_synced_at
        ? `Last synced ${new Date(overview.last_synced_at).toLocaleString()}`
        : 'No sync yet for this range';

    return (
        <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{accountLabel}</span>
                <span aria-hidden="true">-</span>
                <span>{lastSyncedText}</span>
            </p>
        </div>
    );
}
