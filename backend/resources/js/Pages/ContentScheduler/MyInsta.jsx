import EmptyState from "@/Components/EmptyState";
import InstagramDisconnectModal from "@/Components/Instagram/InstagramDisconnectModal";
import InstagramDisconnectedHero from "@/Components/Instagram/InstagramDisconnectedHero";
import InstagramNotConnectedEmptyState from "@/Components/Instagram/InstagramNotConnectedEmptyState";
import useInstagramSelectedAccount from "@/Components/Instagram/useInstagramSelectedAccount";
import Tooltip from "@/Components/Tooltip";
import SharedDropdownSelect from "@/Components/common/DropdownSelect";
import KpiCard from "@/Components/common/KpiCard";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Popover, Transition, Dialog, Menu } from "@headlessui/react";
import { Head, Link, router } from "@inertiajs/react";
import { format as formatDate } from "date-fns";
import { DateRange } from "react-date-range";
import { resolvePresetRange, toLocalDateValue } from "./Analytics/helpers";
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    CalendarRange,
    Check,
    CheckCircle2,
    CloudSyncIcon,
    Eye,
    Heart,
    ImageOff,
    LoaderCircle,
    LogOut,
    MessageCircle,
    Pause,
    Play,
    RotateCcw,
    Send,
    Sparkles,
    X,
    Zap,
    ChevronDown,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./MyInstaDateRange.css";

function DropdownSelect({ label, value, onChange, options, className = "" }) {
    const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {label}
                </label>
            )}
            <Menu as="div" className="relative w-full">
                {({ open }) => (
                    <>
                        <Menu.Button className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50/50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-left">
                            <span className="truncate">{selectedOption?.label}</span>
                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
                        </Menu.Button>

                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl focus:outline-none">
                                {options.map((option) => {
                                    const isSelected = String(option.value) === String(value);
                                    return (
                                        <Menu.Item key={option.value}>
                                            {({ active }) => (
                                                <button
                                                    type="button"
                                                    onClick={() => onChange(option.value)}
                                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors ${active ? "bg-slate-100 text-slate-900" : "text-slate-700"
                                                        } ${isSelected ? "text-primary-700" : ""}`}
                                                >
                                                    <span className="truncate">{option.label}</span>
                                                    {isSelected && (
                                                        <span className="text-primary-600 font-bold" aria-hidden="true">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    );
                                })}
                            </Menu.Items>
                        </Transition>
                    </>
                )}
            </Menu>
        </div>
    );
}

function MultiSelectDropdown({
    label,
    values,
    onApply,
    options,
    className = "",
}) {
    const valuesKey = useMemo(
        () => serializeFormatFilterValues(values),
        [values],
    );
    const [draftValues, setDraftValues] = useState(() =>
        normalizeFormatFilterValues(values),
    );
    const specificOptions = useMemo(
        () =>
            options.filter(
                (option) =>
                    String(option.value || "").trim().toLowerCase() !== "all",
            ),
        [options],
    );

    useEffect(() => {
        setDraftValues(normalizeFormatFilterValues(values));
    }, [valuesKey, values]);

    return (
        <Popover className={`relative space-y-1.5 ${className}`}>
            {({ close, open }) => {
                const currentLabel = resolveFormatFilterLabel(values, options);
                const hasPendingChanges = !areFormatFilterValuesEqual(
                    draftValues,
                    values,
                );

                return (
                    <>
                        {label && (
                            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                {label}
                            </label>
                        )}
                        <Popover.Button
                            onClick={() =>
                                setDraftValues(normalizeFormatFilterValues(values))
                            }
                            className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50/50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                            <span className="truncate">{currentLabel}</span>
                            <ChevronDown
                                className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""
                                    }`}
                            />
                        </Popover.Button>

                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Popover.Panel className="absolute left-0 right-0 z-[120] mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl focus:outline-none">
                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => setDraftValues([])}
                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${draftValues.length === 0
                                                ? "bg-primary-50 text-primary-700"
                                                : "text-slate-700 hover:bg-slate-50"
                                            }`}
                                    >
                                        <span className="truncate">All</span>
                                        {draftValues.length === 0 && (
                                            <Check className="h-4 w-4 text-primary-600" />
                                        )}
                                    </button>

                                    {specificOptions.map((option) => {
                                        const optionValue = String(
                                            option.value || "",
                                        )
                                            .trim()
                                            .toLowerCase();
                                        const isSelected =
                                            draftValues.includes(optionValue);

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() =>
                                                    setDraftValues(
                                                        (previousValues) =>
                                                            toggleFormatFilterValue(
                                                                previousValues,
                                                                optionValue,
                                                            ),
                                                    )
                                                }
                                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${isSelected
                                                        ? "bg-primary-50 text-primary-700"
                                                        : "text-slate-700 hover:bg-slate-50"
                                                    }`}
                                            >
                                                <span className="truncate">
                                                    {option.label}
                                                </span>
                                                {isSelected && (
                                                    <Check className="h-4 w-4 text-primary-600" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-200 px-1 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDraftValues(
                                                normalizeFormatFilterValues(
                                                    values,
                                                ),
                                            );
                                            close();
                                        }}
                                        className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onApply(draftValues);
                                            close();
                                        }}
                                        disabled={!hasPendingChanges}
                                        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary-600 px-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-200 disabled:text-white/80"
                                    >
                                        Update
                                    </button>
                                </div>
                            </Popover.Panel>
                        </Transition>
                    </>
                );
            }}
        </Popover>
    );
}

const formatNumber = (value) =>
    new Intl.NumberFormat().format(Number(value || 0));
const formatCompactNumber = (value) =>
    new Intl.NumberFormat(undefined, {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(Number(value || 0));

const resolveNextPage = (nextPageUrl) => {
    const match = String(nextPageUrl || "").match(/[?&]page=(\d+)/i);
    if (!match) {
        return null;
    }

    return Number(match[1]);
};

const formatPostedAt = (value) => {
    if (!value) {
        return "Unknown date";
    }

    return new Date(value).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatLabel = (value) => {
    if (!value) {
        return "Post";
    }

    return String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const FORMAT_FILTER_ORDER = ["post", "reel", "story", "carousel"];

const normalizeFormatFilterValues = (value) => {
    const rawValues = Array.isArray(value)
        ? value.flatMap((item) => String(item || "").split(","))
        : String(value || "").split(",");
    const normalizedValues = rawValues
        .map((item) => String(item || "").trim().toLowerCase())
        .filter((item) => item !== "");

    if (
        normalizedValues.length === 0 ||
        normalizedValues.includes("all")
    ) {
        return [];
    }

    return FORMAT_FILTER_ORDER.filter((allowedValue) =>
        normalizedValues.includes(allowedValue),
    );
};

const serializeFormatFilterValues = (value) => {
    const normalizedValues = normalizeFormatFilterValues(value);

    return normalizedValues.length === 0
        ? "all"
        : normalizedValues.join(",");
};

const areFormatFilterValuesEqual = (left, right) =>
    serializeFormatFilterValues(left) === serializeFormatFilterValues(right);

const toggleFormatFilterValue = (values, nextValue) => {
    const normalizedValue = String(nextValue || "").trim().toLowerCase();

    if (
        normalizedValue === "" ||
        normalizedValue === "all" ||
        !FORMAT_FILTER_ORDER.includes(normalizedValue)
    ) {
        return [];
    }

    const nextSelectedValues = new Set(normalizeFormatFilterValues(values));

    if (nextSelectedValues.has(normalizedValue)) {
        nextSelectedValues.delete(normalizedValue);
    } else {
        nextSelectedValues.add(normalizedValue);
    }

    return FORMAT_FILTER_ORDER.filter((value) =>
        nextSelectedValues.has(value),
    );
};

const resolveFormatFilterLabel = (values, options = []) => {
    const normalizedValues = normalizeFormatFilterValues(values);
    const allOption = options.find(
        (option) => String(option?.value || "").trim().toLowerCase() === "all",
    );

    if (normalizedValues.length === 0) {
        return allOption?.label || "All";
    }

    const optionLabelsByValue = new Map(
        options.map((option) => [
            String(option?.value || "").trim().toLowerCase(),
            option?.label || formatLabel(option?.value),
        ]),
    );
    const labels = normalizedValues.map(
        (value) => optionLabelsByValue.get(value) || formatLabel(value),
    );

    if (labels.length <= 2) {
        return labels.join(", ");
    }

    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
};

const isIsoDateValue = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());

const parseIsoDateValue = (value) => {
    if (!isIsoDateValue(value)) {
        return null;
    }

    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
};

const formatDateLabel = (value) => {
    const parsedDate = parseIsoDateValue(value);
    if (!parsedDate) {
        return "";
    }

    return formatDate(parsedDate, "dd MMM yyyy");
};

const resolvePresetValueFromRange = (start, end, options = []) => {
    if (start === "" && end === "") {
        return "all_time";
    }

    const matchedPreset = options.find((option) => {
        if (option.value === "all_time") {
            return false;
        }

        const presetRange = resolvePresetRange(option.value);
        if (!presetRange) {
            return false;
        }

        return presetRange.start === start && presetRange.end === end;
    });

    return matchedPreset?.value || "custom";
};

const isVideoLikePost = (post) => {
    const format = String(post?.format || "").toLowerCase();
    const mediaType = String(post?.media_type || "").toUpperCase();
    const mediaProductType = String(
        post?.media_product_type || "",
    ).toUpperCase();

    return (
        ["reel", "video"].includes(format) ||
        ["VIDEO", "REELS"].includes(mediaType) ||
        mediaProductType === "REELS"
    );
};

const resolveAutodmTriggerType = (post) => {
    const format = String(post?.format || "").toLowerCase();
    const mediaType = String(post?.media_type || "").toUpperCase();
    const mediaProductType = String(
        post?.media_product_type || "",
    ).toUpperCase();
    const permalink = String(post?.permalink || "").toLowerCase();

    if (
        format === "story" ||
        mediaType === "STORY" ||
        mediaProductType === "STORIES" ||
        permalink.includes("/stories/")
    ) {
        return "story";
    }

    if (
        format === "reel" ||
        format === "video" ||
        mediaType === "VIDEO" ||
        mediaType === "REELS" ||
        mediaProductType === "REELS"
    ) {
        return "reel";
    }

    return "post";
};

const Sparkline = ({ data = [], labels = [], strokeColor = "rgb(14, 165, 233)" }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const gradientId = useMemo(() => `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`, []);
    const width = 110;
    const height = 30;
    const padding = 2;

    if (!data || data.length < 2) {
        return (
            <svg width={width} height={height} className="text-slate-355">
                <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
        );
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const coords = data.map((val, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((val - min) / range) * (height - padding * 2) - padding;
        return { x, y, value: val, label: labels[i] };
    });

    const linePath = coords.reduce((path, pt, i) => {
        return path + (i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`);
    }, "");

    const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const xPos = e.clientX - rect.left;
        let closestIdx = 0;
        let minDiff = Infinity;
        coords.forEach((pt, idx) => {
            const diff = Math.abs(pt.x - xPos);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
            }
        });
        setHoveredIndex(closestIdx);
    };

    const handleMouseLeave = () => {
        setHoveredIndex(null);
    };

    const activePt = hoveredIndex !== null ? coords[hoveredIndex] : null;

    return (
        <div className="relative inline-flex items-center">
            <svg
                width={width}
                height={height}
                className="overflow-visible cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill={`url(#${gradientId})`} />
                <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {activePt && (
                    <circle
                        cx={activePt.x}
                        cy={activePt.y}
                        r="3.5"
                        fill={strokeColor}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                    />
                )}
            </svg>
            {activePt && (
                <div className="absolute bottom-full left-1/2 z-[100] mb-1.5 -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md pointer-events-none whitespace-nowrap">
                    {activePt.label}: {new Intl.NumberFormat().format(activePt.value)}
                </div>
            )}
        </div>
    );
};

export default function MyInsta({
    instagram_accounts = [],
    selected_instagram_account_id = null,
    feed_posts = {},
    account_totals = {},
    autodm_kpis = {},
    filters = {},
    has_active_account = true,
    disconnectToast = null,
}) {
    const accountList = Array.isArray(instagram_accounts)
        ? instagram_accounts
        : [];
    const hasActiveAccount =
        Boolean(has_active_account) &&
        accountList.some((account) => account.status === "active");
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);

    useEffect(() => {
        if (!disconnectToast?.message || !disconnectToast?.account_id) {
            return;
        }

        const fingerprint = `${disconnectToast.account_id}:${disconnectToast.updated_at || "unknown"}`;
        const storageKey = `my-profile:disconnect-modal:${fingerprint}`;

        try {
            if (window.sessionStorage.getItem(storageKey)) {
                return;
            }

            window.sessionStorage.setItem(storageKey, "1");
        } catch (error) {
            // If storage is unavailable, still show the warning once for this render.
        }

        setShowDisconnectModal(true);
    }, [disconnectToast]);

    const { selectedAccountId, selectedAccount, selectAccount } =
        useInstagramSelectedAccount({
            accounts: accountList,
            initialSelectedAccountId: selected_instagram_account_id,
            preferStored: false,
            requireActive: true,
        });
    const [posts, setPosts] = useState(() =>
        Array.isArray(feed_posts?.data) ? feed_posts.data : [],
    );
    const [mediaRenderStateByPostId, setMediaRenderStateByPostId] = useState(
        {},
    );
    const [nextPageUrl, setNextPageUrl] = useState(
        feed_posts?.next_page_url || null,
    );
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
    const [isTogglingAutodm, setIsTogglingAutodm] = useState(false);
    const [autodmContextMenu, setAutodmContextMenu] = useState(null);
    const [autodmContextWarning, setAutodmContextWarning] = useState("");
    const sentinelRef = useRef(null);

    const [drawerPostId, setDrawerPostId] = useState(null);
    const [drawerData, setDrawerData] = useState(null);
    const [isDrawerLoading, setIsDrawerLoading] = useState(false);

    const openDrawer = useCallback((post) => {
        const mediaId = String(post.instagram_media_id || "").trim();
        if (mediaId === "") return;

        setDrawerPostId(mediaId);
        setIsDrawerLoading(true);
        setDrawerData(null);

        fetch(route("instagram.posts.details", { instagram_media_id: mediaId }))
            .then(res => {
                if (!res.ok) throw new Error("Failed to load details");
                return res.json();
            })
            .then(data => {
                setDrawerData(data);
            })
            .catch(err => {
                console.error(err);
                setDrawerData({
                    post: post,
                    flow: null,
                    comments: []
                });
            })
            .finally(() => {
                setIsDrawerLoading(false);
            });
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerPostId(null);
        setDrawerData(null);
    }, []);
    const isSwitchingAccountRef = useRef(false);

    const profileImageUrl = useMemo(() => {
        const directProfileImage = String(
            selectedAccount?.profile_picture_url || "",
        ).trim();

        return directProfileImage !== "" ? directProfileImage : null;
    }, [selectedAccount]);
    const accountStats = useMemo(() => {
        return [
            {
                key: "posts",
                label: "Synced Posts",
                value: Number(account_totals.posts || 0),
                compact: false,
            },
            {
                key: "likes",
                label: "Likes",
                value: Number(account_totals.likes || 0),
                compact: true,
            },
            {
                key: "comments",
                label: "Comments",
                value: Number(account_totals.comments || 0),
                compact: true,
            },
            {
                key: "reach",
                label: "Reach",
                value: Number(account_totals.reach || 0),
                compact: true,
            },
        ];
    }, [account_totals]);

    const sparklineTrends = useMemo(() => {
        if (!posts || posts.length === 0) {
            return { posts: [], likes: [], comments: [], reach: [], dates: [] };
        }

        // Sort posts chronologically
        const sorted = [...posts].sort((a, b) => new Date(a.posted_at || 0) - new Date(b.posted_at || 0));

        // Group by date
        const grouped = {};
        sorted.forEach((post) => {
            if (!post.posted_at) return;
            const dateStr = new Date(post.posted_at).toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
            });
            if (!grouped[dateStr]) {
                grouped[dateStr] = { posts: 0, likes: 0, comments: 0, reach: 0 };
            }
            grouped[dateStr].posts += 1;
            grouped[dateStr].likes += Number(post.likes || 0);
            grouped[dateStr].comments += Number(post.comments || 0);
            grouped[dateStr].reach += Number(post.reach || 0);
        });

        const dates = Object.keys(grouped);
        return {
            posts: dates.map((d) => grouped[d].posts),
            likes: dates.map((d) => grouped[d].likes),
            comments: dates.map((d) => grouped[d].comments),
            reach: dates.map((d) => grouped[d].reach),
            dates,
        };
    }, [posts]);

    const aiRecommendation = useMemo(() => {
        if (!hasActiveAccount || !selectedAccount || selectedAccount.status !== "active") return null;
        if (!posts || posts.length === 0) return null;

        // Filter out posts that already have AutoDM running
        const eligible = posts.filter(post => !post.autodm_running);
        if (eligible.length === 0) return null;

        // Sort by reach descending, fallback to engagement (likes + comments)
        const sorted = [...eligible].sort((a, b) => {
            const scoreA = Number(a.reach || 0) || (Number(a.likes || 0) + Number(a.comments || 0));
            const scoreB = Number(b.reach || 0) || (Number(b.likes || 0) + Number(b.comments || 0));
            return scoreB - scoreA;
        });

        const topPost = sorted[0];
        const reachVal = Number(topPost.reach || 0);
        const likesVal = Number(topPost.likes || 0);
        const commentsVal = Number(topPost.comments || 0);

        // Compare with average reach of other posts
        const otherPosts = posts.filter(p => p.id !== topPost.id);
        const avgReach = otherPosts.length > 0
            ? otherPosts.reduce((sum, p) => sum + Number(p.reach || 0), 0) / otherPosts.length
            : 0;

        const multiplier = avgReach > 0 && reachVal > avgReach
            ? (reachVal / avgReach).toFixed(1)
            : null;

        return {
            post: topPost,
            reach: reachVal,
            likes: likesVal,
            comments: commentsVal,
            multiplier,
            triggerType: resolveAutodmTriggerType(topPost),
        };
    }, [posts]);

    const autodmKpiCards = useMemo(() => {
        const metrics = {
            total_automations: Number(autodm_kpis?.total_automations || 0),
            active_automations: Number(autodm_kpis?.active_automations || 0),
            paused_automations: Number(autodm_kpis?.paused_automations || 0),
            runs_last_7_days: Number(autodm_kpis?.runs_last_7_days || 0),
        };

        return [
            {
                key: "total_automations",
                label: "Total Automations",
                value: metrics.total_automations,
                icon: BarChart3,
                variant: "default",
            },
            {
                key: "active_automations",
                label: "Active Automations",
                value: metrics.active_automations,
                icon: CheckCircle2,
                variant: "success",
            },
            {
                key: "paused_automations",
                label: "Paused Automations",
                value: metrics.paused_automations,
                icon: Pause,
                variant: "warning",
            },
            {
                key: "runs_last_7_days",
                label: "7D Runs",
                value: metrics.runs_last_7_days,
                icon: RotateCcw,
                variant: "primary",
            },
        ];
    }, [autodm_kpis]);
    const currentFormatFilters = useMemo(
        () => normalizeFormatFilterValues(filters?.format),
        [filters],
    );
    const currentFormatFilterQueryValue = useMemo(
        () => serializeFormatFilterValues(currentFormatFilters),
        [currentFormatFilters],
    );
    const currentAutodmFilter = useMemo(() => {
        const normalized = String(filters?.autodm || "all").toLowerCase();

        return ["all", "active", "paused", "none"].includes(normalized)
            ? normalized
            : "all";
    }, [filters]);
    const currentStartFilter = useMemo(() => {
        const normalized = String(filters?.start || "").trim();

        return isIsoDateValue(normalized) ? normalized : "";
    }, [filters]);
    const currentEndFilter = useMemo(() => {
        const normalized = String(filters?.end || "").trim();

        return isIsoDateValue(normalized) ? normalized : "";
    }, [filters]);
    const accountDropdownOptions = useMemo(() => {
        return accountList.map((account) => ({
            value: String(account.id),
            label: `@${account.username || account.ig_account_id} ${account.status === "active" ? "(connected)" : "(disconnected)"
                }`,
        }));
    }, [accountList]);

    const formatFilterOptions = useMemo(() => {
        const options = Array.isArray(filters?.options?.format)
            ? filters.options.format
            : [];

        return options.length > 0
            ? options
            : [
                { value: "all", label: "All" },
                { value: "post", label: "Post" },
                { value: "reel", label: "Reel" },
                { value: "story", label: "Story" },
                { value: "carousel", label: "Carousel" },
            ];
    }, [filters]);
    const autodmFilterOptions = useMemo(() => {
        const options = Array.isArray(filters?.options?.autodm)
            ? filters.options.autodm
            : [];

        return options.length > 0
            ? options
            : [
                { value: "all", label: "All" },
                { value: "active", label: "AutoDM Active" },
                { value: "paused", label: "AutoDM Paused" },
                { value: "none", label: "No AutoDM" },
            ];
    }, [filters]);
    const datePresetOptions = useMemo(() => {
        const allowedPresetOrder = [
            { value: "all_time", label: "All time" },
            { value: "last_7_days", label: "Last 7 days" },
            { value: "last_30_days", label: "Last 30 days" },
            { value: "this_month", label: "This month" },
        ];
        const allowedPresetValues = new Set(
            allowedPresetOrder.map((option) => option.value),
        );
        const options = Array.isArray(filters?.options?.date_presets)
            ? filters.options.date_presets
            : [];

        if (options.length <= 0) {
            return allowedPresetOrder;
        }

        const sanitizedOptionsByValue = new Map(
            options
                .filter((option) => allowedPresetValues.has(option?.value))
                .map((option) => [
                    option.value,
                    {
                        value: option.value,
                        label:
                            typeof option.label === "string" &&
                                option.label.trim() !== ""
                                ? option.label.trim()
                                : allowedPresetOrder.find(
                                    (fallbackOption) =>
                                        fallbackOption.value === option.value,
                                )?.label || option.value,
                    },
                ]),
        );

        return allowedPresetOrder.map(
            (option) => sanitizedOptionsByValue.get(option.value) || option,
        );
    }, [filters]);
    const currentDatePreset = useMemo(() => {
        return resolvePresetValueFromRange(
            currentStartFilter,
            currentEndFilter,
            datePresetOptions,
        );
    }, [currentEndFilter, currentStartFilter, datePresetOptions]);
    const analyticsSyncHref = useMemo(() => {
        const effectiveAccountId = Number(
            selectedAccountId || selected_instagram_account_id || 0,
        );

        return effectiveAccountId > 0
            ? route(
                "instagram.analytics",
                { instagram_account_id: effectiveAccountId },
                false,
            )
            : route("instagram.analytics", [], false);
    }, [selectedAccountId, selected_instagram_account_id]);
    const hasActivePostFilters =
        currentFormatFilters.length > 0 ||
        currentAutodmFilter !== "all" ||
        currentStartFilter !== "" ||
        currentEndFilter !== "";
    const [dateDraft, setDateDraft] = useState({
        start: "",
        end: "",
        preset: "all_time",
    });
    const currentDateRangeLabel = useMemo(() => {
        if (currentStartFilter === "" && currentEndFilter === "") {
            return "All time";
        }

        const formattedStart = formatDateLabel(currentStartFilter);
        const formattedEnd = formatDateLabel(currentEndFilter);
        if (formattedStart !== "" && formattedEnd !== "") {
            return `${formattedStart} - ${formattedEnd}`;
        }

        return formattedStart || formattedEnd || "Custom range";
    }, [currentEndFilter, currentStartFilter]);
    const draftDateRangeLabel = useMemo(() => {
        if (dateDraft.start === "" && dateDraft.end === "") {
            return "All time";
        }

        const formattedStart = formatDateLabel(dateDraft.start);
        const formattedEnd = formatDateLabel(dateDraft.end);
        if (formattedStart !== "" && formattedEnd !== "") {
            return `${formattedStart} - ${formattedEnd}`;
        }

        return formattedStart || formattedEnd || "Custom range";
    }, [dateDraft.end, dateDraft.start]);

    const buildMyInstaQuery = useCallback(
        (overrides = {}) => {
            return {
                instagram_account_id:
                    overrides.instagram_account_id ??
                    selectedAccountId ??
                    selected_instagram_account_id ??
                    "",
                page: overrides.page ?? 1,
                format:
                    overrides.format !== undefined
                        ? serializeFormatFilterValues(overrides.format)
                        : currentFormatFilterQueryValue,
                autodm: overrides.autodm ?? currentAutodmFilter,
                start: overrides.start ?? currentStartFilter,
                end: overrides.end ?? currentEndFilter,
            };
        },
        [
            currentAutodmFilter,
            currentEndFilter,
            currentFormatFilterQueryValue,
            currentStartFilter,
            selectedAccountId,
            selected_instagram_account_id,
        ],
    );

    useEffect(() => {
        if (Number(feed_posts?.current_page || 1) !== 1) {
            return;
        }

        setPosts(Array.isArray(feed_posts?.data) ? feed_posts.data : []);
        setNextPageUrl(feed_posts?.next_page_url || null);
    }, [feed_posts, selected_instagram_account_id]);

    useEffect(() => {
        setMediaRenderStateByPostId({});
    }, [posts, selected_instagram_account_id]);

    const switchAccount = useCallback(
        (nextAccountId) => {
            const validAccountId = Number(selectAccount(nextAccountId) || 0);
            if (
                validAccountId <= 0 ||
                validAccountId === Number(selected_instagram_account_id || 0)
            ) {
                return;
            }

            isSwitchingAccountRef.current = true;
            setPosts([]);
            setNextPageUrl(null);
            setIsLoadingMore(false);
            setIsSwitchingAccount(true);
            router.get(
                route("instagram.my-profile"),
                buildMyInstaQuery({
                    instagram_account_id: validAccountId,
                    page: 1,
                }),
                {
                    preserveScroll: true,
                    preserveState: false,
                    replace: true,
                    onFinish: () => {
                        isSwitchingAccountRef.current = false;
                        setIsSwitchingAccount(false);
                    },
                },
            );
        },
        [buildMyInstaQuery, selectAccount, selected_instagram_account_id],
    );

    const lastRequestedAccountIdRef = useRef(null);

    useEffect(() => {
        if (!hasActiveAccount) {
            lastRequestedAccountIdRef.current = null;
            return;
        }

        const localAccountId = Number(selectedAccountId || 0);
        const serverAccountId = Number(selected_instagram_account_id || 0);

        if (localAccountId <= 0 || localAccountId === serverAccountId) {
            lastRequestedAccountIdRef.current = null;
            return;
        }

        if (lastRequestedAccountIdRef.current === localAccountId) {
            return;
        }

        lastRequestedAccountIdRef.current = localAccountId;

        switchAccount(localAccountId);
    }, [hasActiveAccount, selectedAccountId, selected_instagram_account_id, switchAccount]);

    const loadMore = useCallback(() => {
        if (
            isLoadingMore ||
            isSwitchingAccountRef.current ||
            isSwitchingAccount ||
            !nextPageUrl
        ) {
            return;
        }

        const nextPage = resolveNextPage(nextPageUrl);
        if (!nextPage) {
            return;
        }

        setIsLoadingMore(true);
        router.get(
            route("instagram.my-profile"),
            buildMyInstaQuery({
                page: nextPage,
            }),
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["feed_posts"],
                onSuccess: (page) => {
                    const incoming = page.props?.feed_posts || {};
                    const incomingRows = Array.isArray(incoming.data)
                        ? incoming.data
                        : [];
                    setPosts((previousRows) => {
                        const existingIds = new Set(
                            previousRows.map((item) => Number(item.id)),
                        );
                        const uniqueIncomingRows = incomingRows.filter(
                            (item) => !existingIds.has(Number(item.id)),
                        );

                        return [...previousRows, ...uniqueIncomingRows];
                    });
                    setNextPageUrl(incoming.next_page_url || null);
                },
                onFinish: () => {
                    setIsLoadingMore(false);
                },
            },
        );
    }, [buildMyInstaQuery, isLoadingMore, isSwitchingAccount, nextPageUrl]);

    const applyPostFilters = useCallback(
        (nextFilters = {}) => {
            const nextFormat = normalizeFormatFilterValues(
                nextFilters.format ?? currentFormatFilters,
            );
            const nextFormatQueryValue =
                serializeFormatFilterValues(nextFormat);
            const nextAutodm = String(
                nextFilters.autodm ?? currentAutodmFilter,
            ).toLowerCase();
            const nextStart = isIsoDateValue(nextFilters.start)
                ? String(nextFilters.start)
                : (nextFilters.start === "" ? "" : currentStartFilter);
            const nextEnd = isIsoDateValue(nextFilters.end)
                ? String(nextFilters.end)
                : (nextFilters.end === "" ? "" : currentEndFilter);

            if (
                nextFormatQueryValue === currentFormatFilterQueryValue &&
                nextAutodm === currentAutodmFilter &&
                nextStart === currentStartFilter &&
                nextEnd === currentEndFilter
            ) {
                return;
            }

            setPosts([]);
            setNextPageUrl(null);
            setIsLoadingMore(false);
            setIsSwitchingAccount(true);
            router.get(
                route("instagram.my-profile"),
                buildMyInstaQuery({
                    page: 1,
                    format: nextFormat,
                    autodm: nextAutodm,
                    start: nextStart,
                    end: nextEnd,
                }),
                {
                    preserveScroll: true,
                    preserveState: false,
                    replace: true,
                    onFinish: () => {
                        setIsSwitchingAccount(false);
                    },
                },
            );
        },
        [
            buildMyInstaQuery,
            currentAutodmFilter,
            currentEndFilter,
            currentFormatFilterQueryValue,
            currentFormatFilters,
            currentStartFilter,
        ],
    );
    const initializeDateDraftFromCurrent = useCallback(() => {
        setDateDraft({
            start: currentStartFilter,
            end: currentEndFilter,
            preset: currentDatePreset,
        });
    }, [currentDatePreset, currentEndFilter, currentStartFilter]);
    const handleDateDraftPresetSelect = useCallback(
        (presetValue) => {
            const normalizedPresetValue = String(presetValue || "");
            if (normalizedPresetValue === "all_time") {
                setDateDraft({
                    start: "",
                    end: "",
                    preset: "all_time",
                });
                return;
            }

            const presetRange = resolvePresetRange(normalizedPresetValue);
            if (!presetRange) {
                return;
            }

            setDateDraft({
                start: presetRange.start,
                end: presetRange.end,
                preset: normalizedPresetValue,
            });
        },
        [],
    );
    const handleDateDraftCalendarChange = useCallback(
        (ranges) => {
            const selection = ranges?.selection;
            if (!selection?.startDate || !selection?.endDate) {
                return;
            }

            const nextStart = toLocalDateValue(selection.startDate);
            const nextEnd = toLocalDateValue(selection.endDate);

            setDateDraft({
                start: nextStart,
                end: nextEnd,
                preset: resolvePresetValueFromRange(
                    nextStart,
                    nextEnd,
                    datePresetOptions,
                ),
            });
        },
        [datePresetOptions],
    );
    const applyDraftDateRange = useCallback(
        (closePopover) => {
            applyPostFilters({
                start: dateDraft.start,
                end: dateDraft.end,
            });
            closePopover();
        },
        [applyPostFilters, dateDraft.end, dateDraft.start],
    );
    const pickerRangeStartDate = useMemo(() => {
        return (
            parseIsoDateValue(dateDraft.start) ||
            parseIsoDateValue(currentStartFilter) ||
            (() => {
                const fallbackDate = new Date();
                fallbackDate.setDate(fallbackDate.getDate() - 29);
                return fallbackDate;
            })()
        );
    }, [currentStartFilter, dateDraft.start]);
    const pickerRangeEndDate = useMemo(() => {
        return (
            parseIsoDateValue(dateDraft.end) ||
            parseIsoDateValue(currentEndFilter) ||
            new Date()
        );
    }, [currentEndFilter, dateDraft.end]);

    useEffect(() => {
        if (
            !sentinelRef.current ||
            !nextPageUrl ||
            isLoadingMore ||
            isSwitchingAccount ||
            isSwitchingAccountRef.current
        ) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    loadMore();
                }
            },
            { rootMargin: "280px 0px" },
        );

        observer.observe(sentinelRef.current);

        return () => {
            observer.disconnect();
        };
    }, [isLoadingMore, isSwitchingAccount, loadMore, nextPageUrl]);

    useEffect(() => {
        if (!autodmContextMenu) {
            return undefined;
        }

        const closeContextMenu = () => {
            setAutodmContextMenu(null);
            setAutodmContextWarning("");
        };

        window.addEventListener("click", closeContextMenu);
        window.addEventListener("resize", closeContextMenu);
        window.addEventListener("scroll", closeContextMenu, true);
        window.addEventListener("keydown", closeContextMenu);

        return () => {
            window.removeEventListener("click", closeContextMenu);
            window.removeEventListener("resize", closeContextMenu);
            window.removeEventListener("scroll", closeContextMenu, true);
            window.removeEventListener("keydown", closeContextMenu);
        };
    }, [autodmContextMenu]);

    const resolveAutodmActionHref = useCallback(
        (post) => {
            const isAutodmActive = Boolean(post?.autodm_running);
            const autodmFlowId = Number(post?.autodm_flow_id || 0);

            if (isAutodmActive) {
                if (autodmFlowId > 0) {
                    return route("autodm.flows.edit", autodmFlowId, false);
                }

                return route(
                    "autodm.index",
                    {
                        account:
                            selectedAccountId ||
                            selected_instagram_account_id ||
                            "all",
                    },
                    false,
                );
            }

            const mediaId = String(post?.instagram_media_id || "").trim();
            const selectedAccountForFlow = Number(
                selectedAccountId || selected_instagram_account_id || 0,
            );

            if (mediaId === "" || selectedAccountForFlow <= 0) {
                return "";
            }

            return route(
                "autodm.create",
                {
                    instagram_account_id: selectedAccountForFlow,
                    instagram_media_id: mediaId,
                    trigger_type: resolveAutodmTriggerType(post),
                },
                false,
            );
        },
        [selectedAccountId, selected_instagram_account_id],
    );

    const openAutodmActionFromPost = useCallback(() => {
        if (!autodmContextMenu?.post) {
            return;
        }

        const targetHref = resolveAutodmActionHref(autodmContextMenu.post);

        if (targetHref === "") {
            setAutodmContextWarning(
                "This post cannot be used as an AutoDM trigger yet.",
            );
            return;
        }

        setAutodmContextMenu(null);
        setAutodmContextWarning("");
        router.get(targetHref);
    }, [autodmContextMenu, resolveAutodmActionHref]);

    const toggleAutodmStatusForPost = useCallback((post) => {
        if (!post || isTogglingAutodm) {
            return;
        }

        const autodmFlowId = Number(post.autodm_flow_id || 0);
        if (autodmFlowId <= 0) {
            setAutodmContextWarning(
                "Unable to find this AutoDM flow. Please open AutoDM and try again.",
            );
            return;
        }

        setIsTogglingAutodm(true);
        setAutodmContextWarning("");

        router.patch(
            route("autodm.flows.toggle-status", autodmFlowId, false),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setAutodmContextMenu(null);
                    setAutodmContextWarning("");
                    router.reload({
                        only: ["feed_posts"],
                        preserveScroll: true,
                        preserveState: true,
                    });
                },
                onError: () => {
                    setAutodmContextWarning(
                        "Unable to update AutoDM status right now. Please try again.",
                    );
                },
                onFinish: () => {
                    setIsTogglingAutodm(false);
                },
            },
        );
    }, [isTogglingAutodm]);

    const toggleAutodmStatusFromPost = useCallback(() => {
        toggleAutodmStatusForPost(autodmContextMenu?.post);
    }, [autodmContextMenu, toggleAutodmStatusForPost]);

    return (
        <AuthenticatedLayout
            topbarTitle="My Insta"
            topbarDescription="Manage posts and AutoDM status for the selected Instagram account."
        >
            <Head title="My Insta" />

            <div className="mx-auto max-w-[1280px] space-y-5">
                {/* AI Recommendation Widget */}
                {aiRecommendation && (
                    <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/40 to-sky-50/40 p-4 sm:p-5 shadow-sm">
                        <div className="absolute top-0 right-0 h-40 w-40 bg-linear-to-bl from-indigo-300/10 to-sky-300/10 rounded-bl-full pointer-events-none" />
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
                            <div className="flex items-start gap-3.5 min-w-0">
                                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600">
                                    <Sparkles className="h-5 w-5 animate-pulse" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-sm font-black text-slate-900 tracking-tight">AI Conversion Opportunity</h3>
                                        {aiRecommendation.multiplier && (
                                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                                {aiRecommendation.multiplier}x typical reach
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-semibold leading-relaxed text-slate-600 max-w-xl">
                                        Your post from {formatPostedAt(aiRecommendation.post.posted_at)} has high engagement. Setup an AutoDM campaign now to automatically reply to comments and send direct messages to viewers.
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-500 pt-1">
                                        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-500" /> {formatNumber(aiRecommendation.likes)} Likes</span>
                                        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 text-sky-500" /> {formatNumber(aiRecommendation.comments)} Comments</span>
                                        {aiRecommendation.reach > 0 && (
                                            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-emerald-500" /> {formatNumber(aiRecommendation.reach)} Reach</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 pl-14 sm:pl-0">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200/80 bg-slate-100 hidden md:block">
                                    {aiRecommendation.post.preview_media_url || aiRecommendation.post.thumbnail_url || aiRecommendation.post.media_url ? (
                                        <img
                                            src={aiRecommendation.post.preview_media_url || aiRecommendation.post.thumbnail_url || aiRecommendation.post.media_url}
                                            alt="Top post thumbnail"
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.style.display = 'none';
                                                if (e.currentTarget.parentElement) {
                                                    e.currentTarget.parentElement.classList.add('flex', 'items-center', 'justify-center', 'text-slate-400');
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                                            <ImageOff className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                                <Link
                                    href={route("autodm.create", {
                                        instagram_account_id: selectedAccountId || selected_instagram_account_id || 0,
                                        instagram_media_id: aiRecommendation.post.instagram_media_id,
                                        trigger_type: aiRecommendation.triggerType,
                                    })}
                                    className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    Setup AutoDM
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {hasActiveAccount && selectedAccount && selectedAccount.status !== "active" && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                    <Zap className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">Instagram Account Disconnected</h3>
                                    <p className="mt-1 text-xs font-semibold text-slate-600">
                                        We cannot fetch new media or run AutoDM automations for @{selectedAccount.username || selectedAccount.ig_account_id} because the connection has expired or been revoked.
                                    </p>
                                </div>
                            </div>
                            <a
                                href={route("settings", { tab: "integration" })}
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-amber-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shrink-0"
                            >
                                Reconnect Account
                            </a>
                        </div>
                    </div>
                )}

                {/* account section  */}
                {hasActiveAccount && selectedAccount && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                            <div className="flex min-w-0 items-center gap-4 sm:w-[360px]">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                    {profileImageUrl ? (
                                        <img
                                            src={profileImageUrl}
                                            alt={`@${selectedAccount.username || selectedAccount.ig_account_id}`}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xl font-black text-slate-500">
                                            {String(
                                                selectedAccount.username ||
                                                selectedAccount.ig_account_id ||
                                                "I",
                                            )
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <h2 className="truncate text-lg font-black text-slate-900">
                                            @
                                            {selectedAccount.username ||
                                                selectedAccount.ig_account_id}
                                        </h2>
                                        <span
                                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${selectedAccount.status ===
                                                    "active"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-amber-50 text-amber-700"
                                                }`}
                                        >
                                            {selectedAccount.status === "active"
                                                ? "Connected"
                                                : "Disconnected"}
                                        </span>
                                    </div>
                                    <div>
                                        <SharedDropdownSelect
                                            value={selectedAccountId || ""}
                                            onChange={switchAccount}
                                            options={accountDropdownOptions}
                                        />
                                    </div>
                                    <p className="truncate text-xs font-semibold text-slate-500">
                                        Instagram ID:{" "}
                                        {selectedAccount.ig_account_id || "-"}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {selectedAccount.status === "active" &&
                                            selectedAccount.profile_url && (
                                                <a
                                                    href={
                                                        selectedAccount.profile_url
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs font-black text-primary-600 hover:text-primary-700"
                                                >
                                                    Open Instagram profile
                                                </a>
                                            )}
                                        {selectedAccount.status === "active" && (
                                            <Link
                                                href={analyticsSyncHref}
                                                className="inline-flex items-center gap-1 text-xs font-black text-slate-600 hover:text-primary-700"
                                            >
                                                <CloudSyncIcon className="h-3.5 w-3.5" />
                                                Sync posts in Analytics
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
                                {accountStats.map((metric) => {
                                    let sparkColor = "rgb(14, 165, 233)";
                                    let sparkData = [];
                                    if (metric.key === "posts") {
                                        sparkColor = "rgb(99, 102, 241)"; // Indigo
                                        sparkData = sparklineTrends.posts;
                                    } else if (metric.key === "likes") {
                                        sparkColor = "rgb(244, 63, 94)"; // Rose
                                        sparkData = sparklineTrends.likes;
                                    } else if (metric.key === "comments") {
                                        sparkColor = "rgb(14, 165, 233)"; // Sky
                                        sparkData = sparklineTrends.comments;
                                    } else if (metric.key === "reach") {
                                        sparkColor = "rgb(16, 185, 129)"; // Emerald
                                        sparkData = sparklineTrends.reach;
                                    }

                                    return (
                                        <div
                                            key={metric.key}
                                            className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition-all hover:shadow-sm flex flex-col justify-between"
                                        >
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    {metric.label}
                                                </p>
                                                <p className="mt-1 text-xl font-black tracking-tight text-slate-900">
                                                    {metric.compact
                                                        ? formatCompactNumber(
                                                            metric.value,
                                                        )
                                                        : formatNumber(metric.value)}
                                                </p>
                                            </div>

                                            <div className="mt-3 flex justify-end h-8 items-end">
                                                <Sparkline
                                                    data={sparkData}
                                                    labels={sparklineTrends.dates}
                                                    strokeColor={sparkColor}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)_180px]">
                            <MultiSelectDropdown
                                label="Post Format"
                                values={currentFormatFilters}
                                onApply={(values) =>
                                    applyPostFilters({ format: values })
                                }
                                options={formatFilterOptions}
                            />

                            <SharedDropdownSelect
                                label="AutoDM State"
                                value={currentAutodmFilter}
                                onChange={(val) => applyPostFilters({ autodm: val })}
                                options={autodmFilterOptions}
                            />

                            <Popover className="relative space-y-1.5">
                                {({ close }) => (
                                    <>
                                        <label
                                            htmlFor="my-insta-date-range-button"
                                            className="block text-[10px] font-black uppercase tracking-wide text-slate-500"
                                        >
                                            Date Range
                                        </label>
                                        <Popover.Button
                                            id="my-insta-date-range-button"
                                            onClick={() =>
                                                initializeDateDraftFromCurrent()
                                            }
                                            className="inline-flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        >
                                            <span className="truncate">
                                                {currentDateRangeLabel}
                                            </span>
                                            <CalendarRange className="h-4 w-4 shrink-0 text-slate-500" />
                                        </Popover.Button>
                                        <Transition
                                            as={Fragment}
                                            enter="transition ease-out duration-150"
                                            enterFrom="opacity-0 translate-y-1"
                                            enterTo="opacity-100 translate-y-0"
                                            leave="transition ease-in duration-100"
                                            leaveFrom="opacity-100 translate-y-0"
                                            leaveTo="opacity-0 translate-y-1"
                                        >
                                            <Popover.Panel className="absolute right-0 z-[120] mt-2 w-[min(94vw,796px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10">
                                                <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                                            Presets
                                                        </p>
                                                        <div className="space-y-1">
                                                            {datePresetOptions.map((option) => (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleDateDraftPresetSelect(
                                                                            option.value,
                                                                        )
                                                                    }
                                                                    aria-pressed={
                                                                        dateDraft.preset ===
                                                                        option.value
                                                                    }
                                                                    className={`flex w-full items-center justify-start rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 ${dateDraft.preset ===
                                                                            option.value
                                                                            ? "border-primary-200 bg-primary-50 text-primary-700"
                                                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                                        }`}
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="my-insta-date-range-calendar overflow-hidden rounded-xl border border-slate-200 p-2">
                                                            <DateRange
                                                                ranges={[
                                                                    {
                                                                        startDate:
                                                                            pickerRangeStartDate,
                                                                        endDate:
                                                                            pickerRangeEndDate,
                                                                        key: "selection",
                                                                        ...(dateDraft.preset ===
                                                                            "all_time"
                                                                            ? {
                                                                                color: "transparent",
                                                                            }
                                                                            : {}),
                                                                    },
                                                                ]}
                                                                onChange={
                                                                    handleDateDraftCalendarChange
                                                                }
                                                                months={2}
                                                                direction="horizontal"
                                                                showDateDisplay={false}
                                                                moveRangeOnFirstSelection={
                                                                    false
                                                                }
                                                                editableDateInputs={
                                                                    false
                                                                }
                                                                rangeColors={["#a78bfa"]}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                                            <p className="text-xs font-semibold text-slate-600">
                                                                {draftDateRangeLabel}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        close()
                                                                    }
                                                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        applyDraftDateRange(
                                                                            close,
                                                                        )
                                                                    }
                                                                    className="inline-flex h-9 items-center justify-center rounded-lg bg-primary-600 px-3 text-sm font-bold text-white transition hover:bg-primary-700"
                                                                >
                                                                    Update
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Popover.Panel>
                                        </Transition>
                                    </>
                                )}
                            </Popover>

                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() =>
                                        applyPostFilters({
                                            format: [],
                                            autodm: "all",
                                            start: "",
                                            end: "",
                                        })
                                    }
                                    disabled={!hasActivePostFilters}
                                    className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-primary-600 bg-primary-600 px-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:border-primary-200 disabled:bg-primary-200 disabled:text-white/70"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {hasActiveAccount && selectedAccount && (
                    <p className="text-xs font-semibold text-slate-500">
                        Viewing{" "}
                        <span className="font-black text-slate-700">
                            @
                            {selectedAccount.username ||
                                selectedAccount.ig_account_id}
                        </span>
                    </p>
                )}

                {isSwitchingAccount ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div
                                key={index}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                            >
                                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                                <div className="mt-3 aspect-square animate-pulse rounded-xl bg-slate-100" />
                                <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
                                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                            </div>
                        ))}
                    </div>
                ) : !hasActiveAccount ? (
                    accountList.length === 0 && !disconnectToast?.account_id ? (
                        <InstagramNotConnectedEmptyState
                            description="Connect an Instagram account first, then Sync now from Analytics."
                            connectHref={route("settings", { tab: "integration" }, false)}
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
                                selectedAccount?.id ||
                                accountList[0]?.id
                            }
                            actionText="continue"
                        />
                    )
                ) : posts.length === 0 ? (
                    <EmptyState
                        className="py-16"
                        title="No Instagram posts found"
                        description={
                            hasActivePostFilters
                                ? "No posts match your current filters. Try another date range, post format, or AutoDM state."
                                : "This account has no synced posts yet. Sync from Analytics to fetch account posts."
                        }
                        icon={ImageOff}
                        action={
                            hasActivePostFilters ? null : (
                                <Link
                                    href={analyticsSyncHref}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-black text-white transition hover:bg-primary-700"
                                >
                                    <CloudSyncIcon className="h-4 w-4" />
                                    Open Analytics Sync
                                </Link>
                            )
                        }
                    />
                )
                    : (
                        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {posts.map((post) => {
                                const resolvedTriggerType =
                                    resolveAutodmTriggerType(post);
                                const cardMetrics =
                                    resolvedTriggerType === "story"
                                        ? [
                                            {
                                                key: "story_replies",
                                                label: "Replies",
                                                icon: MessageCircle,
                                                value: post.story_replies,
                                            },
                                            {
                                                key: "story_taps_forward",
                                                label: "Forward",
                                                icon: ArrowRight,
                                                value: post.story_taps_forward,
                                            },
                                            {
                                                key: "story_taps_back",
                                                label: "Back",
                                                icon: ArrowLeft,
                                                value: post.story_taps_back,
                                            },
                                            {
                                                key: "story_exits",
                                                label: "Exits",
                                                icon: LogOut,
                                                value: post.story_exits,
                                            },
                                        ]
                                        : [
                                            {
                                                key: "likes",
                                                label: "Likes",
                                                icon: Heart,
                                                value: post.likes,
                                            },
                                            {
                                                key: "comments",
                                                label: "Comments",
                                                icon: MessageCircle,
                                                value: post.comments,
                                            },
                                            {
                                                key: "reach",
                                                label: "Reach",
                                                icon: Eye,
                                                value: post.reach,
                                            },
                                        ];
                                const hasAutodmRunning = Boolean(
                                    post.autodm_running,
                                );
                                const renderState =
                                    mediaRenderStateByPostId[post.id] ||
                                    "initial";
                                const previewMediaUrl = String(
                                    post.preview_media_url ||
                                    post.thumbnail_url ||
                                    post.media_url ||
                                    "",
                                ).trim();
                                const sourceMediaUrl = String(
                                    post.media_url || "",
                                ).trim();
                                const fallbackImageUrl =
                                    sourceMediaUrl !== "" &&
                                        sourceMediaUrl !== previewMediaUrl
                                        ? sourceMediaUrl
                                        : "";
                                const shouldRenderVideo =
                                    isVideoLikePost(post) &&
                                    sourceMediaUrl !== "" &&
                                    (renderState === "video" ||
                                        (post.thumbnail_url == null &&
                                            previewMediaUrl === sourceMediaUrl));
                                const imageUrl =
                                    renderState === "fallback" &&
                                        fallbackImageUrl !== ""
                                        ? fallbackImageUrl
                                        : previewMediaUrl;
                                const postFormat =
                                    resolvedTriggerType === "story"
                                        ? "Story"
                                        : formatLabel(post.format);
                                const autodmActionHref =
                                    resolveAutodmActionHref(post);
                                const canOpenAutodmAction =
                                    autodmActionHref !== "";
                                const isAutodmPaused =
                                    String(
                                        post.autodm_flow_status || "",
                                    ).toLowerCase() === "paused";

                                return (
                                    <article
                                        key={post.id}
                                        className={`relative overflow-hidden rounded-2xl bg-white shadow-sm ${hasAutodmRunning
                                                ? "border-2 border-primary-500"
                                                : "border border-slate-200"
                                            }`}
                                        onContextMenu={(event) => {
                                            event.preventDefault();
                                            const mediaId = String(
                                                post.instagram_media_id || "",
                                            ).trim();

                                            setAutodmContextMenu({
                                                post,
                                                isAutodmActive: hasAutodmRunning,
                                                hasMediaId: mediaId !== "",
                                                x: Math.min(
                                                    event.clientX,
                                                    window.innerWidth - 280,
                                                ),
                                                y: Math.min(
                                                    event.clientY,
                                                    window.innerHeight - 160,
                                                ),
                                            });
                                            setAutodmContextWarning("");
                                        }}
                                    >
                                        {hasAutodmRunning && (
                                            <span className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-primary-400/70 animate-pulse" />
                                        )}

                                        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-black text-slate-800">
                                                    @
                                                    {selectedAccount?.username ||
                                                        selectedAccount?.ig_account_id ||
                                                        "account"}
                                                </p>
                                                <p className="text-[11px] font-semibold text-slate-500">
                                                    {formatPostedAt(post.posted_at)}
                                                </p>
                                            </div>
                                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                                                {postFormat}
                                            </span>
                                        </div>

                                        <div
                                            onClick={() => openDrawer(post)}
                                            className="relative aspect-square bg-slate-100 cursor-pointer overflow-hidden group"
                                        >
                                            {hasAutodmRunning && (
                                                <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                                                    <span className={`h-1.5 w-1.5 rounded-full ${isAutodmPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                                                        }`} />
                                                    {isAutodmPaused ? 'AutoDM Paused' : 'AutoDM Active'}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                                <span className="rounded-lg bg-slate-950/80 backdrop-blur-xs px-3 py-1.5 text-xs font-bold text-white shadow-md">
                                                    View Insights
                                                </span>
                                            </div>

                                            {shouldRenderVideo ? (
                                                <video
                                                    src={sourceMediaUrl}
                                                    className="h-full w-full object-cover"
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                    onError={() => {
                                                        if (
                                                            previewMediaUrl !== "" &&
                                                            renderState !==
                                                            "fallback"
                                                        ) {
                                                            setMediaRenderStateByPostId(
                                                                (
                                                                    previousState,
                                                                ) => ({
                                                                    ...previousState,
                                                                    [post.id]:
                                                                        "fallback",
                                                                }),
                                                            );
                                                            return;
                                                        }

                                                        setMediaRenderStateByPostId(
                                                            (previousState) => ({
                                                                ...previousState,
                                                                [post.id]: "failed",
                                                            }),
                                                        );
                                                    }}
                                                />
                                            ) : imageUrl && renderState !== "failed" ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={postFormat}
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                    onError={() => {
                                                        if (
                                                            renderState ===
                                                            "initial" &&
                                                            fallbackImageUrl !== ""
                                                        ) {
                                                            setMediaRenderStateByPostId(
                                                                (
                                                                    previousState,
                                                                ) => ({
                                                                    ...previousState,
                                                                    [post.id]:
                                                                        "fallback",
                                                                }),
                                                            );
                                                            return;
                                                        }

                                                        if (
                                                            isVideoLikePost(post) &&
                                                            sourceMediaUrl !== "" &&
                                                            renderState !== "video"
                                                        ) {
                                                            setMediaRenderStateByPostId(
                                                                (
                                                                    previousState,
                                                                ) => ({
                                                                    ...previousState,
                                                                    [post.id]:
                                                                        "video",
                                                                }),
                                                            );
                                                            return;
                                                        }

                                                        setMediaRenderStateByPostId(
                                                            (previousState) => ({
                                                                ...previousState,
                                                                [post.id]: "failed",
                                                            }),
                                                        );
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
                                                    <ImageOff className="h-6 w-6 text-slate-400/80" />
                                                    <span className="text-[10px] font-bold">Media expired</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 p-3">
                                            <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-700">
                                                {post.caption ||
                                                    `${postFormat} post`}
                                            </p>

                                            <div
                                                className={`grid gap-1.5 ${cardMetrics.length === 4
                                                        ? "grid-cols-4"
                                                        : "grid-cols-3"
                                                    }`}
                                            >
                                                {cardMetrics.map((metric) => {
                                                    const MetricIcon = metric.icon;

                                                    return (
                                                        <div
                                                            key={metric.key}
                                                            className="inline-flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-50 px-1 py-2"
                                                        >
                                                            <Tooltip
                                                                text={metric.label}
                                                                position="top"
                                                                delay={250}
                                                            >
                                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                                                                    <MetricIcon className="h-3 w-3" />
                                                                </span>
                                                            </Tooltip>
                                                            <span className="text-[11px] font-black text-slate-900">
                                                                {formatNumber(
                                                                    metric.value,
                                                                )}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {post.permalink ? (
                                                    <a
                                                        href={post.permalink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-black text-primary-600 hover:text-primary-700"
                                                    >
                                                        View on Instagram
                                                    </a>
                                                ) : null}

                                                {canOpenAutodmAction ? (
                                                    <Link
                                                        href={autodmActionHref}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black transition ${hasAutodmRunning
                                                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                                : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                                                            }`}
                                                    >
                                                        <Zap className="h-3 w-3" />
                                                        {hasAutodmRunning
                                                            ? "View AutoDM"
                                                            : "Setup AutoDM"}
                                                    </Link>
                                                ) : (
                                                    <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-400">
                                                        <Zap className="h-3 w-3" />
                                                        Setup unavailable
                                                    </span>
                                                )}

                                                {hasAutodmRunning && (
                                                    <div
                                                        className="ml-auto flex items-center gap-1.5"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">AutoDM</span>
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={!isAutodmPaused}
                                                            disabled={isTogglingAutodm || Number(post.autodm_flow_id || 0) <= 0}
                                                            onClick={() => toggleAutodmStatusForPost(post)}
                                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/25 disabled:cursor-not-allowed disabled:opacity-50 ${!isAutodmPaused ? 'bg-emerald-500' : 'bg-slate-200'
                                                                }`}
                                                            title={isAutodmPaused ? "Resume AutoDM" : "Pause AutoDM"}
                                                        >
                                                            <span
                                                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!isAutodmPaused ? 'translate-x-4' : 'translate-x-0'
                                                                    }`}
                                                            />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </section>
                    )}

                {autodmContextMenu &&
                    (() => {
                        const flowStatus = String(
                            autodmContextMenu?.post?.autodm_flow_status || "",
                        ).toLowerCase();
                        const isFlowPaused = flowStatus === "paused";
                        const canToggleFlow =
                            Number(
                                autodmContextMenu?.post?.autodm_flow_id || 0,
                            ) > 0;
                        const ToggleIcon = isFlowPaused ? Play : Pause;

                        return (
                            <div
                                className="fixed z-[80] w-64 rounded-xl border border-slate-700/40 bg-slate-900/95 p-2 shadow-2xl"
                                style={{
                                    left: autodmContextMenu.x,
                                    top: autodmContextMenu.y,
                                }}
                                onClick={(event) => event.stopPropagation()}
                            >
                                {autodmContextMenu.isAutodmActive && (
                                    <p className="mb-2 rounded-lg bg-emerald-500/15 px-2 py-1.5 text-xs font-semibold text-emerald-100">
                                        AutoDM is already configured for this
                                        post.
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={openAutodmActionFromPost}
                                    disabled={
                                        !autodmContextMenu.isAutodmActive &&
                                        !autodmContextMenu.hasMediaId
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-100 transition hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    <Zap className="h-4 w-4" />
                                    {autodmContextMenu.isAutodmActive
                                        ? "View AutoDM"
                                        : "Setup AutoDM"}
                                </button>
                                {autodmContextMenu.isAutodmActive && (
                                    <button
                                        type="button"
                                        onClick={toggleAutodmStatusFromPost}
                                        disabled={
                                            isTogglingAutodm || !canToggleFlow
                                        }
                                        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-100 transition hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        {isTogglingAutodm ? (
                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <ToggleIcon className="h-4 w-4" />
                                        )}
                                        {isFlowPaused
                                            ? "Resume AutoDM"
                                            : "Pause AutoDM"}
                                    </button>
                                )}
                                {autodmContextWarning && (
                                    <p className="mt-2 rounded-lg bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-200">
                                        {autodmContextWarning}
                                    </p>
                                )}
                            </div>
                        );
                    })()}

                <div
                    ref={sentinelRef}
                    className="flex min-h-8 items-center justify-center py-2"
                >
                    {isLoadingMore ? (
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Loading more posts...
                        </span>
                    ) : nextPageUrl ? (
                        <button
                            type="button"
                            onClick={loadMore}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                            Load more
                        </button>
                    ) : posts.length > 0 ? (
                        <span className="text-xs font-semibold text-slate-400">
                            You have reached the latest synced post.
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Slide-over Drawer Overlay */}
            <div className={`fixed inset-0 z-[150] overflow-hidden transition-opacity duration-300 ${drawerPostId ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}>
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
                    onClick={closeDrawer}
                />

                {/* Sliding panel */}
                <div className={`absolute inset-y-0 right-0 max-w-full pl-10 flex transform transition-transform duration-300 ease-in-out ${drawerPostId ? 'translate-x-0' : 'translate-x-full'
                    }`}>
                    <div className="w-screen max-w-md md:max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
                        {/* Header */}
                        <div className="px-4 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between sm:px-6">
                            <h2 className="text-base font-black text-slate-900">Post Insights</h2>
                            <button
                                type="button"
                                onClick={closeDrawer}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-500 hover:bg-slate-100 transition focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                            {isDrawerLoading ? (
                                /* Skeleton Loading State */
                                <div className="space-y-6 animate-pulse">
                                    <div className="aspect-video bg-slate-100 rounded-xl" />
                                    <div className="space-y-2">
                                        <div className="h-4 bg-slate-100 rounded w-1/3" />
                                        <div className="h-3 bg-slate-100 rounded w-full" />
                                        <div className="h-3 bg-slate-100 rounded w-2/3" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="h-12 bg-slate-100 rounded-xl" />
                                        <div className="h-12 bg-slate-100 rounded-xl" />
                                        <div className="h-12 bg-slate-100 rounded-xl" />
                                    </div>
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <div className="h-4 bg-slate-100 rounded w-1/4" />
                                        <div className="h-10 bg-slate-100 rounded-xl" />
                                    </div>
                                </div>
                            ) : drawerData ? (
                                <>
                                    {/* Post Header / Media Preview */}
                                    <div className="space-y-4">
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                                            {drawerData.post.media_url ? (
                                                drawerData.post.media_type === 'VIDEO' || isVideoLikePost(drawerData.post) ? (
                                                    <video
                                                        src={drawerData.post.media_url}
                                                        className="h-full w-full object-cover"
                                                        controls
                                                        muted
                                                    />
                                                ) : (
                                                    <img
                                                        src={drawerData.post.thumbnail_url || drawerData.post.media_url}
                                                        alt="Preview"
                                                        className="h-full w-full object-cover"
                                                    />
                                                )
                                            ) : (
                                                <div className="text-slate-400 text-sm font-semibold">Media Preview Unavailable</div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                    {drawerData.post.format || 'Post'}
                                                </span>
                                                <span className="text-xs text-slate-500 font-semibold">
                                                    Published: {formatPostedAt(drawerData.post.posted_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                                {drawerData.post.caption || "No caption details."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Detailed Post Metrics */}
                                    <div className="space-y-3 pt-6 border-t border-slate-100">
                                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Metrics Overview</h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-col items-center justify-center gap-0.5">
                                                <Heart className="h-4 w-4 text-rose-500" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Likes</span>
                                                <span className="text-sm font-black text-slate-900">{formatNumber(drawerData.post.likes)}</span>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-col items-center justify-center gap-0.5">
                                                <MessageCircle className="h-4 w-4 text-sky-500" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Comments</span>
                                                <span className="text-sm font-black text-slate-900">{formatNumber(drawerData.post.comments)}</span>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-col items-center justify-center gap-0.5">
                                                <Eye className="h-4 w-4 text-emerald-500" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Reach</span>
                                                <span className="text-sm font-black text-slate-900">{formatNumber(drawerData.post.reach)}</span>
                                            </div>
                                        </div>
                                        {/* Secondary Metrics */}
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-500">Impressions</span>
                                                <span className="text-xs font-black text-slate-900">{formatNumber(drawerData.post.impressions)}</span>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-500">Saves</span>
                                                <span className="text-xs font-black text-slate-900">{formatNumber(drawerData.post.saves || 0)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AutoDM Campaign Flowchart */}
                                    <div className="space-y-4 pt-6 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">AutoDM Flowchart</h3>
                                            {drawerData.flow && (
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${drawerData.flow.status === 'active'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-amber-50 text-amber-700'
                                                    }`}>
                                                    {drawerData.flow.status}
                                                </span>
                                            )}
                                        </div>

                                        {drawerData.flow ? (
                                            /* Flowchart blocks */
                                            <div className="space-y-4 bg-slate-50/50 border border-slate-200/60 rounded-xl p-4">
                                                {/* Step 1: Trigger */}
                                                <div className="relative flex items-start gap-3 pl-6 before:absolute before:left-[9px] before:top-[20px] before:bottom-[-20px] before:w-[2px] before:bg-slate-200">
                                                    <div className="absolute left-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                                        <Zap className="h-2.5 w-2.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900">Trigger: Comment Received</p>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                            {drawerData.flow.match_all_comments
                                                                ? "Triggers on any comment."
                                                                : `Triggers on keywords: ${Array.isArray(drawerData.flow.keywords) ? drawerData.flow.keywords.join(', ') : drawerData.flow.keywords}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Step 2: Public Reply (Optional) */}
                                                {drawerData.flow.public_reply_enabled && (
                                                    <div className="relative flex items-start gap-3 pl-6 before:absolute before:left-[9px] before:top-[20px] before:bottom-[-20px] before:w-[2px] before:bg-slate-200">
                                                        <div className="absolute left-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                                            <MessageCircle className="h-2.5 w-2.5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900">Action: Public Reply</p>
                                                            <p className="text-[11px] text-slate-500 mt-0.5 italic">
                                                                "{Array.isArray(drawerData.flow.public_comment_reply)
                                                                    ? drawerData.flow.public_comment_reply[0]
                                                                    : drawerData.flow.public_comment_reply}"
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Step 3: Private DM */}
                                                <div className="relative flex items-start gap-3 pl-6">
                                                    <div className="absolute left-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                                                        <Send className="h-2.5 w-2.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900">Action: Send Private DM</p>
                                                        <p className="text-[11px] text-slate-500 mt-0.5 italic">
                                                            "{drawerData.flow.opening_message}"
                                                        </p>
                                                        {drawerData.flow.opening_button_text && (
                                                            <div className="mt-1.5 inline-flex items-center rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                                                                {drawerData.flow.opening_button_text}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-2 pt-3 border-t border-slate-200/60 flex items-center justify-end">
                                                    <Link
                                                        href={route("autodm.flows.edit", drawerData.flow.id)}
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:text-primary-700"
                                                    >
                                                        Edit Full Flow
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                                <p className="text-xs font-semibold text-slate-500">No AutoDM flow configured for this post.</p>
                                                <Link
                                                    href={route("autodm.create", {
                                                        instagram_account_id: selectedAccountId || selected_instagram_account_id || 0,
                                                        instagram_media_id: drawerData.post.instagram_media_id,
                                                        trigger_type: resolveAutodmTriggerType(drawerData.post),
                                                    })}
                                                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-primary-700 transition"
                                                >
                                                    <Zap className="h-3 w-3" />
                                                    Setup AutoDM Campaign
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Live Comments */}
                                    <div className="space-y-3 pt-6 border-t border-slate-100">
                                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Live Comments</h3>
                                        {drawerData.comments && drawerData.comments.length > 0 ? (
                                            <div className="space-y-3 divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                                                {drawerData.comments.map((comment, idx) => (
                                                    <div key={comment.id || idx} className={`pt-3 ${idx === 0 ? 'pt-0' : ''}`}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-black text-slate-800">
                                                                @{comment.from?.username || "instagram_user"}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-semibold">
                                                                {comment.timestamp ? formatPostedAt(comment.timestamp) : ""}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-600 mt-1 leading-normal font-medium">
                                                            {comment.text}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-slate-400 text-xs font-semibold border border-slate-100 rounded-xl bg-slate-50/30">
                                                No recent comments found on this post.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6 text-slate-500">Could not retrieve post insights.</div>
                            )}
                        </div>
                    </div>
                </div>
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
