import EmptyState from "@/Components/EmptyState";
import useInstagramSelectedAccount from "@/Components/Instagram/useInstagramSelectedAccount";
import InstagramDisconnectModal from "@/Components/Instagram/InstagramDisconnectModal";
import InstagramDisconnectedHero from "@/Components/Instagram/InstagramDisconnectedHero";
import InstagramNotConnectedEmptyState from "@/Components/Instagram/InstagramNotConnectedEmptyState";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import { Activity, AlertTriangle, CloudSyncIcon, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnalyticsFilters from "./Analytics/AnalyticsFilters";
import AnalyticsHeader from "./Analytics/AnalyticsHeader";
import AnalyticsKpiGrid from "./Analytics/AnalyticsKpiGrid";
import DailyReachChart from "./Analytics/DailyReachChart";
import FormatMixCard from "./Analytics/FormatMixCard";
import { toLocalDateValue } from "./Analytics/helpers";
import InstagramAccountSelector from "@/Components/Instagram/InstagramAccountSelector";

const defaultDateRange = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 29);

    return {
        start: toLocalDateValue(start),
        end: toLocalDateValue(today),
        preset: "last_30_days",
    };
};

const normalizeDateRange = (dateRange = {}) => {
    const fallback = defaultDateRange();
    const preset = String(dateRange?.preset || "custom");

    if (preset === "all_time") {
        return {
            start: "",
            end: "",
            preset: "all_time",
            days: Number(dateRange?.days || 30),
        };
    }

    return {
        start: dateRange?.start !== undefined ? String(dateRange.start) : fallback.start,
        end: dateRange?.end !== undefined ? String(dateRange.end) : fallback.end,
        preset,
        days: Number(dateRange?.days || 30),
    };
};
const buildCanonicalQuery = ({ start, end, instagramAccountId }) => {
    const query = {};
    const normalizedStart = typeof start === 'string' ? start.trim() : '';
    const normalizedEnd = typeof end === 'string' ? end.trim() : '';
    const normalizedAccountId = Number(instagramAccountId || 0);

    if (normalizedStart === '' && normalizedEnd === '') {
        query.start = '';
        query.end = '';
    } else {
        if (normalizedStart !== "") {
            query.start = normalizedStart;
        }
        if (normalizedEnd !== "") {
            query.end = normalizedEnd;
        }
    }

    if (Number.isFinite(normalizedAccountId) && normalizedAccountId > 0) {
        query.instagram_account_id = normalizedAccountId;
    }

    return query;
};

export default function Analytics({
    instagram_accounts = [],
    selected_instagram_account_id = null,
    selected_account = null,
    has_active_account = true,
    disconnectToast = null,
    connected_count = 0,
    can_connect_more = false,
    date_range = {},
    overview = {},
    format_breakdown = [],
    daily_metrics = [],
    daily_metric_details = {},
    last_synced_at = null,
}) {
    const [isSyncingNow, setIsSyncingNow] = useState(false);
    const [chartMetric, setChartMetric] = useState("reach");
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const accountList = Array.isArray(instagram_accounts)
        ? instagram_accounts
        : [];
    const hasActiveAccount =
        Boolean(has_active_account) &&
        accountList.some((account) => account.status === "active");

    useEffect(() => {
        if (!disconnectToast?.message || !disconnectToast?.account_id) {
            return;
        }

        const fingerprint = `${disconnectToast.account_id}:${disconnectToast.updated_at || "unknown"}`;
        const storageKey = `analytics:disconnect-modal:${fingerprint}`;

        try {
            if (window.sessionStorage.getItem(storageKey)) {
                return;
            }

            window.sessionStorage.setItem(storageKey, "1");
        } catch (error) {
            // Ignore storage errors.
        }

        setShowDisconnectModal(true);
    }, [disconnectToast]);

    const effectiveConnectedCount = Number.isFinite(Number(connected_count))
        ? Number(connected_count)
        : accountList.length;
    const accountConnectHref = can_connect_more
        ? route("settings", { tab: "integration" }, false)
        : route("settings.upgrade", [], false);
    const normalizedDateRange = useMemo(
        () => normalizeDateRange(date_range),
        [date_range],
    );
    const serverSelectedAccountId = Number(
        selected_instagram_account_id || selected_account?.id || 0,
    );
    const { selectedAccountId, selectedAccount, selectAccount } =
        useInstagramSelectedAccount({
            accounts: accountList,
            initialSelectedAccountId: serverSelectedAccountId || null,
            preferStored: true,
            requireActive: true,
        });

    const visitWithFilters = useCallback(
        (changes = {}) => {
            const query = buildCanonicalQuery({
                start: changes.start ?? normalizedDateRange.start,
                end: changes.end ?? normalizedDateRange.end,
                instagramAccountId:
                    changes.instagram_account_id ??
                    selectedAccountId ??
                    serverSelectedAccountId,
            });

            router.get(route("instagram.analytics"), query, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        },
        [
            normalizedDateRange.end,
            normalizedDateRange.start,
            selectedAccountId,
            serverSelectedAccountId,
        ],
    );

    const lastRequestedAccountIdRef = useRef(null);

    useEffect(() => {
        if (!hasActiveAccount || !accountList.length) {
            lastRequestedAccountIdRef.current = null;
            return;
        }

        const localSelectedAccountId = Number(selectedAccountId || 0);
        const serverAccountId = Number(serverSelectedAccountId || 0);

        if (
            localSelectedAccountId <= 0 ||
            localSelectedAccountId === serverAccountId
        ) {
            lastRequestedAccountIdRef.current = null;
            return;
        }

        if (lastRequestedAccountIdRef.current === localSelectedAccountId) {
            return;
        }

        lastRequestedAccountIdRef.current = localSelectedAccountId;

        visitWithFilters({ instagram_account_id: localSelectedAccountId });
    }, [
        accountList.length,
        hasActiveAccount,
        selectedAccountId,
        serverSelectedAccountId,
        visitWithFilters,
    ]);

    const syncNow = () => {
        const effectiveAccountId = Number(
            selectedAccountId || serverSelectedAccountId || 0,
        );
        if (isSyncingNow || effectiveAccountId <= 0) {
            return;
        }

        setIsSyncingNow(true);

        router.post(
            route("instagram.analytics.sync"),
            {
                instagram_account_id: effectiveAccountId,
                start: normalizedDateRange.start,
                end: normalizedDateRange.end,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setIsSyncingNow(false);
                },
            },
        );
    };

    const effectiveOverview = {
        ...overview,
        posts: Number(overview?.posts ?? overview?.total_posts ?? 0),
    };
    const hasAnalyticsData =
        Boolean(overview?.has_data) ||
        effectiveOverview.posts > 0 ||
        Number(effectiveOverview.reach || 0) > 0 ||
        Number(effectiveOverview.impressions || 0) > 0 ||
        Number(effectiveOverview.engagement || 0) > 0;

    return (
        <AuthenticatedLayout
            topbarTitle="Growth Analytics"
            topbarDescription="Review Instagram account performance by account and date range."
            moduleTabsAction={
                hasActiveAccount && Boolean(selectedAccountId || serverSelectedAccountId) ? (
                    <button
                        type="button"
                        onClick={syncNow}
                        disabled={isSyncingNow}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-normal text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Sync analytics now"
                    >
                        {isSyncingNow ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <CloudSyncIcon className="h-4 w-4" />
                        )}
                        {isSyncingNow ? "Syncing..." : "Sync now"}
                    </button>
                ) : null
            }
        >
            <Head title="Scheduler Analytics" />

            <div className="mx-auto max-w-[1280px] space-y-5">
                {!hasActiveAccount ? (
                    accountList.length === 0 && !disconnectToast?.account_id ? (
                        <InstagramNotConnectedEmptyState
                            description="Connect an Instagram account first to view audience, growth, and post performance analytics."
                            connectHref={accountConnectHref}
                        />
                    ) : (
                        <InstagramDisconnectedHero
                            username={
                                disconnectToast?.username ||
                                selectedAccount?.username ||
                                accountList[0]?.username
                            }
                            reconnectAccountId={
                                disconnectToast?.account_id ||
                                selectedAccountId ||
                                accountList[0]?.id
                            }
                            actionText="view performance and post analytics"
                        />
                    )
                ) : (
                    <>
                        <InstagramAccountSelector
                            accounts={accountList}
                            selectedAccountId={selectedAccountId}
                            connectedCount={effectiveConnectedCount}
                            maxCards={5}
                            canConnectMore={can_connect_more}
                            connectHref={accountConnectHref}
                            onSelect={selectAccount}
                        />
                        <div className="bg-white rounded-2xl shadow-sm   p-5 xl:p-4">
                            <div className="space-y-4">
                                <AnalyticsKpiGrid
                                    overview={effectiveOverview}
                                />
                                <AnalyticsFilters
                                    dateRange={normalizedDateRange}
                                    onApply={(start, end) =>
                                        visitWithFilters({ start, end })
                                    }
                                />
                            </div>
                        </div>
                        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
                            <DailyReachChart
                                dailyMetrics={daily_metrics}
                                dailyMetricDetails={daily_metric_details}
                                metric={chartMetric}
                                onMetricChange={setChartMetric}
                                hasData={hasAnalyticsData}
                                onSyncNow={syncNow}
                                lastSyncedAt={last_synced_at}
                            />

                            <div className="space-y-5">
                                <FormatMixCard
                                    formatBreakdown={format_breakdown}
                                />
                            </div>
                        </section>
                    </>
                )}
            </div>

            {disconnectToast?.account_id && (
                <InstagramDisconnectModal
                    show={showDisconnectModal}
                    onClose={() => setShowDisconnectModal(false)}
                    username={disconnectToast.username || null}
                    accountId={disconnectToast.account_id}
                />
            )}
        </AuthenticatedLayout>
    );
}
