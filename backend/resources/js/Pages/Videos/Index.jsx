import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
} from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import SearchInput from "@/Components/SearchInput";
import Icon from "@/Components/Icon";
import Button from "@/Components/Button";
import ConfirmDialog from "@/Components/common/ConfirmDialog";
import PageBanner from "@/Components/common/PageBanner";
import SaveFilterDialog from "@/Components/Videos/SaveFilterDialog";
import axios from "axios";
import { Save, Trash2 } from "lucide-react";
import Toast from "@/Components/Toast";
import Tooltip from "@/Components/Tooltip";
import QuickFilterPills from "@/Components/Library/QuickFilterPills";
import LibraryVideoGrid from "./Partials/LibraryVideoGrid";
import LibraryBulkFab from "./Partials/LibraryBulkFab";
import {
    PERFORMANCE_FILTER_OPTIONS,
    getPerformanceLabelIcon,
} from "@/constants/performanceLabels";

const DEFAULT_VIDEO_FILTERS = Object.freeze({
    search: "",
    platform: [],
    creator: [],
    watchlist: [],
    label: [],
    engagement_min: "",
    engagement_max: "",
    views_min: "",
    views_max: "",
    outlier_min: "",
    outlier_max: "",
    date_value: "0",
    date_unit: "Months",
    sort_by: "posted_date",
    sort_dir: "desc",
});

const getDefaultVideoFilters = () => ({
    ...DEFAULT_VIDEO_FILTERS,
    platform: [],
    creator: [],
    watchlist: [],
    label: [],
});

const normalizeDateValueForPayload = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    const raw = String(value).trim();
    if (raw === "") {
        return null;
    }

    const digitsOnly = raw.replace(/\D/g, "");
    if (digitsOnly === "") {
        return null;
    }

    return Number.parseInt(digitsOnly, 10);
};

const normalizeSavedVideoFilters = (rawFilters) => {
    if (
        !rawFilters ||
        typeof rawFilters !== "object" ||
        Array.isArray(rawFilters)
    ) {
        return null;
    }

    const toString = (value, fallback = "") => {
        if (value === null || value === undefined) {
            return fallback;
        }

        return String(value);
    };

    const toStringArray = (value) => {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map((entry) => String(entry).trim())
            .filter((entry) => entry !== "");
    };

    const toWatchlistArray = (value) => {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map((entry) => Number(entry))
            .filter((entry) => Number.isInteger(entry) && entry > 0);
    };

    const normalizeSortBy = (value) => {
        const allowed = [
            "outlier_score",
            "views",
            "engagement_rate",
            "posted_date",
        ];
        const normalized = toString(value, DEFAULT_VIDEO_FILTERS.sort_by);
        return allowed.includes(normalized)
            ? normalized
            : DEFAULT_VIDEO_FILTERS.sort_by;
    };

    const normalizeSortDir = (value) => {
        const normalized = toString(
            value,
            DEFAULT_VIDEO_FILTERS.sort_dir,
        ).toLowerCase();
        return normalized === "asc" ? "asc" : "desc";
    };

    const normalizeDateUnit = (value) => {
        const allowed = ["Days", "Weeks", "Months", "Years"];
        const normalized = toString(value, DEFAULT_VIDEO_FILTERS.date_unit);
        return allowed.includes(normalized)
            ? normalized
            : DEFAULT_VIDEO_FILTERS.date_unit;
    };

    const normalizedFilters = {
        search: toString(
            rawFilters.search,
            DEFAULT_VIDEO_FILTERS.search,
        ).trim(),
        platform: toStringArray(rawFilters.platform),
        creator: toStringArray(rawFilters.creator),
        watchlist: toWatchlistArray(rawFilters.watchlist),
        label: toStringArray(rawFilters.label),
        engagement_min: toString(
            rawFilters.engagement_min,
            DEFAULT_VIDEO_FILTERS.engagement_min,
        ),
        engagement_max: toString(
            rawFilters.engagement_max,
            DEFAULT_VIDEO_FILTERS.engagement_max,
        ),
        views_min: toString(
            rawFilters.views_min,
            DEFAULT_VIDEO_FILTERS.views_min,
        ),
        views_max: toString(
            rawFilters.views_max,
            DEFAULT_VIDEO_FILTERS.views_max,
        ),
        outlier_min: toString(
            rawFilters.outlier_min,
            DEFAULT_VIDEO_FILTERS.outlier_min,
        ),
        outlier_max: toString(
            rawFilters.outlier_max,
            DEFAULT_VIDEO_FILTERS.outlier_max,
        ),
        date_value: toString(
            rawFilters.date_value,
            DEFAULT_VIDEO_FILTERS.date_value,
        ),
        date_unit: normalizeDateUnit(rawFilters.date_unit),
        sort_by: normalizeSortBy(rawFilters.sort_by),
        sort_dir: normalizeSortDir(rawFilters.sort_dir),
    };

    return normalizedFilters;
};

const normalizeSavedVideoFilterPreset = (rawPreset) => {
    if (
        !rawPreset ||
        typeof rawPreset !== "object" ||
        Array.isArray(rawPreset)
    ) {
        return null;
    }

    const id = rawPreset.id;
    const name =
        typeof rawPreset.name === "string" ? rawPreset.name.trim() : "";
    const filters = normalizeSavedVideoFilters(rawPreset.filters);

    if (!id || name === "" || !filters) {
        return null;
    }

    return {
        id,
        name,
        filters,
    };
};

const normalizeSavedVideoFilterCollection = (rawSavedFilters) => {
    if (!Array.isArray(rawSavedFilters)) {
        return [];
    }

    return rawSavedFilters
        .map((rawPreset) => normalizeSavedVideoFilterPreset(rawPreset))
        .filter((preset) => preset !== null);
};

const normalizeFiltersForComparison = (rawFilters) => {
    const normalized =
        normalizeSavedVideoFilters(rawFilters) ?? getDefaultVideoFilters();
    const normalizeStringList = (value) =>
        [...value].map((item) => String(item)).sort();
    const normalizeWatchlist = (value) =>
        [...value]
            .map((item) => Number(item))
            .filter((item) => Number.isInteger(item) && item > 0)
            .sort((left, right) => left - right);

    return {
        search: normalized.search.trim(),
        platform: normalizeStringList(normalized.platform),
        creator: normalizeStringList(normalized.creator),
        watchlist: normalizeWatchlist(normalized.watchlist),
        label: normalizeStringList(normalized.label),
        engagement_min: String(normalized.engagement_min ?? ""),
        engagement_max: String(normalized.engagement_max ?? ""),
        views_min: String(normalized.views_min ?? ""),
        views_max: String(normalized.views_max ?? ""),
        outlier_min: String(normalized.outlier_min ?? ""),
        outlier_max: String(normalized.outlier_max ?? ""),
        date_value: normalizeDateValueForPayload(normalized.date_value),
        date_unit: normalized.date_unit,
        sort_by: normalized.sort_by,
        sort_dir: normalized.sort_dir,
    };
};

export default function Index({ savedVideoFilters = [], channelsCount = 0 }) {
    const { url } = usePage();
    const queryParams = new URLSearchParams(url.split("?")[1]);
    const initialCreator = queryParams.get("creator");
    const initialWatchlist = queryParams.get("filter_watchlist");
    const normalizedSavedVideoFilters = useMemo(
        () => normalizeSavedVideoFilterCollection(savedVideoFilters),
        [savedVideoFilters],
    );
    const [savedFilterPresets, setSavedFilterPresets] = useState(
        normalizedSavedVideoFilters,
    );
    const [selectedSavedFilterId, setSelectedSavedFilterId] = useState(null);
    const selectedSavedFilter = useMemo(
        () =>
            savedFilterPresets.find(
                (preset) => String(preset.id) === String(selectedSavedFilterId),
            ) ?? null,
        [savedFilterPresets, selectedSavedFilterId],
    );
    const hasDeepLinkFilters =
        initialCreator !== null || initialWatchlist !== null;
    const initialWatchlistId = Number(initialWatchlist);
    const initialFilters = useMemo(() => {
        const baseFilters =
            selectedSavedFilter?.filters ?? getDefaultVideoFilters();
        if (!hasDeepLinkFilters) {
            return { ...baseFilters };
        }

        return {
            ...baseFilters,
            creator: initialCreator ? [initialCreator] : [],
            watchlist:
                Number.isInteger(initialWatchlistId) && initialWatchlistId > 0
                    ? [initialWatchlistId]
                    : [],
        };
    }, [
        hasDeepLinkFilters,
        initialCreator,
        initialWatchlistId,
        selectedSavedFilter,
    ]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [selectedVideos, setSelectedVideos] = useState([]);

    // Sorting State
    const [sortBy, setSortBy] = useState(initialFilters.sort_by);
    const [sortDir, setSortDir] = useState(initialFilters.sort_dir);
    const [stagedSortBy, setStagedSortBy] = useState(initialFilters.sort_by);
    const [stagedSortDir, setStagedSortDir] = useState(initialFilters.sort_dir);

    // Filter States
    const [search, setSearch] = useState(initialFilters.search);
    const [selectedPlatforms, setSelectedPlatforms] = useState(
        initialFilters.platform,
    );
    const [selectedChannels, setSelectedChannels] = useState(
        initialFilters.creator,
    );
    const [selectedWatchlists, setSelectedWatchlists] = useState(
        initialFilters.watchlist,
    );
    const [availableChannels, setAvailableChannels] = useState([]);
    const [availableWatchlists, setAvailableWatchlists] = useState([]);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);
    const filterBarRef = useRef(null);
    const sortContainerRef = useRef(null);
    const fabRef = useRef(null);
    const dropdownRefs = useRef({});
    const [projects, setProjects] = useState([]);
    const [isBulkAdding, setIsBulkAdding] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [isSavingFilters, setIsSavingFilters] = useState(false);
    const [isClearingSavedFilters, setIsClearingSavedFilters] = useState(false);
    const [isSaveFilterDialogOpen, setIsSaveFilterDialogOpen] = useState(false);
    const [saveFilterNameDraft, setSaveFilterNameDraft] = useState("");
    const [saveFilterDialogError, setSaveFilterDialogError] = useState("");
    const [stagedSavedFilterId, setStagedSavedFilterId] = useState(null);
    const [isDeleteSavedFilterDialogOpen, setIsDeleteSavedFilterDialogOpen] =
        useState(false);
    const [pendingDeleteSavedFilterId, setPendingDeleteSavedFilterId] =
        useState(null);
    const postsRequestControllerRef = useRef(null);
    const postsRequestSequenceRef = useRef(0);

    const addToast = (message, type = "success") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            const clickedInsideSortContainer =
                sortContainerRef.current &&
                sortContainerRef.current.contains(event.target);
            const clickedInsideFab =
                fabRef.current && fabRef.current.contains(event.target);

            // If a dropdown is open, check if we clicked inside its content
            let clickedInsideActiveDropdownContent = false;
            if (activeDropdown && dropdownRefs.current[activeDropdown]) {
                clickedInsideActiveDropdownContent = dropdownRefs.current[
                    activeDropdown
                ].contains(event.target);
            }

            // Check if we clicked on a filter pill button (the trigger)   find the closest button with aria-haspopup
            const clickedOnFilterPill = event.target.closest("[aria-haspopup]");

            if (
                clickedInsideActiveDropdownContent ||
                clickedInsideSortContainer ||
                clickedInsideFab
            ) {
                // Clicked inside the active dropdown or sort/fab   don't close
                return;
            }

            if (clickedOnFilterPill) {
                // Clicked on a filter pill   let the pill's onClick handle toggling
                return;
            }

            // Clicked anywhere else   close everything
            setActiveDropdown(null);
            setShowUnitDropdown(false);
            setIsProjectDropdownOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [activeDropdown, isProjectDropdownOpen]);

    useEffect(() => {
        setSavedFilterPresets(normalizedSavedVideoFilters);
        setSelectedSavedFilterId((previousId) => {
            if (previousId === null) {
                return null;
            }

            const match = normalizedSavedVideoFilters.find(
                (preset) => String(preset.id) === String(previousId),
            );
            if (match) {
                return previousId;
            }

            return null;
        });
    }, [normalizedSavedVideoFilters]);

    useEffect(() => {
        setStagedSavedFilterId(selectedSavedFilterId ?? null);
    }, [selectedSavedFilterId]);

    const [engagementMin, setEngagementMin] = useState(
        initialFilters.engagement_min,
    );
    const [engagementMax, setEngagementMax] = useState(
        initialFilters.engagement_max,
    );
    const [selectedLabels, setSelectedLabels] = useState(initialFilters.label);
    const [viewsMin, setViewsMin] = useState(initialFilters.views_min);
    const [viewsMax, setViewsMax] = useState(initialFilters.views_max);
    const [outlierMin, setOutlierMin] = useState(initialFilters.outlier_min);
    const [outlierMax, setOutlierMax] = useState(initialFilters.outlier_max);
    const [dateValue, setDateValue] = useState(initialFilters.date_value);
    const [dateUnit, setDateUnit] = useState(initialFilters.date_unit);

    const hasActiveFilters =
        search.trim() !== "" ||
        selectedPlatforms.length > 0 ||
        selectedChannels.length > 0 ||
        selectedWatchlists.length > 0 ||
        selectedLabels.length > 0 ||
        engagementMin !== "" ||
        engagementMax !== "" ||
        viewsMin !== "" ||
        viewsMax !== "" ||
        outlierMin !== "" ||
        outlierMax !== "" ||
        dateValue !== "0";
    const hasNonDefaultSort =
        sortBy !== DEFAULT_VIDEO_FILTERS.sort_by ||
        sortDir !== DEFAULT_VIDEO_FILTERS.sort_dir;
    const hasSavableFilters = hasActiveFilters || hasNonDefaultSort;
    const hasSavedFilters = savedFilterPresets.length > 0;
    const trimmedSearch = search.trim();
    const isSearchTermEmpty = trimmedSearch.length === 0;

    // Staged Filter States (for popovers)
    const [stagedPlatforms, setStagedPlatforms] = useState(
        initialFilters.platform,
    );
    const [stagedChannels, setStagedChannels] = useState(
        initialFilters.creator,
    );
    const [stagedWatchlists, setStagedWatchlists] = useState(
        initialFilters.watchlist,
    );
    const [channelSearch, setChannelSearch] = useState("");
    const [stagedLabels, setStagedLabels] = useState(initialFilters.label);
    const [stagedEngagementMin, setStagedEngagementMin] = useState(
        initialFilters.engagement_min,
    );
    const [stagedEngagementMax, setStagedEngagementMax] = useState(
        initialFilters.engagement_max,
    );
    const [stagedViewsMin, setStagedViewsMin] = useState(
        initialFilters.views_min,
    );
    const [stagedViewsMax, setStagedViewsMax] = useState(
        initialFilters.views_max,
    );
    const [stagedOutlierMin, setStagedOutlierMin] = useState(
        initialFilters.outlier_min,
    );
    const [stagedOutlierMax, setStagedOutlierMax] = useState(
        initialFilters.outlier_max,
    );
    const [stagedDateValue, setStagedDateValue] = useState(
        initialFilters.date_value,
    );
    const [stagedDateUnit, setStagedDateUnit] = useState(
        initialFilters.date_unit,
    );
    const normalizedChannelSearch = channelSearch.trim().toLowerCase();
    // Note Bolt: Memoize dropdown search results to avoid repeated O(N) filtering on every rerender.
    const filteredChannelOptions = useMemo(() => {
        if (!normalizedChannelSearch) return availableChannels;

        return availableChannels.filter((channel) => {
            const handle = (channel.handle || "").toLowerCase();
            const name = (channel.name || "").toLowerCase();
            return (
                handle.includes(normalizedChannelSearch) ||
                name.includes(normalizedChannelSearch)
            );
        });
    }, [availableChannels, normalizedChannelSearch]);
    const stagedChannelSet = useMemo(
        () => new Set(stagedChannels),
        [stagedChannels],
    );
    const stagedWatchlistSet = useMemo(
        () => new Set(stagedWatchlists),
        [stagedWatchlists],
    );
    const stagedLabelSet = useMemo(() => new Set(stagedLabels), [stagedLabels]);
    const pendingDeleteSavedFilter = useMemo(
        () =>
            savedFilterPresets.find(
                (preset) =>
                    String(preset.id) === String(pendingDeleteSavedFilterId),
            ) ?? null,
        [pendingDeleteSavedFilterId, savedFilterPresets],
    );
    // Note Bolt: Set lookups avoid repeated linear `.includes()` checks in mapped list UIs.
    const selectedVideoSet = useMemo(
        () => new Set(selectedVideos),
        [selectedVideos],
    );
    const visiblePostIds = useMemo(() => posts.map((post) => post.id), [posts]);
    const selectedVisibleCount = useMemo(
        () =>
            visiblePostIds.filter((postId) => selectedVideoSet.has(postId))
                .length,
        [selectedVideoSet, visiblePostIds],
    );
    const buildCurrentFiltersPayload = useCallback(
        () => ({
            search: search.trim(),
            platform: [...selectedPlatforms],
            creator: [...selectedChannels],
            watchlist: [...selectedWatchlists],
            engagement_min: engagementMin,
            engagement_max: engagementMax,
            views_min: viewsMin,
            views_max: viewsMax,
            outlier_min: outlierMin,
            outlier_max: outlierMax,
            date_value: normalizeDateValueForPayload(dateValue),
            date_unit: dateUnit,
            label: [...selectedLabels],
            sort_by: sortBy,
            sort_dir: sortDir,
        }),
        [
            dateUnit,
            dateValue,
            engagementMax,
            engagementMin,
            outlierMax,
            outlierMin,
            search,
            selectedChannels,
            selectedLabels,
            selectedPlatforms,
            selectedWatchlists,
            sortBy,
            sortDir,
            viewsMax,
            viewsMin,
        ],
    );
    const currentFiltersComparison = useMemo(
        () =>
            JSON.stringify(
                normalizeFiltersForComparison(buildCurrentFiltersPayload()),
            ),
        [buildCurrentFiltersPayload],
    );
    const selectedSavedFilterComparison = useMemo(
        () =>
            selectedSavedFilter
                ? JSON.stringify(
                    normalizeFiltersForComparison(
                        selectedSavedFilter.filters,
                    ),
                )
                : null,
        [selectedSavedFilter],
    );
    const canUpdateSelectedSavedFilter = Boolean(
        selectedSavedFilter &&
        selectedSavedFilterComparison !== null &&
        currentFiltersComparison !== selectedSavedFilterComparison,
    );

    const fetchChannels = async () => {
        try {
            const response = await axios.get("/api/channels");
            const payload = response?.data;
            const channels = Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload)
                    ? payload
                    : [];
            setAvailableChannels(channels);
        } catch (error) {
            console.error("Error fetching channels:", error);
        }
    };

    const fetchWatchlists = async () => {
        try {
            const response = await axios.get("/api/watchlists");
            setAvailableWatchlists(response.data || []);
        } catch (error) {
            console.error("Error fetching watchlists:", error);
        }
    };

    const fetchPosts = async (currentFilters = {}, requestedPage = 1) => {
        const requestSequence = ++postsRequestSequenceRef.current;
        if (postsRequestControllerRef.current) {
            postsRequestControllerRef.current.abort();
        }
        const abortController = new AbortController();
        postsRequestControllerRef.current = abortController;

        const isFilterRequest =
            requestedPage === 1 &&
            (Object.keys(currentFilters).length > 0 || activeDropdown !== null);
        if (requestedPage === 1) setLoading(true);
        else setLoadingMore(true);
        if (isFilterRequest) setIsFilterLoading(true);

        try {
            const params = {
                search:
                    currentFilters.search !== undefined
                        ? currentFilters.search
                        : search,
                creator:
                    currentFilters.creator !== undefined
                        ? currentFilters.creator
                        : selectedChannels,
                platform:
                    currentFilters.platform !== undefined
                        ? currentFilters.platform
                        : selectedPlatforms,
                watchlist:
                    currentFilters.watchlist !== undefined
                        ? currentFilters.watchlist
                        : selectedWatchlists,
                engagement_min:
                    currentFilters.engagement_min !== undefined
                        ? currentFilters.engagement_min
                        : engagementMin,
                engagement_max:
                    currentFilters.engagement_max !== undefined
                        ? currentFilters.engagement_max
                        : engagementMax,
                views_min:
                    currentFilters.views_min !== undefined
                        ? currentFilters.views_min
                        : viewsMin,
                views_max:
                    currentFilters.views_max !== undefined
                        ? currentFilters.views_max
                        : viewsMax,
                outlier_min:
                    currentFilters.outlier_min !== undefined
                        ? currentFilters.outlier_min
                        : outlierMin,
                outlier_max:
                    currentFilters.outlier_max !== undefined
                        ? currentFilters.outlier_max
                        : outlierMax,
                date_value:
                    currentFilters.date_value !== undefined
                        ? currentFilters.date_value
                        : dateValue,
                date_unit:
                    currentFilters.date_unit !== undefined
                        ? currentFilters.date_unit
                        : dateUnit,
                label:
                    currentFilters.label !== undefined
                        ? currentFilters.label
                        : selectedLabels,
                sort_by:
                    currentFilters.sort_by !== undefined
                        ? currentFilters.sort_by
                        : sortBy,
                sort_dir:
                    currentFilters.sort_dir !== undefined
                        ? currentFilters.sort_dir
                        : sortDir,
                page: requestedPage,
            };

            // Clean up empty params
            Object.keys(params).forEach((key) => {
                if (Array.isArray(params[key])) {
                    if (params[key].length === 0) delete params[key];
                } else if (!params[key] && params[key] !== 0) {
                    delete params[key];
                }
            });

            const response = await axios.get("/api/posts", {
                params,
                signal: abortController.signal,
            });

            if (requestSequence !== postsRequestSequenceRef.current) {
                return;
            }

            const newPosts = response.data.data || [];

            if (requestedPage === 1) {
                setPosts(newPosts);
            } else {
                setPosts((prev) => [...prev, ...newPosts]);
            }

            setPage(requestedPage);
            setHasMore(response.data.next_page_url !== null);
        } catch (error) {
            if (error?.code === "ERR_CANCELED" || axios.isCancel?.(error)) {
                return;
            }
            if (requestSequence !== postsRequestSequenceRef.current) {
                return;
            }
            console.error("Error fetching posts:", error);
            if (requestedPage === 1) setPosts([]);
        } finally {
            if (requestSequence !== postsRequestSequenceRef.current) {
                return;
            }
            if (postsRequestControllerRef.current === abortController) {
                postsRequestControllerRef.current = null;
            }
            setLoading(false);
            setLoadingMore(false);
            setIsFilterLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            postsRequestSequenceRef.current += 1;
            if (postsRequestControllerRef.current) {
                postsRequestControllerRef.current.abort();
                postsRequestControllerRef.current = null;
            }
        };
    }, []);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchPosts({}, page + 1);
        }
    };

    useEffect(() => {
        fetchChannels();
        fetchWatchlists();
        fetchProjects();
        fetchPosts();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await axios.get("/api/projects");
            setProjects(response.data);
        } catch (error) {
            console.error("Error fetching projects:", error);
        }
    };

    const handleAction = (post, action) => {
        setProcessingId(post.id);
        router.post(
            `/api/posts/${post.id}/${action}`,
            {},
            {
                onSuccess: () => {
                    fetchPosts();
                    setProcessingId(null);
                },
                onError: (err) => {
                    console.error(`Error during ${action}:`, err);
                    setProcessingId(null);
                },
                onFinish: () => setProcessingId(null),
            },
        );
    };

    // Initialize staged states when dropdown opens
    useEffect(() => {
        if (activeDropdown === "sort") {
            setStagedSortBy(sortBy);
            setStagedSortDir(sortDir);
        }
        if (activeDropdown === "label") setStagedLabels([...selectedLabels]);
        if (activeDropdown === "watchlist")
            setStagedWatchlists([...selectedWatchlists]);
        if (activeDropdown === "channel")
            setStagedChannels([...selectedChannels]);
        if (activeDropdown === "posted_date") {
            setStagedDateValue(dateValue);
            setStagedDateUnit(dateUnit);
        }
        if (activeDropdown === "platform")
            setStagedPlatforms([...selectedPlatforms]);
        if (activeDropdown === "outlier") {
            setStagedOutlierMin(outlierMin);
            setStagedOutlierMax(outlierMax);
        }
        if (activeDropdown === "views") {
            setStagedViewsMin(viewsMin);
            setStagedViewsMax(viewsMax);
        }
        if (activeDropdown === "engagement") {
            setStagedEngagementMin(engagementMin);
            setStagedEngagementMax(engagementMax);
        }
    }, [activeDropdown]);

    useEffect(() => {
        if (!activeDropdown) return;

        const dropdownNode = dropdownRefs.current[activeDropdown];
        if (!dropdownNode) return;

        const focusableSelector =
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const getFocusable = () =>
            Array.from(dropdownNode.querySelectorAll(focusableSelector)).filter(
                (el) => !el.disabled,
            );
        const focusable = getFocusable();
        if (focusable.length > 0) {
            focusable[0].focus();
        } else {
            dropdownNode.focus();
        }

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                setActiveDropdown(null);
                return;
            }

            if (event.key === "Tab") {
                const nodes = getFocusable();
                if (nodes.length === 0) {
                    event.preventDefault();
                    return;
                }
                const first = nodes[0];
                const last = nodes[nodes.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
                return;
            }

            if (
                dropdownNode.getAttribute("role") === "listbox" &&
                (event.key === "ArrowDown" || event.key === "ArrowUp")
            ) {
                event.preventDefault();
                const options = Array.from(
                    dropdownNode.querySelectorAll('[role="option"]'),
                ).filter((el) => !el.disabled);
                if (options.length === 0) return;
                const currentIndex = options.indexOf(document.activeElement);
                const delta = event.key === "ArrowDown" ? 1 : -1;
                const nextIndex =
                    currentIndex === -1
                        ? 0
                        : (currentIndex + delta + options.length) %
                        options.length;
                options[nextIndex].focus();
            }

            if (
                dropdownNode.getAttribute("role") === "listbox" &&
                (event.key === "Enter" || event.key === " ")
            ) {
                if (document.activeElement?.getAttribute("role") === "option") {
                    event.preventDefault();
                    document.activeElement.click();
                }
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [activeDropdown]);

    const applyFiltersFromSnapshot = (filtersSnapshot) => {
        const normalizedSnapshot =
            normalizeSavedVideoFilters(filtersSnapshot) ??
            getDefaultVideoFilters();

        setSearch(normalizedSnapshot.search);
        setSelectedPlatforms(normalizedSnapshot.platform);
        setSelectedChannels(normalizedSnapshot.creator);
        setSelectedWatchlists(normalizedSnapshot.watchlist);
        setEngagementMin(normalizedSnapshot.engagement_min);
        setEngagementMax(normalizedSnapshot.engagement_max);
        setViewsMin(normalizedSnapshot.views_min);
        setViewsMax(normalizedSnapshot.views_max);
        setOutlierMin(normalizedSnapshot.outlier_min);
        setOutlierMax(normalizedSnapshot.outlier_max);
        setDateValue(normalizedSnapshot.date_value);
        setDateUnit(normalizedSnapshot.date_unit);
        setSelectedLabels(normalizedSnapshot.label);
        setSortBy(normalizedSnapshot.sort_by);
        setSortDir(normalizedSnapshot.sort_dir);

        // Keep staged state in sync so popovers open with the saved values.
        setStagedPlatforms(normalizedSnapshot.platform);
        setStagedChannels(normalizedSnapshot.creator);
        setStagedWatchlists(normalizedSnapshot.watchlist);
        setStagedEngagementMin(normalizedSnapshot.engagement_min);
        setStagedEngagementMax(normalizedSnapshot.engagement_max);
        setStagedViewsMin(normalizedSnapshot.views_min);
        setStagedViewsMax(normalizedSnapshot.views_max);
        setStagedOutlierMin(normalizedSnapshot.outlier_min);
        setStagedOutlierMax(normalizedSnapshot.outlier_max);
        setStagedDateValue(normalizedSnapshot.date_value);
        setStagedDateUnit(normalizedSnapshot.date_unit);
        setStagedLabels(normalizedSnapshot.label);
        setStagedSortBy(normalizedSnapshot.sort_by);
        setStagedSortDir(normalizedSnapshot.sort_dir);

        setSelectedVideos([]);
        setActiveDropdown(null);
        setShowUnitDropdown(false);
        fetchPosts(normalizedSnapshot, 1);
    };

    const handleOpenSaveFilterDialog = () => {
        if (!hasSavableFilters || isSavingFilters) {
            return;
        }

        const suggestedName =
            canUpdateSelectedSavedFilter && selectedSavedFilter
                ? selectedSavedFilter.name
                : `Filter ${savedFilterPresets.length + 1}`;

        setSaveFilterDialogError("");
        setSaveFilterNameDraft(suggestedName);
        setIsSaveFilterDialogOpen(true);
    };

    const handleCloseSaveFilterDialog = () => {
        if (isSavingFilters) {
            return;
        }

        setIsSaveFilterDialogOpen(false);
        setSaveFilterDialogError("");
    };

    const handleSaveFilters = async (
        nameFromDialog = "",
        saveMode = "create",
    ) => {
        if (!hasSavableFilters || isSavingFilters) {
            return;
        }

        const presetName = String(nameFromDialog).trim();

        if (presetName === "") {
            setSaveFilterDialogError("Please enter a filter name.");
            return;
        }

        setSaveFilterDialogError("");
        setIsSavingFilters(true);

        try {
            const filtersToSave = buildCurrentFiltersPayload();
            const shouldUpdateExisting =
                saveMode === "update" &&
                canUpdateSelectedSavedFilter &&
                selectedSavedFilter;
            if (saveMode === "update" && !shouldUpdateExisting) {
                throw new Error(
                    "Selected preset is no longer available for update.",
                );
            }
            const response = shouldUpdateExisting
                ? await axios.patch(
                    `/api/saved-video-filters/${selectedSavedFilter.id}`,
                    {
                        name: presetName,
                        filters: filtersToSave,
                    },
                )
                : await axios.post("/api/saved-video-filters", {
                    name: presetName,
                    filters: filtersToSave,
                });

            const savedPreset = normalizeSavedVideoFilterPreset(
                response?.data?.data,
            );
            if (!savedPreset) {
                throw new Error("Invalid saved preset payload");
            }

            setSavedFilterPresets((previousPresets) =>
                shouldUpdateExisting
                    ? previousPresets.map((preset) =>
                        String(preset.id) === String(savedPreset.id)
                            ? savedPreset
                            : preset,
                    )
                    : [
                        savedPreset,
                        ...previousPresets.filter(
                            (preset) =>
                                String(preset.id) !== String(savedPreset.id),
                        ),
                    ],
            );
            setSelectedSavedFilterId(savedPreset.id);
            setStagedSavedFilterId(savedPreset.id);
            setIsSaveFilterDialogOpen(false);
            setSaveFilterDialogError("");
            addToast(
                shouldUpdateExisting
                    ? "Saved filter updated."
                    : "Filter preset saved.",
                "success",
            );
        } catch (error) {
            console.error("Error saving video filters:", error);
            const duplicateNameError = error?.response?.data?.errors?.name?.[0];
            setSaveFilterDialogError(
                duplicateNameError ??
                "Unable to save filters right now. Please try again.",
            );
        } finally {
            setIsSavingFilters(false);
        }
    };

    const handleApplySavedFilters = () => {
        const stagedSavedFilter = savedFilterPresets.find(
            (preset) => String(preset.id) === String(stagedSavedFilterId),
        );

        if (!stagedSavedFilter) {
            return;
        }

        setSelectedSavedFilterId(stagedSavedFilter.id);
        applyFiltersFromSnapshot(stagedSavedFilter.filters);
        addToast(`"${stagedSavedFilter.name}" applied.`, "success");
    };

    const handleRequestDeleteSavedFilter = (
        targetSavedFilterId = stagedSavedFilterId,
    ) => {
        if (!targetSavedFilterId || isClearingSavedFilters) {
            return;
        }

        setPendingDeleteSavedFilterId(targetSavedFilterId);
        setIsDeleteSavedFilterDialogOpen(true);
    };

    const handleCancelDeleteSavedFilter = () => {
        if (isClearingSavedFilters) {
            return;
        }

        setIsDeleteSavedFilterDialogOpen(false);
        setPendingDeleteSavedFilterId(null);
    };

    const handleConfirmDeleteSavedFilter = async () => {
        if (!pendingDeleteSavedFilter || isClearingSavedFilters) {
            return;
        }

        setIsClearingSavedFilters(true);

        try {
            await axios.delete(
                `/api/saved-video-filters/${pendingDeleteSavedFilter.id}`,
            );

            let remainingPresetsAfterDelete = [];
            setSavedFilterPresets((previousPresets) => {
                const remainingPresets = previousPresets.filter(
                    (preset) =>
                        String(preset.id) !==
                        String(pendingDeleteSavedFilter.id),
                );
                remainingPresetsAfterDelete = remainingPresets;

                const nextSelectedId =
                    String(selectedSavedFilterId) ===
                        String(pendingDeleteSavedFilter.id)
                        ? null
                        : selectedSavedFilterId;

                const nextStagedId =
                    String(stagedSavedFilterId) ===
                        String(pendingDeleteSavedFilter.id)
                        ? null
                        : stagedSavedFilterId;

                setSelectedSavedFilterId(nextSelectedId);
                setStagedSavedFilterId(nextStagedId);

                return remainingPresets;
            });
            if (remainingPresetsAfterDelete.length === 0) {
                setActiveDropdown(null);
            }

            addToast("Saved filter preset removed.", "success");
            setIsDeleteSavedFilterDialogOpen(false);
            setPendingDeleteSavedFilterId(null);
        } catch (error) {
            console.error("Error clearing saved video filters:", error);
            addToast(
                "Unable to clear saved filters right now. Please try again.",
                "error",
            );
        } finally {
            setIsClearingSavedFilters(false);
        }
    };

    const handleClear = () => {
        const clearedFilters = getDefaultVideoFilters();

        // Reset main states
        setSearch(clearedFilters.search);
        setSelectedPlatforms(clearedFilters.platform);
        setSelectedChannels(clearedFilters.creator);
        setSelectedWatchlists(clearedFilters.watchlist);
        setEngagementMin(clearedFilters.engagement_min);
        setEngagementMax(clearedFilters.engagement_max);
        setViewsMin(clearedFilters.views_min);
        setViewsMax(clearedFilters.views_max);
        setOutlierMin(clearedFilters.outlier_min);
        setOutlierMax(clearedFilters.outlier_max);
        setDateValue(clearedFilters.date_value);
        setDateUnit(clearedFilters.date_unit);
        setSelectedLabels(clearedFilters.label);
        setSortBy(clearedFilters.sort_by);
        setSortDir(clearedFilters.sort_dir);

        // Reset staged states
        setStagedPlatforms(clearedFilters.platform);
        setStagedChannels(clearedFilters.creator);
        setStagedWatchlists(clearedFilters.watchlist);
        setStagedEngagementMin(clearedFilters.engagement_min);
        setStagedEngagementMax(clearedFilters.engagement_max);
        setStagedViewsMin(clearedFilters.views_min);
        setStagedViewsMax(clearedFilters.views_max);
        setStagedOutlierMin(clearedFilters.outlier_min);
        setStagedOutlierMax(clearedFilters.outlier_max);
        setStagedDateValue(clearedFilters.date_value);
        setStagedDateUnit(clearedFilters.date_unit);
        setStagedLabels(clearedFilters.label);
        setStagedSortBy(clearedFilters.sort_by);
        setStagedSortDir(clearedFilters.sort_dir);
        setSelectedSavedFilterId(null);
        setStagedSavedFilterId(null);
        setSelectedVideos([]);

        fetchPosts(clearedFilters);

        // If we came from creator link, we might want to stay there or clear it
        if (!initialCreator) {
            router.get("/Library", {}, { replace: true, preserveState: true });
        }
    };

    const toggleVideoSelection = useCallback((postId) => {
        setSelectedVideos((prev) =>
            prev.includes(postId)
                ? prev.filter((id) => id !== postId)
                : [...prev, postId],
        );
    }, []);

    const handleSelectVisibleVideos = useCallback(() => {
        if (visiblePostIds.length === 0) {
            return;
        }

        setSelectedVideos((previousSelectedVideos) => {
            const mergedSelection = new Set(previousSelectedVideos);
            visiblePostIds.forEach((postId) => mergedSelection.add(postId));
            return Array.from(mergedSelection);
        });
    }, [visiblePostIds]);

    const handleDeselectVisibleVideos = useCallback(() => {
        if (visiblePostIds.length === 0) {
            return;
        }

        const visibleSet = new Set(visiblePostIds);
        setSelectedVideos((previousSelectedVideos) =>
            previousSelectedVideos.filter((postId) => !visibleSet.has(postId)),
        );
    }, [visiblePostIds]);

    const FilterPill = ({
        label,
        active = false,
        icon = true,
        customIcon = null,
        onClick,
        dropdownName,
    }) => (
        <button
            onClick={onClick}
            aria-haspopup="listbox"
            aria-expanded={activeDropdown === dropdownName}
            aria-controls={
                dropdownName ? `video-filter-${dropdownName}` : undefined
            }
            className={`px-4 py-2 rounded-full border text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap ${active
                    ? "border-primary-300 bg-primary-50 text-primary-500"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
        >
            {customIcon && (
                <span className="flex items-center">{customIcon}</span>
            )}
            <span className="capitalize">{label}</span>
            {icon && (
                <svg
                    className={`w-3.5 h-3.5 opacity-60 transition-transform ${activeDropdown === dropdownName ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            )}
        </button>
    );

    const handleBulkAddToProject = async () => {
        if (!selectedProjectId || selectedVideos.length === 0) return;

        setIsBulkAdding(true);
        try {
            await axios.post(`/api/projects/${selectedProjectId}/posts`, {
                post_ids: selectedVideos,
            });

            // Success! Clear selection and show success
            setSelectedVideos([]);
            setSelectedProjectId(null);
            addToast(
                `Successfully added ${selectedVideos.length} videos to project`,
            );

            // Re-fetch to update the 'Already in project' indicators
            fetchPosts({ page: 1 }, 1);
            fetchProjects(); // Update counts
        } catch (error) {
            console.error("Error adding videos to project:", error);
        } finally {
            setIsBulkAdding(false);
        }
    };

    const platformIcons = {
        youtube: (
            <svg
                className="w-4 h-4 text-red-600 fill-current"
                viewBox="0 0 24 24"
            >
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
        ),
        tiktok: (
            <svg
                className="w-4 h-4 text-slate-900 fill-current"
                viewBox="0 0 24 24"
            >
                <path d="M19.589 6.686a4.793 4.793 0 01-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 01-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 013.183-4.51v-3.5a6.329 6.329 0 00-3.932 1.321 6.331 6.331 0 002.534 11.458h.01a6.331 6.331 0 005.968-4.516V8.69a9.052 9.052 0 005.222 1.648V6.896a6.375 6.375 0 01-1.126-.23L19.589 6.686z" />
            </svg>
        ),
        linkedin: (
            <svg
                className="w-4 h-4 text-[#0077B5] fill-current"
                viewBox="0 0 24 24"
            >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
        ),
        instagram: (
            <svg
                className="w-4 h-4 text-primary-600 fill-current"
                viewBox="0 0 24 24"
            >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
        ),
    };

    return (
        <AuthenticatedLayout
            topbarTitle={"Content Library"}
            topbarDescription={
                "Discover and analyze top performing content across your tracked channels."
            }
        >
            <Head title="Videos" />
            {channelsCount > 0 && (
                <div className="bg-white rounded-2xl shadow-sm   p-5 xl:p-4">
                    <div className="relative mx-auto max-w-[1280px] space-y-5 xl:space-y-4 ">
                        {/* Search & Action Buttons Row */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center m-2">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (isSearchTermEmpty) return;
                                    fetchPosts({ search: trimmedSearch }, 1);
                                }}
                                className="flex w-full flex-1 items-center gap-2"
                            >
                                <SearchInput
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onClear={() => {
                                        setSearch("");
                                        fetchPosts({ search: "" }, 1);
                                    }}
                                    placeholder="Search for videos by topic..."
                                    className="min-w-0 flex-1"
                                />
                                <Tooltip
                                    text="Search videos"
                                    position="bottom"
                                    showOnFocus={false}
                                >
                                    <button
                                        type="submit"
                                        aria-label="Submit search"
                                        disabled={isSearchTermEmpty}
                                        className="flex items-center gap-1.5 px-4 h-[42px] border border-slate-200 rounded-xl bg-white text-sm font-bold shadow-sm transition-all shrink-0 text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100"
                                    >
                                        Go
                                        <Icon name="chevronRight" size={4} />
                                    </button>
                                </Tooltip>
                            </form>

                            <div className="relative flex w-full items-center justify-end gap-2 sm:w-auto">
                                <Button
                                    variant="secondary"
                                    icon={Save}
                                    onClick={handleOpenSaveFilterDialog}
                                    isLoading={isSavingFilters}
                                    disabled={!hasSavableFilters}
                                    className="h-[42px] px-4 text-sm font-bold shadow-sm sm:w-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-0 focus:ring-offset-0"
                                >
                                    Save Filter
                                </Button>

                                {hasActiveFilters && (
                                    <Button
                                        variant="danger"
                                        icon={Trash2}
                                        onClick={handleClear}
                                        className="h-[42px] px-4 text-sm font-bold shadow-sm animate-in fade-in slide-in-from-right-2 duration-200 focus:ring-0 focus:ring-offset-0 sm:w-auto"
                                    >
                                        Clear
                                    </Button>
                                )}

                                <div className="relative" ref={sortContainerRef}>
                                    <Tooltip
                                        text={`Sorting by ${sortBy.replace("_", " ")} (${sortDir === "desc" ? "descending" : "ascending"})`}
                                        position="bottom-end"
                                        showOnFocus={false}
                                        showOnClick={false}
                                    >
                                        <button
                                            onClick={() =>
                                                setActiveDropdown(
                                                    activeDropdown === "sort"
                                                        ? null
                                                        : "sort",
                                                )
                                            }
                                            aria-label="Sort options"
                                            className={`h-[42px] px-4 flex items-center gap-2 rounded-xl text-sm font-bold shadow-sm transition-colors ${activeDropdown === "sort" ? "border-primary-300 bg-primary-50 text-primary-600 border" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 border"}`}
                                        >
                                            <svg
                                                className="w-4 h-4 text-slate-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2.5"
                                                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                                                />
                                            </svg>
                                            Sort
                                        </button>
                                    </Tooltip>
                                    {activeDropdown === "sort" && (
                                        <div
                                            ref={(node) => {
                                                dropdownRefs.current.sort = node;
                                            }}
                                            className="fixed inset-x-4 top-1/2 z-[120] max-h-[80vh] w-auto -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:z-[100] sm:mt-2 sm:w-[400px] sm:max-h-none sm:translate-y-0 sm:overflow-hidden sm:overscroll-auto"
                                        >
                                            <div className="p-1 px-2 border-b border-slate-100 flex items-center justify-between bg-primary-500">
                                                <button
                                                    onClick={() => {
                                                        setStagedSortBy(
                                                            "posted_date",
                                                        );
                                                        setStagedSortDir("desc");
                                                        setSortBy("posted_date");
                                                        setSortDir("desc");
                                                        fetchPosts({
                                                            sort_by: "posted_date",
                                                            sort_dir: "desc",
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="text-[11px] font-bold text-white hover:text-white flex items-center gap-1 px-2 py-1.5 transition-colors"
                                                >
                                                    <svg
                                                        className="w-3 h-3"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2.5"
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                    Default
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSortBy(stagedSortBy);
                                                        setSortDir(stagedSortDir);
                                                        fetchPosts({
                                                            sort_by: stagedSortBy,
                                                            sort_dir: stagedSortDir,
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${stagedSortBy !== sortBy ||
                                                            stagedSortDir !== sortDir
                                                            ? "bg-white text-primary-600 shadow-sm ring-1 ring-black/5 hover:bg-slate-50"
                                                            : "text-white hover:text-primary-600 hover:bg-white"
                                                        }`}
                                                >
                                                    Apply
                                                </button>
                                            </div>

                                            <div className="flex gap-4 p-3">
                                                <div className="flex-1">
                                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                                                        Sort By
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {[
                                                            {
                                                                value: "outlier_score",
                                                                label: "Outlier Score",
                                                            },
                                                            {
                                                                value: "views",
                                                                label: "Views",
                                                            },
                                                            {
                                                                value: "engagement_rate",
                                                                label: "Engagement Rate",
                                                            },
                                                            {
                                                                value: "posted_date",
                                                                label: "Posted Date",
                                                            },
                                                        ].map((option) => (
                                                            <button
                                                                key={option.value}
                                                                onClick={() =>
                                                                    setStagedSortBy(
                                                                        option.value,
                                                                    )
                                                                }
                                                                className={`text-left px-3 py-2 text-sm rounded-lg font-medium transition-colors ${stagedSortBy === option.value ? "bg-primary-500 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}
                                                            >
                                                                {option.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                                                        Sort Direction
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {[
                                                            {
                                                                value: "desc",
                                                                label: "Descending",
                                                                icon: "arrowDownZA",
                                                            },
                                                            {
                                                                value: "asc",
                                                                label: "Ascending",
                                                                icon: "arrowUpAZ",
                                                            },
                                                        ].map((option) => (
                                                            <button
                                                                key={option.value}
                                                                onClick={() =>
                                                                    setStagedSortDir(
                                                                        option.value,
                                                                    )
                                                                }
                                                                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-colors ${stagedSortDir === option.value ? "border border-primary-200 bg-primary-50 text-primary-600 shadow-sm" : "text-slate-700 bg-slate-50 border border-transparent hover:bg-slate-100 hover:text-slate-900 border-slate-100"}`}
                                                            >
                                                                <Icon
                                                                    name={
                                                                        option.icon
                                                                    }
                                                                    className="w-4 h-4"
                                                                />
                                                                {option.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick-Filter Preset Pills */}
                    <div className="px-2">
                        <QuickFilterPills
                            currentFilters={buildCurrentFiltersPayload()}
                            onApplyPreset={(preset) =>
                                applyFiltersFromSnapshot(preset.filters)
                            }
                            onClear={handleClear}
                        />
                    </div>

                    {/* Sticky Filter Bar */}
                    <div className="sticky top-16 z-30     -mx-4 sm:-mx-4 lg:-mx-6 px-4 sm:px-4 lg:px-6  lg:top-16">
                        <div
                            className="flex flex-col gap-2 py-2.5"
                            ref={filterBarRef}
                        >
                            <div className="flex flex-nowrap sm:flex-wrap items-center gap-1 overflow-x-auto sm:overflow-visible pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
                                {/* Watchlist Filter */}
                                <div className="relative">
                                    <Tooltip
                                        text="Filter By Your Watchlists"
                                        position="top"
                                        showOnFocus={false}
                                        showOnClick={false}
                                    >
                                        <FilterPill
                                            label={
                                                selectedWatchlists.length > 0
                                                    ? `${selectedWatchlists.length} watchlist${selectedWatchlists.length > 1 ? "s" : ""}`
                                                    : "My Watchlist"
                                            }
                                            active={
                                                activeDropdown === "watchlist" ||
                                                selectedWatchlists.length > 0
                                            }
                                            onClick={() =>
                                                setActiveDropdown(
                                                    activeDropdown === "watchlist"
                                                        ? null
                                                        : "watchlist",
                                                )
                                            }
                                            dropdownName="watchlist"
                                        />
                                    </Tooltip>
                                    {activeDropdown === "watchlist" && (
                                        <div
                                            id="video-filter-watchlist"
                                            role="listbox"
                                            tabIndex={-1}
                                            ref={(node) => {
                                                dropdownRefs.current.watchlist =
                                                    node;
                                            }}
                                            className="fixed inset-x-4 top-1/2 z-[120] max-h-[80vh] w-auto -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:z-[100] sm:mt-2 sm:w-80 sm:max-h-none sm:translate-y-0 sm:overflow-hidden sm:overscroll-auto"
                                        >
                                            {/* Header: only show Clear/Apply when there are watchlists */}
                                            {availableWatchlists.length > 0 ? (
                                                <>
                                                    <div className="p-1 px-2 border-b border-slate-100 flex items-center justify-between bg-primary-500 rounded-t-xl">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedWatchlists(
                                                                    [],
                                                                );
                                                                setStagedWatchlists(
                                                                    [],
                                                                );
                                                                setActiveDropdown(
                                                                    null,
                                                                );
                                                                fetchPosts({
                                                                    watchlist: [],
                                                                });
                                                            }}
                                                            className="text-[11px] font-bold text-white hover:text-white flex items-center gap-1 px-2 py-1.5 transition-colors"
                                                        >
                                                            <svg
                                                                className="w-3 h-3"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="2.5"
                                                                    d="M6 18L18 6M6 6l12 12"
                                                                />
                                                            </svg>
                                                            Clear
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedWatchlists(
                                                                    stagedWatchlists,
                                                                );
                                                                if (
                                                                    stagedWatchlists.length >
                                                                    0
                                                                ) {
                                                                    setSelectedChannels(
                                                                        [],
                                                                    );
                                                                    setStagedChannels(
                                                                        [],
                                                                    );
                                                                }
                                                                fetchPosts({
                                                                    watchlist:
                                                                        stagedWatchlists,
                                                                    creator:
                                                                        stagedWatchlists.length >
                                                                            0
                                                                            ? []
                                                                            : undefined,
                                                                });
                                                                setActiveDropdown(
                                                                    null,
                                                                );
                                                            }}
                                                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${JSON.stringify(
                                                                stagedWatchlists,
                                                            ) !==
                                                                    JSON.stringify(
                                                                        selectedWatchlists,
                                                                    )
                                                                    ? "bg-white text-primary-600 shadow-sm ring-1 ring-black/5 hover:bg-slate-50"
                                                                    : "text-white hover:text-primary-600 hover:bg-white"
                                                                }`}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto">
                                                        {availableWatchlists.map(
                                                            (w) => (
                                                                <button
                                                                    key={w.id}
                                                                    role="option"
                                                                    aria-selected={stagedWatchlistSet.has(
                                                                        w.id,
                                                                    )}
                                                                    onClick={() => {
                                                                        setStagedWatchlists(
                                                                            (
                                                                                prev,
                                                                            ) => {
                                                                                const next =
                                                                                    prev.includes(
                                                                                        w.id,
                                                                                    )
                                                                                        ? prev.filter(
                                                                                            (
                                                                                                id,
                                                                                            ) =>
                                                                                                id !==
                                                                                                w.id,
                                                                                        )
                                                                                        : [
                                                                                            ...prev,
                                                                                            w.id,
                                                                                        ];
                                                                                if (
                                                                                    next.length >
                                                                                    0
                                                                                )
                                                                                    setStagedChannels(
                                                                                        [],
                                                                                    );
                                                                                return next;
                                                                            },
                                                                        );
                                                                    }}
                                                                    className={`w-[calc(100%-16px)] mx-2 my-1 flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors rounded-2xl ${stagedWatchlistSet.has(w.id) ? "bg-primary-50/30" : ""}`}
                                                                >
                                                                    <div
                                                                        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${stagedWatchlistSet.has(w.id) ? "bg-primary-500 border-primary-500 text-white" : "border-slate-300 bg-white"}`}
                                                                    >
                                                                        {stagedWatchlistSet.has(
                                                                            w.id,
                                                                        ) && (
                                                                                <svg
                                                                                    className="w-3.5 h-3.5"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="3"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    />
                                                                                </svg>
                                                                            )}
                                                                    </div>
                                                                    <div className="text-left flex-1">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <div
                                                                                className={`truncate text-sm font-bold ${stagedWatchlistSet.has(w.id) ? "text-primary-600" : "text-slate-700"}`}
                                                                            >
                                                                                {
                                                                                    w.name
                                                                                }
                                                                            </div>
                                                                            <span
                                                                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${stagedWatchlistSet.has(
                                                                                    w.id,
                                                                                )
                                                                                        ? "border-primary-200 bg-primary-50 text-primary-600"
                                                                                        : "border-slate-200 bg-slate-50 text-slate-500"
                                                                                    }`}
                                                                            >
                                                                                {Number(
                                                                                    w.channels_count ??
                                                                                    (Array.isArray(
                                                                                        w.channels,
                                                                                    )
                                                                                        ? w
                                                                                            .channels
                                                                                            .length
                                                                                        : 0),
                                                                                )}{" "}
                                                                                channels
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                                    <svg
                                                        className="w-8 h-8 text-primary-300 mb-2"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="1.5"
                                                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                                        />
                                                    </svg>
                                                    <p className="text-sm font-semibold text-slate-600">
                                                        No watchlists yet
                                                    </p>
                                                    <p className="text-[11px] text-slate-600 mt-0.5">
                                                        Create a watchlist to filter
                                                        by it
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Channels Filter */}
                                <div className="relative">
                                    <Tooltip
                                        text="Filter By Specific Creator"
                                        position="top"
                                        showOnFocus={false}
                                        showOnClick={false}
                                    >
                                        <FilterPill
                                            label={
                                                selectedChannels.length > 0
                                                    ? `${selectedChannels.length} channel${selectedChannels.length > 1 ? "s" : ""}`
                                                    : "All Channels"
                                            }
                                            active={
                                                activeDropdown === "channel" ||
                                                selectedChannels.length > 0
                                            }
                                            onClick={() =>
                                                setActiveDropdown(
                                                    activeDropdown === "channel"
                                                        ? null
                                                        : "channel",
                                                )
                                            }
                                            dropdownName="channel"
                                        />
                                    </Tooltip>
                                    {activeDropdown === "channel" && (
                                        <div
                                            id="video-filter-channel"
                                            role="listbox"
                                            tabIndex={-1}
                                            ref={(node) => {
                                                dropdownRefs.current.channel = node;
                                            }}
                                            className="fixed inset-x-4 top-1/2 z-[120] max-h-[80vh] w-auto -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:z-[100] sm:mt-2 sm:w-80 sm:max-h-none sm:translate-y-0 sm:overflow-hidden sm:overscroll-auto"
                                        >
                                            {availableChannels.length > 0 ? (
                                                <>
                                                    {/* Clear / Apply header */}
                                                    <div className="p-1 px-2 border-b border-slate-100 flex items-center justify-between bg-primary-500 rounded-t-xl">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedChannels(
                                                                    [],
                                                                );
                                                                setStagedChannels(
                                                                    [],
                                                                );
                                                                setActiveDropdown(
                                                                    null,
                                                                );
                                                                fetchPosts({
                                                                    creator: [],
                                                                });
                                                            }}
                                                            className="text-[11px] font-bold text-white hover:text-white flex items-center gap-1 px-2 py-1.5 transition-colors"
                                                        >
                                                            <Icon
                                                                name="x"
                                                                size={4}
                                                            />
                                                            Clear
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedChannels(
                                                                    stagedChannels,
                                                                );
                                                                if (
                                                                    stagedChannels.length >
                                                                    0
                                                                ) {
                                                                    setSelectedWatchlists(
                                                                        [],
                                                                    );
                                                                    setStagedWatchlists(
                                                                        [],
                                                                    );
                                                                }
                                                                fetchPosts({
                                                                    creator:
                                                                        stagedChannels,
                                                                    watchlist:
                                                                        stagedChannels.length >
                                                                            0
                                                                            ? []
                                                                            : undefined,
                                                                });
                                                                setActiveDropdown(
                                                                    null,
                                                                );
                                                            }}
                                                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${JSON.stringify(
                                                                stagedChannels,
                                                            ) !==
                                                                    JSON.stringify(
                                                                        selectedChannels,
                                                                    )
                                                                    ? "bg-white text-primary-600 shadow-sm ring-1 ring-black/5 hover:bg-slate-50"
                                                                    : "text-white hover:text-primary-600 hover:bg-white"
                                                                }`}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>

                                                    {/* Search box   shown when there are channels */}
                                                    <div className="px-3 py-2 border-b border-slate-100">
                                                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3  transition-all focus-within:ring-1 focus-within:ring-primary-300 focus-within:border-primary-400 shadow-sm">
                                                            <Icon
                                                                name="search"
                                                                size={4}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Search channels..."
                                                                value={
                                                                    channelSearch
                                                                }
                                                                onChange={(e) =>
                                                                    setChannelSearch(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="flex-1 bg-transparent text-[13px] text-slate-700 placeholder-slate-400 focus:ring-0 border-none outline-none"
                                                            />
                                                            {channelSearch && (
                                                                <button
                                                                    onClick={() =>
                                                                        setChannelSearch(
                                                                            "",
                                                                        )
                                                                    }
                                                                    className="text-slate-400 hover:text-slate-600"
                                                                >
                                                                    <Icon
                                                                        name="x"
                                                                        size={4}
                                                                    />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Channel list, filtered by search */}
                                                    <div className="max-h-72 overflow-y-auto">
                                                        {filteredChannelOptions.map(
                                                            (c) => {
                                                                const isChannelStaged =
                                                                    stagedChannelSet.has(
                                                                        c.handle,
                                                                    );
                                                                return (
                                                                    <button
                                                                        key={c.id}
                                                                        role="option"
                                                                        aria-selected={
                                                                            isChannelStaged
                                                                        }
                                                                        onClick={() => {
                                                                            setStagedChannels(
                                                                                (
                                                                                    prev,
                                                                                ) => {
                                                                                    const next =
                                                                                        prev.includes(
                                                                                            c.handle,
                                                                                        )
                                                                                            ? prev.filter(
                                                                                                (
                                                                                                    h,
                                                                                                ) =>
                                                                                                    h !==
                                                                                                    c.handle,
                                                                                            )
                                                                                            : [
                                                                                                ...prev,
                                                                                                c.handle,
                                                                                            ];
                                                                                    if (
                                                                                        next.length >
                                                                                        0
                                                                                    )
                                                                                        setStagedWatchlists(
                                                                                            [],
                                                                                        );
                                                                                    return next;
                                                                                },
                                                                            );
                                                                        }}
                                                                        className={`w-[calc(100%-16px)] mx-2 my-1 flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors rounded-2xl ${isChannelStaged ? "bg-primary-50/30" : ""}`}
                                                                    >
                                                                        <div
                                                                            className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isChannelStaged ? "bg-primary-500 border-primary-500 text-white" : "border-slate-300 bg-white"}`}
                                                                        >
                                                                            {isChannelStaged && (
                                                                                <svg
                                                                                    className="w-3.5 h-3.5"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="3"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                        <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                                                            {c.profile_image_url ? (
                                                                                <img
                                                                                    src={
                                                                                        c.profile_image_url
                                                                                    }
                                                                                    alt={
                                                                                        c.name
                                                                                    }
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                                    <svg
                                                                                        className="w-5 h-5"
                                                                                        fill="currentColor"
                                                                                        viewBox="0 0 24 24"
                                                                                    >
                                                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                                                                                    </svg>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 text-left">
                                                                            <div
                                                                                className={`text-[13px] font-bold ${isChannelStaged ? "text-primary-600" : "text-slate-800"}`}
                                                                            >
                                                                                {
                                                                                    c.handle
                                                                                }
                                                                            </div>
                                                                            <div className="text-[11px] font-medium text-slate-400">
                                                                                {(
                                                                                    c.followers_count ||
                                                                                    0
                                                                                ).toLocaleString()}{" "}
                                                                                followers
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            },
                                                        )}
                                                        {/* No results for search */}
                                                        {filteredChannelOptions.length ===
                                                            0 && (
                                                                <div className="py-6 text-center text-sm text-slate-400">
                                                                    No channels match "
                                                                    {channelSearch}"
                                                                </div>
                                                            )}
                                                    </div>
                                                </>
                                            ) : (
                                                /* Empty state   no channels added */
                                                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                                    <Icon
                                                        name="channel"
                                                        size={4}
                                                        className="w-8 h-8 text-primary-300 mb-2"
                                                    />
                                                    <p className="text-sm font-semibold text-slate-400">
                                                        No channels added yet
                                                    </p>
                                                    <p className="text-[11px] text-slate-300 mt-0.5">
                                                        Track a channel to filter by
                                                        creator
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Saved Filters */}
                                {hasSavedFilters && (
                                    <div className="relative">
                                        <Tooltip
                                            text="Apply A Saved Filter Preset"
                                            position="top"
                                            showOnFocus={false}
                                            showOnClick={false}
                                        >
                                            <FilterPill
                                                label={
                                                    selectedSavedFilter
                                                        ? selectedSavedFilter.name
                                                        : `Saved (${savedFilterPresets.length})`
                                                }
                                                active={
                                                    activeDropdown ===
                                                    "saved_filter" ||
                                                    selectedSavedFilterId !== null
                                                }
                                                customIcon={
                                                    <Save className="w-3.5 h-3.5" />
                                                }
                                                onClick={() => {
                                                    setStagedSavedFilterId(
                                                        selectedSavedFilterId ??
                                                        null,
                                                    );
                                                    setActiveDropdown(
                                                        activeDropdown ===
                                                            "saved_filter"
                                                            ? null
                                                            : "saved_filter",
                                                    );
                                                }}
                                                dropdownName="saved_filter"
                                            />
                                        </Tooltip>
                                        {activeDropdown === "saved_filter" && (
                                            <div
                                                id="video-filter-saved_filter"
                                                role="listbox"
                                                tabIndex={-1}
                                                ref={(node) => {
                                                    dropdownRefs.current.saved_filter =
                                                        node;
                                                }}
                                                className="fixed inset-x-4 top-1/2 z-[120] max-h-[80vh] w-auto -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:z-[100] sm:mt-2 sm:w-80 sm:max-h-none sm:translate-y-0 sm:overflow-hidden sm:overscroll-auto"
                                            >
                                                <div className="p-1 px-2 border-b border-slate-100 flex items-center justify-between bg-primary-500 rounded-t-xl">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSavedFilterId(
                                                                null,
                                                            );
                                                            setStagedSavedFilterId(
                                                                null,
                                                            );
                                                            setActiveDropdown(null);
                                                        }}
                                                        className="text-[11px] font-bold text-white hover:text-white flex items-center gap-1 px-2 py-1.5 transition-colors"
                                                    >
                                                        <Icon name="x" size={4} />
                                                        Clear
                                                    </button>
                                                    <button
                                                        onClick={
                                                            handleApplySavedFilters
                                                        }
                                                        disabled={
                                                            !stagedSavedFilterId
                                                        }
                                                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${String(
                                                            stagedSavedFilterId ??
                                                            "",
                                                        ) !==
                                                                String(
                                                                    selectedSavedFilterId ??
                                                                    "",
                                                                )
                                                                ? "bg-white text-primary-600 shadow-sm ring-1 ring-black/5 hover:bg-slate-50"
                                                                : "text-white hover:text-primary-600 hover:bg-white disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white"
                                                            }`}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                                <div className="max-h-72 overflow-y-auto">
                                                    {savedFilterPresets.map(
                                                        (preset) => {
                                                            const isPresetStaged =
                                                                String(
                                                                    stagedSavedFilterId ??
                                                                    "",
                                                                ) ===
                                                                String(preset.id);
                                                            const isPresetApplied =
                                                                String(
                                                                    selectedSavedFilterId ??
                                                                    "",
                                                                ) ===
                                                                String(preset.id);

                                                            return (
                                                                <div
                                                                    key={preset.id}
                                                                    className="w-[calc(100%-16px)] mx-2 my-1 flex items-center gap-2 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <button
                                                                        role="option"
                                                                        aria-selected={
                                                                            isPresetStaged
                                                                        }
                                                                        onClick={() =>
                                                                            setStagedSavedFilterId(
                                                                                preset.id,
                                                                            )
                                                                        }
                                                                        className={`flex-1 flex items-center gap-3 px-3 py-2.5 text-left rounded-2xl ${isPresetStaged ? "bg-primary-50/40" : ""}`}
                                                                    >
                                                                        <div
                                                                            className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isPresetStaged ? "bg-primary-500 border-primary-500 text-white" : "border-slate-300 bg-white"}`}
                                                                        >
                                                                            {isPresetStaged && (
                                                                                <svg
                                                                                    className="w-3.5 h-3.5"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="3"
                                                                                        d="M5 13l4 4L19 7"
                                                                                    />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div
                                                                                className={`truncate text-[13px] font-bold ${isPresetStaged ? "text-primary-600" : "text-slate-800"}`}
                                                                            >
                                                                                {
                                                                                    preset.name
                                                                                }
                                                                            </div>
                                                                            <div className="text-[11px] text-slate-400">
                                                                                {isPresetApplied
                                                                                    ? "Currently applied"
                                                                                    : "Saved preset"}
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                    <button
                                                                        onClick={(
                                                                            event,
                                                                        ) => {
                                                                            event.stopPropagation();
                                                                            handleRequestDeleteSavedFilter(
                                                                                preset.id,
                                                                            );
                                                                        }}
                                                                        className="mr-2 p-2 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                                                                        aria-label={`Delete ${preset.name}`}
                                                                        title={`Delete ${preset.name}`}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Posted Date Filter */}
                                <div className="relative">
                                    <Tooltip
                                        text="Filter By Posted Date"
                                        position="top"
                                        showOnFocus={false}
                                        showOnClick={false}
                                    >
                                        <FilterPill
                                            label={
                                                dateValue !== "0"
                                                    ? `Last ${dateValue} ${dateUnit.toLowerCase()}`
                                                    : "Posted Date"
                                            }
                                            active={
                                                activeDropdown === "posted_date" ||
                                                dateValue !== "0"
                                            }
                                            onClick={() =>
                                                setActiveDropdown(
                                                    activeDropdown === "posted_date"
                                                        ? null
                                                        : "posted_date",
                                                )
                                            }
                                            dropdownName="posted_date"
                                        />
                                    </Tooltip>
                                    {activeDropdown === "posted_date" && (
                                        <div
                                            id="video-filter-posted_date"
                                            role="dialog"
                                            tabIndex={-1}
                                            ref={(node) => {
                                                dropdownRefs.current.posted_date =
                                                    node;
                                            }}
                                            className="fixed inset-x-4 top-1/2 z-[120] max-h-[80vh] w-auto -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:z-[100] sm:mt-2 sm:w-80 sm:max-h-none sm:translate-y-0 sm:overflow-visible sm:overscroll-auto"
                                        >
                                            <div className="p-1 px-2 border-b border-slate-100 flex items-center justify-between bg-primary-500 rounded-t-xl">
                                                <button
                                                    onClick={() => {
                                                        setDateValue("0");
                                                        setStagedDateValue("0");
                                                        setDateUnit("Months");
                                                        setStagedDateUnit("Months");
                                                        fetchPosts({
                                                            date_value: "0",
                                                            date_unit: "Months",
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="text-[11px] font-bold text-white hover:text-white flex items-center gap-1 px-2 py-1.5 transition-colors"
                                                >
                                                    <svg
                                                        className="w-3 h-3"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2.5"
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                    Clear
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDateValue(
                                                            stagedDateValue,
                                                        );
                                                        setDateUnit(stagedDateUnit);
                                                        fetchPosts({
                                                            date_value:
                                                                stagedDateValue,
                                                            date_unit:
                                                                stagedDateUnit,
                                                        });
                                                        setActiveDropdown(null);
                                                        setShowUnitDropdown(false);
                                                    }}
                                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${stagedDateValue !==
                                                            dateValue ||
                                                            stagedDateUnit !== dateUnit
                                                            ? "bg-white text-primary-600 shadow-sm ring-1 ring-black/5 hover:bg-slate-50"
                                                            : "text-white hover:text-primary-600 hover:bg-white"
                                                        }`}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            <div className="p-5">
                                                <p className="text-[13px] text-slate-400 leading-relaxed mb-4">
                                                    How recently the video was
                                                    posted
                                                </p>
                                                <div className="flex items-center gap-3 relative">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <span className="text-xs font-medium text-slate-400">
                                                            Last
                                                        </span>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-400 transition-all text-slate-600 font-medium"
                                                            value={stagedDateValue}
                                                            onChange={(e) => {
                                                                const val =
                                                                    e.target.value.replace(
                                                                        /[^0-9]/g,
                                                                        "",
                                                                    );
                                                                setStagedDateValue(
                                                                    val || "0",
                                                                );
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Custom Unit Selector */}
                                                    <div className="relative flex-1 group">
                                                        <button
                                                            onClick={() =>
                                                                setShowUnitDropdown(
                                                                    !showUnitDropdown,
                                                                )
                                                            }
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-400 transition-all text-slate-600 font-medium flex items-center justify-between hover:border-slate-300"
                                                        >
                                                            {stagedDateUnit}
                                                            <svg
                                                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showUnitDropdown ? "rotate-180" : ""}`}
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="2"
                                                                    d="M19 9l-7 7-7-7"
                                                                />
                                                            </svg>
                                                        </button>

                                                        {showUnitDropdown && (
                                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                                                {[
                                                                    "Days",
                                                                    "Weeks",
                                                                    "Months",
                                                                    "Years",
                                                                ].map((unit) => (
                                                                    <button
                                                                        key={unit}
                                                                        onClick={() => {
                                                                            setStagedDateUnit(
                                                                                unit,
                                                                            );
                                                                            setShowUnitDropdown(
                                                                                false,
                                                                            );
                                                                        }}
                                                                        className={`w-[calc(100%-12px)] mx-1.5 px-3 py-2 text-[13px] text-left rounded-xl transition-colors ${stagedDateUnit === unit ? "bg-primary-50 text-primary-600 font-bold" : "text-slate-600 hover:bg-slate-50 font-medium"}`}
                                                                    >
                                                                        {unit}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Platform Filter */}
                                <div className="relative hidden">
                                    <Tooltip
                                        text="Filter By Platform"
                                        position="top"
                                        showOnFocus={false}
                                        showOnClick={false}
                                    >
                                        <FilterPill
                                            label={
                                                selectedPlatforms.length > 0
                                                    ? `${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? "s" : ""}`
                                                    : "All Platforms"
                                            }
                                            customIcon={
                                                selectedPlatforms.length > 0 ? (
                                                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                                                        {selectedPlatforms.map(
                                                            (p) => (
                                                                <div
                                                                    key={p}
                                                                    className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 ring-2 ring-white z-10 scale-90 border border-slate-100"
                                                                >
                                                                    {
                                                                        platformIcons[
                                                                        p
                                                                        ]
                                                                    }
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : null
                                            }
                                            active={
                                                activeDropdown === "platform" ||
                                                selectedPlatforms.length > 0
                                            }
                                            onClick={() =>
                                                setActiveDropdown(
                                                    activeDropdown === "platform"
                                                        ? null
                                                        : "platform",
                                                )
                                            }
                                            dropdownName="platform"
                                        />
                                    </Tooltip>
                                    {activeDropdown === "platform" && (
                                        <div
                                            id="video-filter-platform"
                                            role="listbox"
                                            tabIndex={-1}
                                            ref={(node) => {
                                                dropdownRefs.current.platform =
                                                    node;
                                            }}
                                            className="fixed inset-x-4 top-1/2 z-[120] max-h-[80vh] w-auto -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:z-[100] sm:mt-2 sm:w-80 sm:max-h-none sm:translate-y-0 sm:overflow-hidden sm:overscroll-auto"
                                        >
                                            <div className="p-1 px-2 border-b border-slate-100 flex items-center justify-between bg-primary-500 rounded-t-xl">
                                                <button
                                                    onClick={() => {
                                                        setSelectedPlatforms([]);
                                                        fetchPosts({
                                                            platform: [],
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="text-[11px] font-bold text-white hover:text-white flex items-center gap-1 px-2 py-1.5 transition-colors"
                                                >
                                                    <svg
                                                        className="w-3 h-3"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2.5"
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                    Clear
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setActiveDropdown(null)
                                                    }
                                                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent text-white hover:text-primary-600 hover:bg-white"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            <div className="p-5">
                                                <p className="text-[13px] text-slate-400 leading-relaxed mb-4">
                                                    Select which platforms to search
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {/* Coming soon platforms */}
                                                    {[
                                                        {
                                                            id: "youtube",
                                                            label: "YouTube",
                                                            icon: platformIcons.youtube,
                                                        },
                                                        {
                                                            id: "tiktok",
                                                            label: "TikTok",
                                                            icon: platformIcons.tiktok,
                                                        },
                                                        {
                                                            id: "linkedin",
                                                            label: "LinkedIn",
                                                            icon: platformIcons.linkedin,
                                                        },
                                                    ].map((p) => (
                                                        <div
                                                            key={p.id}
                                                            className="relative"
                                                        >
                                                            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed select-none text-sm font-medium">
                                                                {p.icon}
                                                                {p.label}
                                                            </div>
                                                            <span className="absolute -top-2 -right-1 text-[9px] font-bold tracking-wide uppercase bg-slate-100 text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">
                                                                Soon
                                                            </span>
                                                        </div>
                                                    ))}

                                                    {/* Active: Instagram only */}
                                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-accent-50 border-accent-100 text-accent-600 shadow-sm cursor-default select-none text-sm font-medium">
                                                        {platformIcons.instagram}
                                                        Instagram
                                                        <svg
                                                            className="w-3.5 h-3.5 ml-0.5"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="3"
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Viral Status Filter */}
                                <div className="relative">
                                    <Tooltip
                                        text="Filter By Viral Status"
                                        position="top"
                                        showOnFocus={false}
                                        showOnClick={false}
                                    >
                                        <FilterPill
                                            label={
                                                selectedLabels.length > 0
                                                    ? `${selectedLabels.length} selected`
                                                    : "Viral Status"
                                            }
                                            active={
                                                activeDropdown === "label" ||
                                                selectedLabels.length > 0
                                            }
                                            onClick={() =>
                                                setActiveDropdown(
                                                    activeDropdown === "label"
                                                        ? null
                                                        : "label",
                                                )
                                            }
                                            dropdownName="label"
                                        />
                                    </Tooltip>
                                    {activeDropdown === "label" && (
                                        <div
                                            id="video-filter-label"
                                            role="listbox"
                                            tabIndex={-1}
                                            ref={(node) => {
                                                dropdownRefs.current.label = node;
                                            }}
                                            className="fixed inset-x-4 top-1/2 z-[120] max-h-[80vh] w-auto -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:z-[100] sm:mt-2 sm:w-[340px] sm:max-h-none sm:translate-y-0 sm:overflow-hidden sm:overscroll-auto"
                                        >
                                            <div className="p-1 px-2 border-b border-slate-100 flex items-center justify-between bg-primary-500 rounded-t-xl">
                                                <button
                                                    onClick={() => {
                                                        setSelectedLabels([]);
                                                        setStagedLabels([]);
                                                        fetchPosts({ label: [] });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="text-[11px] font-bold text-white hover:text-white flex items-center gap-1 px-2 py-1.5 transition-colors"
                                                >
                                                    <svg
                                                        className="w-3 h-3"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2.5"
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                    Clear
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedLabels(
                                                            stagedLabels,
                                                        );
                                                        fetchPosts({
                                                            label: stagedLabels,
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${JSON.stringify(
                                                        stagedLabels,
                                                    ) !==
                                                            JSON.stringify(
                                                                selectedLabels,
                                                            )
                                                            ? "bg-white text-primary-600 shadow-sm ring-1 ring-black/5 hover:bg-slate-50"
                                                            : "text-white hover:text-primary-600 hover:bg-white"
                                                        }`}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            <div className="p-5">
                                                <div className="space-y-4">
                                                    {PERFORMANCE_FILTER_OPTIONS.map(
                                                        (status) => (
                                                            <label
                                                                key={status.id}
                                                                className="flex items-start gap-3 cursor-pointer group"
                                                            >
                                                                <div
                                                                    className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${stagedLabelSet.has(status.id) ? "bg-primary-500 border-primary-500 text-white" : "border-slate-300 bg-white group-hover:border-primary-400"}`}
                                                                >
                                                                    {stagedLabelSet.has(
                                                                        status.id,
                                                                    ) && (
                                                                            <svg
                                                                                className="w-3.5 h-3.5"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                viewBox="0 0 24 24"
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    strokeWidth="3"
                                                                                    d="M5 13l4 4L19 7"
                                                                                />
                                                                            </svg>
                                                                        )}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={stagedLabelSet.has(
                                                                        status.id,
                                                                    )}
                                                                    onChange={() => {
                                                                        setStagedLabels(
                                                                            (
                                                                                prev,
                                                                            ) =>
                                                                                prev.includes(
                                                                                    status.id,
                                                                                )
                                                                                    ? prev.filter(
                                                                                        (
                                                                                            l,
                                                                                        ) =>
                                                                                            l !==
                                                                                            status.id,
                                                                                    )
                                                                                    : [
                                                                                        ...prev,
                                                                                        status.id,
                                                                                    ],
                                                                        );
                                                                    }}
                                                                />
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                    <span
                                                                        className={`text-[13px] font-bold flex items-center gap-1.5 transition-colors ${stagedLabelSet.has(status.id) ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"}`}
                                                                    >
                                                                        <span>
                                                                            {getPerformanceLabelIcon(
                                                                                status.id,
                                                                            )}
                                                                        </span>
                                                                        {
                                                                            status.label
                                                                        }
                                                                    </span>
                                                                    <span className="truncate text-[11px] font-medium leading-none text-slate-400 transition-colors group-hover:text-slate-500">
                                                                        (
                                                                        {
                                                                            status.desc
                                                                        }
                                                                        )
                                                                    </span>
                                                                </div>
                                                            </label>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Performance Filter (formerly Outlier) */}
                                <div className="relative">
                                    <Tooltip
                                        text="Filter By Performance Multiplier"
                                        position="top"
                                        showOnFocus={false}
                                        showOnClick={false}
                                    >
                                        <FilterPill
                                            label={
                                                outlierMin
                                                    ? `> ${outlierMin}x performance`
                                                    : "Performance"
                                            }
                                            active={
                                                activeDropdown === "outlier" ||
                                                outlierMin ||
                                                outlierMax
                                            }
                                            onClick={() =>
                                                setActiveDropdown(
                                                    activeDropdown === "outlier"
                                                        ? null
                                                        : "outlier",
                                                )
                                            }
                                            dropdownName="outlier"
                                        />
                                    </Tooltip>
                                    {activeDropdown === "outlier" && (
                                        <div
                                            id="video-filter-outlier"
                                            role="dialog"
                                            tabIndex={-1}
                                            ref={(node) => {
                                                dropdownRefs.current.outlier = node;
                                            }}
                                            className="fixed inset-x-4 top-1/2 z-[120] max-h-[80vh] w-auto -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:z-[100] sm:mt-2 sm:w-80 sm:max-h-none sm:translate-y-0 sm:overflow-hidden sm:overscroll-auto"
                                        >
                                            <div className="p-1 px-2 border-b border-slate-100 flex items-center justify-between bg-primary-500 rounded-t-xl">
                                                <button
                                                    onClick={() => {
                                                        setOutlierMin("");
                                                        setStagedOutlierMin("");
                                                        setOutlierMax("");
                                                        setStagedOutlierMax("");
                                                        fetchPosts({
                                                            outlier_min: "",
                                                            outlier_max: "",
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="text-[11px] font-bold text-white hover:text-white flex items-center gap-1 px-2 py-1.5 transition-colors"
                                                >
                                                    <svg
                                                        className="w-3 h-3"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2.5"
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                    Clear
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setOutlierMin(
                                                            stagedOutlierMin,
                                                        );
                                                        setOutlierMax(
                                                            stagedOutlierMax,
                                                        );
                                                        fetchPosts({
                                                            outlier_min:
                                                                stagedOutlierMin,
                                                            outlier_max:
                                                                stagedOutlierMax,
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${stagedOutlierMin !==
                                                            outlierMin ||
                                                            stagedOutlierMax !==
                                                            outlierMax
                                                            ? "bg-white text-primary-600 shadow-sm ring-1 ring-black/5 hover:bg-slate-50"
                                                            : "text-white hover:text-primary-600 hover:bg-white"
                                                        }`}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            <div className="p-5">
                                                <p className="text-[13px] text-slate-400 leading-relaxed mb-4">
                                                    Compare a video's performance to
                                                    the channel's usual views. A 10x
                                                    multiplier means the video got
                                                    10 times more views than
                                                    average.
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex-1">
                                                        Minimum Multiplier
                                                    </div>
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="100"
                                                            step=".1"
                                                            inputMode="decimal"
                                                            placeholder="1"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-400 transition-all text-slate-600 font-medium pr-8"
                                                            value={stagedOutlierMin}
                                                            onChange={(e) => {
                                                                const val =
                                                                    e.target.value.replace(
                                                                        /[^0-9.]/g,
                                                                        "",
                                                                    );
                                                                if (
                                                                    val === "" ||
                                                                    (!isNaN(val) &&
                                                                        parseFloat(
                                                                            val,
                                                                        ) >= 0)
                                                                ) {
                                                                    setStagedOutlierMin(
                                                                        val,
                                                                    );
                                                                }
                                                            }}
                                                        />
                                                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                                                            X
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Views Filter */}
                                <div className="relative">
                                    <Tooltip
                                        text="Filter By minimum view count"
                                        position="top"
                                        showOnFocus={false}
                                        showOnClick={false}
                                    >
                                        <FilterPill
                                            label={
                                                viewsMin
                                                    ? `> ${parseInt(viewsMin).toLocaleString()} views`
                                                    : "Views"
                                            }
                                            active={
                                                activeDropdown === "views" ||
                                                viewsMin
                                            }
                                            onClick={() =>
                                                setActiveDropdown(
                                                    activeDropdown === "views"
                                                        ? null
                                                        : "views",
                                                )
                                            }
                                            dropdownName="views"
                                        />
                                    </Tooltip>
                                    {activeDropdown === "views" && (
                                        <div
                                            id="video-filter-views"
                                            role="dialog"
                                            tabIndex={-1}
                                            ref={(node) => {
                                                dropdownRefs.current.views = node;
                                            }}
                                            className="fixed inset-x-4 top-1/2 z-[120] max-h-[80vh] w-auto -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:z-[100] sm:mt-2 sm:w-80 sm:max-h-none sm:translate-y-0 sm:overflow-hidden sm:overscroll-auto"
                                        >
                                            <div className="p-1 px-2 border-b border-slate-100 flex items-center justify-between bg-primary-500 rounded-t-xl">
                                                <button
                                                    onClick={() => {
                                                        setViewsMin("");
                                                        setStagedViewsMin("");
                                                        setViewsMax("");
                                                        setStagedViewsMax("");
                                                        fetchPosts({
                                                            views_min: "",
                                                            views_max: "",
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="text-[11px] font-bold text-white hover:text-white flex items-center gap-1 px-2 py-1.5 transition-colors"
                                                >
                                                    <svg
                                                        className="w-3 h-3"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2.5"
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                    Clear
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setViewsMin(stagedViewsMin);
                                                        fetchPosts({
                                                            views_min:
                                                                stagedViewsMin,
                                                            views_max: "",
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${stagedViewsMin !== viewsMin
                                                            ? "bg-white text-primary-600 shadow-sm ring-1 ring-black/5 hover:bg-slate-50"
                                                            : "text-white hover:text-primary-600 hover:bg-white"
                                                        }`}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            <div className="p-5">
                                                <p className="text-[13px] text-slate-400 leading-relaxed mb-4">
                                                    Only show videos with more than
                                                    a certain number of views.
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex-1">
                                                        Minimum Views
                                                    </div>
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            placeholder="0"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-400 transition-all text-slate-600 font-medium"
                                                            value={stagedViewsMin}
                                                            onChange={(e) => {
                                                                const val =
                                                                    e.target.value.replace(
                                                                        /[^0-9]/g,
                                                                        "",
                                                                    );
                                                                setStagedViewsMin(
                                                                    val,
                                                                );
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Engagement Rate Filter */}
                                <div className="relative">
                                    <Tooltip
                                        text="Filter By minimum engagement rate"
                                        position="top"
                                        showOnFocus={false}
                                        showOnClick={false}
                                    >
                                        <FilterPill
                                            label={
                                                engagementMin
                                                    ? `> ${engagementMin}% engagement`
                                                    : "Engagement Rate"
                                            }
                                            active={
                                                activeDropdown === "engagement" ||
                                                engagementMin
                                            }
                                            onClick={() =>
                                                setActiveDropdown(
                                                    activeDropdown === "engagement"
                                                        ? null
                                                        : "engagement",
                                                )
                                            }
                                            dropdownName="engagement"
                                        />
                                    </Tooltip>
                                    {activeDropdown === "engagement" && (
                                        <div
                                            id="video-filter-engagement"
                                            role="dialog"
                                            tabIndex={-1}
                                            ref={(node) => {
                                                dropdownRefs.current.engagement =
                                                    node;
                                            }}
                                            className="fixed inset-x-4 top-1/2 z-[120] max-h-[80vh] w-auto -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:z-[100] sm:mt-2 sm:w-80 sm:max-h-none sm:translate-y-0 sm:overflow-hidden sm:overscroll-auto"
                                        >
                                            <div className="p-1 px-2 border-b border-slate-100 flex items-center justify-between bg-primary-500 rounded-t-xl">
                                                <button
                                                    onClick={() => {
                                                        setEngagementMin("");
                                                        setStagedEngagementMin("");
                                                        setEngagementMax("");
                                                        setStagedEngagementMax("");
                                                        fetchPosts({
                                                            engagement_min: "",
                                                            engagement_max: "",
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="text-[11px] font-bold text-white hover:text-white flex items-center gap-1 px-2 py-1.5 transition-colors"
                                                >
                                                    <svg
                                                        className="w-3 h-3"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2.5"
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                    Clear
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEngagementMin(
                                                            stagedEngagementMin,
                                                        );
                                                        fetchPosts({
                                                            engagement_min:
                                                                stagedEngagementMin,
                                                            engagement_max: "",
                                                        });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-transparent ${stagedEngagementMin !==
                                                            engagementMin
                                                            ? "bg-white text-primary-600 shadow-sm ring-1 ring-black/5 hover:bg-slate-50"
                                                            : "text-white hover:text-primary-600 hover:bg-white"
                                                        }`}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            <div className="p-5">
                                                <p className="text-[13px] text-slate-600 leading-relaxed mb-4 text-center">
                                                    (Likes + comments) / views.
                                                    <br />
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        Benchmarks: Avg 2%, Viral
                                                        5%+
                                                    </span>
                                                </p>

                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex-1 text-[13px] font-semibold text-slate-700">
                                                        Minimum Engagement
                                                    </div>
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="0.0"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-400 transition-all text-slate-600 font-medium pr-8 text-center"
                                                            value={
                                                                stagedEngagementMin
                                                            }
                                                            onChange={(e) => {
                                                                const val =
                                                                    e.target.value.replace(
                                                                        /[^0-9.]/g,
                                                                        "",
                                                                    );
                                                                if (
                                                                    val === "" ||
                                                                    (!isNaN(val) &&
                                                                        parseFloat(
                                                                            val,
                                                                        ) >= 0)
                                                                ) {
                                                                    setStagedEngagementMin(
                                                                        val,
                                                                    );
                                                                }
                                                            }}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                                                            %
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-nowrap sm:flex-wrap items-center justify-start gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 sm:gap-3">
                                {posts.length > 0 && (
                                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-1.5 py-1 shadow-sm">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleSelectVisibleVideos}
                                            disabled={
                                                selectedVisibleCount >=
                                                visiblePostIds.length
                                            }
                                            className="w-full text-xs font-bold bg-white shadow-none focus:ring-0 focus:ring-offset-0 sm:w-auto"
                                        >
                                            Select Visible
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleDeselectVisibleVideos}
                                            disabled={selectedVisibleCount === 0}
                                            className="w-full text-xs font-bold bg-white shadow-none focus:ring-0 focus:ring-offset-0 sm:w-auto"
                                        >
                                            Deselect Visible
                                        </Button>
                                    </div>
                                )}

                                {/* Save Filter and Clear moved to top row */}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {channelsCount > 0 && isFilterLoading && (
                <div className="mb-4">
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-primary-500/80 rounded-full animate-pulse" />
                    </div>
                </div>
            )}

            {/* Content */}
            <LibraryVideoGrid
                loading={loading}
                loadingMore={loadingMore}
                channelsCount={channelsCount}
                posts={posts}
                hasMore={hasMore}
                selectedChannels={selectedChannels}
                selectedVideoSet={selectedVideoSet}
                processingId={processingId}
                onToggleSelect={toggleVideoSelection}
                onApplyPreset={(preset) =>
                    applyFiltersFromSnapshot(preset.filters)
                }
                onLoadMore={loadMore}
            />

            {/* Floating Action Bar (FAB) for Bulk Selection */}
            <LibraryBulkFab
                fabRef={fabRef}
                dropdownProjectRef={(node) => {
                    dropdownRefs.current.projectFab = node;
                }}
                selectedCount={selectedVideos.length}
                projects={projects}
                selectedProjectId={selectedProjectId}
                isProjectDropdownOpen={isProjectDropdownOpen}
                isBulkAdding={isBulkAdding}
                onSelectProject={(id) => {
                    setSelectedProjectId(id);
                    setIsProjectDropdownOpen(false);
                }}
                onToggleProjectDropdown={() =>
                    setIsProjectDropdownOpen(!isProjectDropdownOpen)
                }
                onBulkAdd={handleBulkAddToProject}
                onClearSelection={() => setSelectedVideos([])}
            />

            {/* Toast Notifications */}
            <div className="fixed left-4 right-4 top-20 z-[200] flex w-auto flex-col gap-3 sm:left-auto sm:w-full sm:max-w-sm pointer-events-none">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        id={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={removeToast}
                    />
                ))}
            </div>

            <SaveFilterDialog
                show={isSaveFilterDialogOpen}
                defaultName={saveFilterNameDraft}
                isLoading={isSavingFilters}
                errorMessage={saveFilterDialogError}
                allowUpdate={canUpdateSelectedSavedFilter}
                selectedFilterName={selectedSavedFilter?.name ?? ""}
                onCancel={handleCloseSaveFilterDialog}
                onConfirm={(name) => handleSaveFilters(name, "create")}
                onUpdate={(name) => handleSaveFilters(name, "update")}
            />

            <ConfirmDialog
                show={isDeleteSavedFilterDialogOpen}
                title="Delete Saved Filter?"
                message={
                    pendingDeleteSavedFilter
                        ? `This will permanently delete "${pendingDeleteSavedFilter.name}".`
                        : "This will permanently delete the selected saved filter."
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={handleConfirmDeleteSavedFilter}
                onCancel={handleCancelDeleteSavedFilter}
                isLoading={isClearingSavedFilters}
                zIndexClass="z-[400]"
            />
        </AuthenticatedLayout>
    );
}
