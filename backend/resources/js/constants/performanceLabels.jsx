import { Flame, Rocket, Sparkles, TrendingUp, Activity } from 'lucide-react';

export const PERFORMANCE_FILTER_OPTIONS = [
    { id: 'Explosive', label: 'Explosive', desc: '>= 75x multiplier' },
    { id: 'Breakout', label: 'Breakout', desc: '>= 25x multiplier' },
    { id: 'Outlier', label: 'Outlier', desc: '>= 10x multiplier' },
    { id: 'Strong', label: 'Strong', desc: '>= 5x multiplier' },
    { id: 'Normal', label: 'Normal', desc: 'Standard performance' },
];

const PERFORMANCE_LABEL_ICONS = {
    Explosive: Flame,
    Breakout: Rocket,
    Outlier: Sparkles,
    Strong: TrendingUp,
    Normal: Activity,
};

export function getPerformanceLabelIcon(label, className = 'w-3.5 h-3.5') {
    const LabelIcon = PERFORMANCE_LABEL_ICONS[label];
    return LabelIcon ? <LabelIcon className={className} /> : null;
}
