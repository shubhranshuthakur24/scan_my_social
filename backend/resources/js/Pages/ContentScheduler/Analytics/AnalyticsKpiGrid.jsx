import KpiCard from "@/Components/common/KpiCard";
import {
    CheckCircle2,
    Eye,
    Heart,
    Minus,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { formatNumber } from "./helpers";

const kpiMeta = [
    { key: "posts", label: "Posts", icon: CheckCircle2, variant: "success" },
    { key: "reach", label: "Reach", icon: Eye, variant: "sky" },
    { key: "engagement", label: "Engagement", icon: Heart, variant: "rose" },
    {
        key: "impressions",
        label: "Impressions",
        icon: TrendingUp,
        variant: "primary",
    },
];

const trendToneByName = {
    up: "success",
    down: "danger",
    neutral: "neutral",
    none: "neutral",
};

const trendIconByName = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
    none: Minus,
};

const comparisonText = (comparison = {}) => {
    if (comparison?.trend === "none") {
        return "No prior data";
    }

    if (
        comparison?.delta_percent === null ||
        comparison?.delta_percent === undefined
    ) {
        return "No prior data";
    }

    const normalized = Number(comparison.delta_percent || 0);
    const signedPercent = `${normalized > 0 ? "+" : ""}${normalized}%`;

    return `${signedPercent} vs previous`;
};

export default function AnalyticsKpiGrid({ overview = {} }) {
    const postsValue = Number(overview?.posts ?? overview?.total_posts ?? 0);
    const valuesByKey = {
        posts: postsValue,
        reach: Number(overview?.reach || 0),
        engagement: Number(overview?.engagement || 0),
        impressions: Number(overview?.impressions || 0),
    };

    return (
        <section
            className="grid gap-3 xl:gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Analytics key performance metrics"
        >
            {kpiMeta.map((item) => {
                const metricValue = valuesByKey[item.key] || 0;
                const comparison = overview?.comparison?.[item.key] || {};
                const trendName = String(comparison?.trend || "none");
                const TrendIcon = trendIconByName[trendName] || Minus;
                const trendTone = trendToneByName[trendName] || "neutral";

                return (
                    <KpiCard
                        key={item.key}
                        label={item.label}
                        value={formatNumber(metricValue)}
                        icon={item.icon}
                        variant={item.variant}
                        size="compact"
                        trend={comparisonText(comparison)}
                        trendTone={trendTone}
                        helper={`Previous: ${formatNumber(comparison?.previous || 0)}`}
                        footer={
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                                <TrendIcon className="h-3.5 w-3.5" />
                                Delta {formatNumber(comparison?.delta || 0)}
                            </span>
                        }
                    />
                );
            })}
        </section>
    );
}
