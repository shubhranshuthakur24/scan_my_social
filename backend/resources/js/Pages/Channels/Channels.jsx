import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
    useDeferredValue,
} from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router, Deferred } from "@inertiajs/react";
import axios from "axios";
import ChannelDetailModal from "@/Components/ChannelDetailModal";
import WatchlistEditModal from "@/Components/WatchlistEditModal";
import ConfirmDialog from "@/Components/common/ConfirmDialog";
import PageBanner from "@/Components/common/PageBanner";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import useMediaQuery from "@/Hooks/useMediaQuery";
import { useToast } from "@/Contexts/ToastContext";
import ChannelsHeaderActions from "@/Pages/Channels/Partials/ChannelsHeaderActions";
import ChannelsGrid from "@/Pages/Channels/Partials/ChannelsGrid";
import WatchlistsSidebar from "@/Pages/Channels/Partials/WatchlistsSidebar";
import WatchlistCreateModal from "@/Components/Channels/WatchlistCreateModal";
import Button from "@/Components/Button";
import { Plus } from "lucide-react";
import CompetitorStatsBar from "@/Pages/Channels/Partials/CompetitorStatsBar";
import WatchlistTabStrip from "@/Pages/Channels/Partials/WatchlistTabStrip";

export default function Channels({
    channels,
    watchlists: serverWatchlists,
    untrackPolicy = null,
    untrackLimit = untrackPolicy?.limit ?? 5,
    untrackCount: initialUntrackCount = untrackPolicy?.used ?? 0,
    untrackRemaining: initialUntrackRemaining = untrackPolicy?.remaining ?? 5,
}) {
    const { addToast } = useToast();
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const searchRef = useRef(null);
    const filterRef = useRef(null);
    const [watchlists, setWatchlists] = useState(serverWatchlists || []);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [selectedWatchlist, setSelectedWatchlist] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(!channels);

    const [showFilter, setShowFilter] = useState(false);
    const [selectedPlatforms] = useState(["instagram", "youtube", "linkedin"]);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [activeWatchlistId, setActiveWatchlistId] = useState(null);
    const [channelActionDialog, setChannelActionDialog] = useState(null);
    const [isChannelActionLoading, setIsChannelActionLoading] = useState(false);
    const [channelActionChannelId, setChannelActionChannelId] = useState(null);
    const [recentlyTrackedIds, setRecentlyTrackedIds] = useState([]);
    const [untrackCount, setUntrackCount] = useState(
        Number(initialUntrackCount) || 0,
    );
    const [untrackRemaining, setUntrackRemaining] = useState(
        Number(initialUntrackRemaining) || 0,
    );
    const [availableChannels, setAvailableChannels] = useState(
        Array.isArray(channels?.data) ? channels.data : [],
    );
    const deferredSearch = useDeferredValue(search);

    const normalizeChannelSearchQuery = useCallback((rawValue) => {
        const raw = String(rawValue || "").trim();
        if (!raw) {
            return "";
        }

        const hasProtocol = /^https?:\/\//i.test(raw);
        const looksLikeInstagramUrl =
            /^www\.instagram\.com\//i.test(raw) ||
            /^instagram\.com\//i.test(raw) ||
            raw.toLowerCase().includes("instagram.com/");

        if (hasProtocol || looksLikeInstagramUrl) {
            try {
                const parsedUrl = new URL(hasProtocol ? raw : `https://${raw}`);
                const firstPathSegment = parsedUrl.pathname
                    .split("/")
                    .map((segment) => segment.trim())
                    .filter(Boolean)[0];

                if (firstPathSegment) {
                    return firstPathSegment.replace(/^@+/, "").trim();
                }
            } catch (error) {
                return raw;
            }

            return raw;
        }

        const normalizedDirectValue = raw
            .split(/[?#]/)[0]
            .replace(/^@+/, "")
            .replace(/\/+$/g, "")
            .trim();

        return normalizedDirectValue || raw;
    }, []);

    const normalizedSearchQuery = useMemo(
        () => normalizeChannelSearchQuery(deferredSearch),
        [deferredSearch, normalizeChannelSearchQuery],
    );

    const filteredChannels = useMemo(() => {
        const searchTerm = deferredSearch.toLowerCase().trim();
        const normalizedTerm = normalizedSearchQuery.toLowerCase();
        const channelList = Array.isArray(availableChannels)
            ? availableChannels
            : [];

        // Build a Set of channel IDs in the active watchlist (mobile tab strip).
        let watchlistChannelIds = null;
        if (activeWatchlistId !== null) {
            const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId);
            if (activeWatchlist) {
                watchlistChannelIds = new Set(
                    (activeWatchlist.channels || []).map((c) => c.id),
                );
            }
        }

        return channelList.filter((c) => {
            const handle = (c.handle || "").toLowerCase();
            const name = (c.name || "").toLowerCase();

            // Match against raw search (for partial name/handle matches)
            // or match against normalized handle (for URL/exact handle matches)
            const matchesSearch =
                handle.includes(searchTerm) ||
                name.includes(searchTerm) ||
                (normalizedTerm && handle === normalizedTerm);

            const matchesPlatform = selectedPlatforms.includes(c.platform);
            const matchesWatchlist =
                watchlistChannelIds === null || watchlistChannelIds.has(c.id);

            return matchesSearch && matchesPlatform && matchesWatchlist;
        });
    }, [
        availableChannels,
        deferredSearch,
        normalizedSearchQuery,
        selectedPlatforms,
        activeWatchlistId,
        watchlists,
    ]);

    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const isXl = useMediaQuery("(min-width: 1280px)");
    const isLg = useMediaQuery("(min-width: 1024px)");
    const isSm = useMediaQuery("(min-width: 640px)");

    const columnCount = useMemo(() => {
        if (isXl) return 3;
        if (isLg) return 2;
        if (isSm) return 2;
        return 1;
    }, [isXl, isLg, isSm]);

    const rows = useMemo(() => {
        const result = [];
        for (let i = 0; i < filteredChannels.length; i += columnCount) {
            result.push(filteredChannels.slice(i, i + columnCount));
        }
        return result;
    }, [filteredChannels, columnCount]);

    const gridRef = useRef(null);
    const CHANNEL_CARD_HEIGHT = 72;
    const CHANNEL_ROW_GAP = 20;
    const CHANNEL_VIRTUAL_ROW_ESTIMATE = CHANNEL_CARD_HEIGHT + CHANNEL_ROW_GAP;

    const virtualizer = useWindowVirtualizer({
        count: rows.length,
        estimateSize: () => CHANNEL_VIRTUAL_ROW_ESTIMATE,
        overscan: 5,
        scrollMargin: gridRef.current?.offsetTop ?? 0,
    });

    const fetchWatchlists = useCallback(async () => {
        try {
            const response = await axios.get("/api/watchlists");
            setWatchlists(response.data);
        } catch (error) {
            console.error("Error fetching watchlists:", error);
        }
    }, []);

    const fetchChannels = useCallback(
        async (url = "/api/channels", append = false) => {
            try {
                const response = await axios.get(url);
                const payload = response?.data ?? {};
                const responseChannels = Array.isArray(payload?.data)
                    ? payload.data
                    : Array.isArray(payload?.channels?.data)
                      ? payload.channels.data
                      : Array.isArray(payload?.channels)
                        ? payload.channels
                        : [];

                if (append) {
                    setAvailableChannels((prev) => {
                        const previousChannels = Array.isArray(prev)
                            ? prev
                            : [];
                        const existingIds = new Set(
                            previousChannels.map((c) => c?.id).filter(Boolean),
                        );
                        const newChannels = responseChannels.filter(
                            (c) => c?.id && !existingIds.has(c.id),
                        );

                        return [...previousChannels, ...newChannels];
                    });
                } else {
                    setAvailableChannels(responseChannels);
                }

                setNextPageUrl(
                    payload?.next_page_url ??
                        payload?.channels?.next_page_url ??
                        null,
                );
            } catch (error) {
                console.error("Error fetching channels:", error);
            }
        },
        [],
    );

    useEffect(() => {
        if (channels) {
            const initialChannels = Array.isArray(channels?.data)
                ? channels.data
                : Array.isArray(channels?.channels?.data)
                  ? channels.channels.data
                  : Array.isArray(channels?.channels)
                    ? channels.channels
                    : [];

            setAvailableChannels(initialChannels);
            setNextPageUrl(
                channels?.next_page_url ??
                    channels?.channels?.next_page_url ??
                    null,
            );
            setIsLoading(false);
        }
    }, [channels]);

    useEffect(() => {
        if (serverWatchlists) {
            setWatchlists(serverWatchlists);
        }
    }, [serverWatchlists]);

    useEffect(() => {
        setUntrackCount(Number(initialUntrackCount) || 0);
    }, [initialUntrackCount]);

    useEffect(() => {
        setUntrackRemaining(Number(initialUntrackRemaining) || 0);
    }, [initialUntrackRemaining]);

    useEffect(() => {
        const rawSearch = search.trim();
        if (!rawSearch) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            const normalizedQuery = normalizeChannelSearchQuery(rawSearch);
            if (!normalizedQuery) {
                setSearchResults([]);
                setShowSearchDropdown(false);
                return;
            }

            setSearchLoading(true);
            try {
                const res = await axios.get("/api/channels/search", {
                    params: { q: normalizedQuery },
                    signal: controller.signal,
                });
                setSearchResults(res.data);
                setShowSearchDropdown(true);
            } catch (e) {
                if (!axios.isCancel(e)) {
                    console.error(e);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setSearchLoading(false);
                }
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [search, normalizeChannelSearchQuery]);

    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSearchDropdown(false);
            }
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setShowFilter(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        const inFlightStatuses = ["QUEUED", "PENDING", "RUNNING"];
        const channelList = Array.isArray(availableChannels)
            ? availableChannels
            : [];

        const hasInFlightChannels = () => {
            return channelList.some(
                (channel) =>
                    inFlightStatuses.includes(
                        channel.apify_profile_run_status,
                    ) ||
                    inFlightStatuses.includes(channel.apify_post_run_status),
            );
        };

        const interval = setInterval(
            () => {
                const isAnyChannelSyncing = hasInFlightChannels();

                if (isAnyChannelSyncing || showSearchDropdown) {
                    fetchChannels();
                }
            },
            hasInFlightChannels() ? 3000 : 10000,
        );

        return () => clearInterval(interval);
    }, [availableChannels, fetchChannels, showSearchDropdown]);

    const handleCreateWatchlist = async (name, onSuccessCallback) => {
        try {
            const response = await axios.post("/api/watchlists", { name });
            const newWatchlist = response?.data ?? null;

            // Auto-attach only when creating from the channel detail flow.
            const shouldAutoAttachChannel = Boolean(
                onSuccessCallback && selectedChannel?.id && newWatchlist?.id,
            );

            if (shouldAutoAttachChannel) {
                try {
                    await axios.post(
                        `/api/watchlists/${newWatchlist.id}/channels`,
                        {
                            channel_id: selectedChannel.id,
                        },
                    );
                    await fetchWatchlists();
                    addToast(
                        `Watchlist "${name}" created and channel added`,
                        "success",
                    );
                    onSuccessCallback?.();
                    return true;
                } catch (error) {
                    console.error(
                        "Error adding channel to new watchlist:",
                        error,
                    );
                    await fetchWatchlists();
                    addToast(
                        "Watchlist created, but failed to add channel",
                        "warning",
                    );
                    return false;
                }
            }

            await fetchWatchlists();
            addToast(`Watchlist "${name}" created`, "success");
            onSuccessCallback?.();
            return true;
        } catch (error) {
            console.error("Error creating watchlist:", error);
            addToast("Failed to create watchlist", "error");
            return false;
        }
    };

    const handleEditWatchlist = (id, newName) => {
        router.put(
            `/api/watchlists/${id}`,
            { name: newName },
            {
                onSuccess: () => {
                    fetchWatchlists();
                    addToast(`Watchlist renamed to "${newName}"`, "success");
                },
                onError: (err) => {
                    console.error("Error editing watchlist:", err);
                    addToast("Failed to rename watchlist", "error");
                },
            },
        );
    };

    const handleDeleteWatchlist = async (id) => {
        setDeleteConfirm(id);
    };

    const confirmDelete = () => {
        if (!deleteConfirm) return;
        router.delete(`/api/watchlists/${deleteConfirm}`, {
            onSuccess: () => {
                fetchWatchlists();
                setDeleteConfirm(null);
                addToast("Watchlist deleted", "success");
            },
            onError: (err) => {
                console.error("Error deleting watchlist:", err);
                setDeleteConfirm(null);
                addToast("Failed to delete watchlist", "error");
            },
        });
    };

    const handleAddToWatchlist = (watchlistId, onSuccessCallback) => {
        if (!watchlistId) {
            console.error("No watchlist selected");
            return;
        }

        router.post(
            `/api/watchlists/${watchlistId}/channels`,
            {
                channel_id: selectedChannel.id,
            },
            {
                onSuccess: () => {
                    fetchWatchlists();
                    fetchChannels();
                    if (onSuccessCallback) {
                        onSuccessCallback();
                    } else {
                        setIsDetailModalOpen(false);
                    }
                    addToast("Channel added to watchlist", "success");
                },
                onError: (err) => {
                    console.error("Error adding to watchlist:", err);
                    addToast("Failed to add channel to watchlist", "error");
                },
            },
        );
    };

    const openChannelDetails = (channel) => {
        setSelectedChannel(channel);
        setIsDetailModalOpen(true);
    };

    const openEditWatchlist = (e, watchlist) => {
        e.stopPropagation();
        setSelectedWatchlist(watchlist);
        setIsEditModalOpen(true);
    };

    const requestTrackChannel = (channel) => {
        if (isChannelActionLoading || !channel?.id) {
            return;
        }

        setChannelActionDialog({
            type: "track",
            channel,
        });
    };

    const requestUntrackChannel = (channel) => {
        if (isChannelActionLoading || !channel?.id) {
            return;
        }

        if (recentlyTrackedIds.includes(channel.id)) {
            return;
        }

        setChannelActionDialog({
            type: "untrack",
            channel,
        });
    };

    const closeChannelActionDialog = (force = false) => {
        if (isChannelActionLoading && !force) {
            return;
        }

        setChannelActionDialog(null);
        setChannelActionChannelId(null);
    };

    const confirmChannelAction = async () => {
        const dialog = channelActionDialog;
        if (!dialog?.channel?.id || isChannelActionLoading) {
            return;
        }

        const selectedChannelId = dialog.channel.id;
        const platform = dialog.channel.platform;
        const handle = dialog.channel.handle;

        setIsChannelActionLoading(true);
        setChannelActionChannelId(selectedChannelId);

        try {
            if (dialog.type === "track") {
                const response = await axios.post("/api/channels", {
                    channels: [{ platform, channel: `@${handle}` }],
                });

                const createdCount = Number(response?.data?.created_count ?? 0);
                if (createdCount > 0) {
                    closeChannelActionDialog(true);
                    setRecentlyTrackedIds((prev) =>
                        prev.includes(selectedChannelId)
                            ? prev
                            : [...prev, selectedChannelId],
                    );
                    setTimeout(() => {
                        setRecentlyTrackedIds((prev) =>
                            prev.filter((id) => id !== selectedChannelId),
                        );
                    }, 1000);

                    setSearchResults((prev) =>
                        prev.map((result) =>
                            result.id === selectedChannelId
                                ? { ...result, is_mine: true }
                                : result,
                        ),
                    );
                    await fetchChannels();
                    addToast(
                        response?.data?.message ||
                            `Started tracking @${handle}`,
                        "success",
                    );
                } else {
                    let errorMessage =
                        response?.data?.message || `Could not track @${handle}`;
                    const apiErrors = response?.data?.errors?.channels;
                    if (apiErrors && Object.values(apiErrors).length > 0) {
                        errorMessage =
                            Object.values(apiErrors)[0].message || errorMessage;
                    }
                    addToast(errorMessage, "warning");
                }
            }

            if (dialog.type === "untrack") {
                const response = await axios.delete(
                    `/api/channels/${selectedChannelId}`,
                );
                const remaining = Number(
                    response?.data?.untrack_remaining ??
                        response?.data?.remaining_untracks ??
                        untrackRemaining,
                );
                const usedCount = Number(
                    response?.data?.untrack_used ??
                        response?.data?.untrack_count ??
                        untrackCount,
                );

                setUntrackRemaining(remaining);
                setUntrackCount(usedCount);
                setAvailableChannels((prev) =>
                    prev.filter((channel) => channel.id !== selectedChannelId),
                );
                setSearchResults((prev) =>
                    prev.map((result) =>
                        result.id === selectedChannelId
                            ? { ...result, is_mine: false }
                            : result,
                    ),
                );
                setSelectedChannel((prev) =>
                    prev?.id === selectedChannelId ? null : prev,
                );
                setIsDetailModalOpen((prevOpen) =>
                    selectedChannel?.id === selectedChannelId
                        ? false
                        : prevOpen,
                );

                addToast(
                    response?.data?.message ||
                        `Untracked @${handle}. Remaining untracks: ${remaining}.`,
                    "success",
                );

                closeChannelActionDialog(true);
                await fetchWatchlists();
            }
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            const errorCode = error?.response?.data?.error;
            const remaining = Number(
                error?.response?.data?.untrack_remaining ??
                    error?.response?.data?.remaining_untracks ??
                    untrackRemaining,
            );
            const usedCount = Number(
                error?.response?.data?.untrack_used ??
                    error?.response?.data?.untrack_count ??
                    untrackCount,
            );

            if (
                dialog.type === "untrack" &&
                errorCode === "untrack_limit_reached"
            ) {
                setUntrackRemaining(remaining);
                setUntrackCount(usedCount);
                const limitReachedMessage = apiMessage
                    ? `${apiMessage} Remaining untracks: ${remaining}.`
                    : `Only ${untrackLimit} untracks are allowed. Remaining untracks: ${remaining}.`;
                addToast(limitReachedMessage, "warning");
            } else {
                addToast(
                    apiMessage ||
                        (dialog.type === "track"
                            ? `Failed to track @${handle}`
                            : `Failed to untrack @${handle}`),
                    "error",
                );
            }
        } finally {
            setIsChannelActionLoading(false);
            setChannelActionChannelId(null);
        }
    };

    return (
        <AuthenticatedLayout
            topbarTitle={"Competitor Channels"}
            topbarDescription={
                "Track and manage the competitor channels powering your research."
            }
            moduleTabsAction={(
                <Button href={route('channels.create')} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add new channels
                </Button>
            )}
        >
            <Head title="Channels" />

            <div className="relative z-40 space-y-4 ">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:p-3">
                    <ChannelsHeaderActions
                        availableChannels={availableChannels}
                        searchRef={searchRef}
                        search={search}
                        setSearch={setSearch}
                        searchLoading={searchLoading}
                        showSearchDropdown={showSearchDropdown}
                        setShowSearchDropdown={setShowSearchDropdown}
                        searchResults={searchResults}
                        setSearchResults={setSearchResults}
                        normalizedSearchQuery={normalizedSearchQuery}
                        openChannelDetails={openChannelDetails}
                        fetchChannels={fetchChannels}
                        addToast={addToast}
                        showFilter={showFilter}
                        setShowFilter={setShowFilter}
                        filterRef={filterRef}
                        selectedPlatforms={selectedPlatforms}
                        onRequestTrackChannel={requestTrackChannel}
                        onRequestUntrackChannel={requestUntrackChannel}
                        isChannelActionLoading={isChannelActionLoading}
                        channelActionChannelId={channelActionChannelId}
                        untrackLimit={untrackLimit}
                        untrackRemaining={untrackRemaining}
                        recentlyTrackedIds={recentlyTrackedIds}
                    />
                </div>
            </div>

            {/* Stats bar + mobile watchlist tab strip */}
            <div className="space-y-2 py-2">
                <CompetitorStatsBar
                    channels={availableChannels}
                    watchlists={watchlists}
                />
                <WatchlistTabStrip
                    watchlists={watchlists}
                    activeWatchlistId={activeWatchlistId}
                    onSelectWatchlist={setActiveWatchlistId}
                    onCreateWatchlist={() => setIsCreateModalOpen(true)}
                />
            </div>

            <div className="flex flex-col-reverse gap-8 lg:flex-row lg:items-start py-4">
                <div className="flex-1 min-w-0 space-y-6">
                    <Deferred
                        data="channels"
                        fallback={
                            <ChannelsGrid
                                gridRef={gridRef}
                                isLoading={true}
                                filteredChannels={[]}
                                virtualizer={virtualizer}
                                columnCount={columnCount}
                                rows={[]}
                                nextPageUrl={null}
                                isLoadingMore={false}
                                setIsLoadingMore={setIsLoadingMore}
                                fetchChannels={fetchChannels}
                                openChannelDetails={openChannelDetails}
                                onRequestUntrackChannel={requestUntrackChannel}
                                isChannelActionLoading={isChannelActionLoading}
                                channelActionChannelId={channelActionChannelId}
                                untrackRemaining={untrackRemaining}
                            />
                        }
                    >
                        <ChannelsGrid
                            gridRef={gridRef}
                            isLoading={isLoading}
                            filteredChannels={filteredChannels}
                            virtualizer={virtualizer}
                            columnCount={columnCount}
                            rows={rows}
                            nextPageUrl={nextPageUrl}
                            isLoadingMore={isLoadingMore}
                            setIsLoadingMore={setIsLoadingMore}
                            fetchChannels={fetchChannels}
                            openChannelDetails={openChannelDetails}
                            onRequestUntrackChannel={requestUntrackChannel}
                            isChannelActionLoading={isChannelActionLoading}
                            channelActionChannelId={channelActionChannelId}
                            untrackRemaining={untrackRemaining}
                        />
                    </Deferred>
                </div>

                <WatchlistsSidebar
                    isLoading={isLoading}
                    watchlists={watchlists}
                    setIsCreateModalOpen={setIsCreateModalOpen}
                    openEditWatchlist={openEditWatchlist}
                    handleDeleteWatchlist={handleDeleteWatchlist}
                />
            </div>

            <ChannelDetailModal
                show={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                channel={selectedChannel}
                watchlists={watchlists}
                onAddToWatchlist={handleAddToWatchlist}
                onCreateWatchlist={handleCreateWatchlist}
            />

            <WatchlistCreateModal
                show={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateWatchlist}
                existingWatchlists={watchlists}
            />

            <WatchlistEditModal
                show={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onEdit={handleEditWatchlist}
                watchlist={selectedWatchlist}
                existingWatchlists={watchlists}
            />

            <ConfirmDialog
                show={channelActionDialog !== null}
                title={
                    channelActionDialog?.type === "track"
                        ? "Track Channel"
                        : "Untrack Channel"
                }
                message={
                    channelActionDialog?.type === "track"
                        ? `Start tracking @${channelActionDialog?.channel?.handle || "this channel"}?`
                        : `Untrack @${channelActionDialog?.channel?.handle || "this channel"}? You can untrack only ${untrackLimit} times. Remaining before this action: ${untrackRemaining}.`
                }
                confirmLabel={
                    channelActionDialog?.type === "track" ? "Track" : "Untrack"
                }
                variant={
                    channelActionDialog?.type === "track"
                        ? "default"
                        : "warning"
                }
                onConfirm={confirmChannelAction}
                onCancel={closeChannelActionDialog}
                isLoading={isChannelActionLoading}
            />

            <ConfirmDialog
                show={deleteConfirm !== null}
                title="Delete Watchlist"
                message="Are you sure you want to delete this watchlist? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm(null)}
            />
        </AuthenticatedLayout>
    );
}
