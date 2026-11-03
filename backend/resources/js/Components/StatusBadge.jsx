import React from 'react';
import { CheckCircle2, Mic2, FlaskConical, FileEdit, Clock, Loader2 } from 'lucide-react';

const statuses = {
    pending: {
        bg: 'bg-warning-50',
        text: 'text-warning-700',
        border: 'border-warning-200',
        label: 'Pending',
        icon: Clock,
    },
    approved: {
        bg: 'bg-primary-50',
        text: 'text-primary-700',
        border: 'border-primary-200',
        label: 'Approved',
        icon: CheckCircle2,
    },
    processing: {
        bg: 'bg-info-50',
        text: 'text-info-700',
        border: 'border-info-200',
        label: 'Processing',
        icon: Loader2,
    },
    transcribed: {
        bg: 'bg-success-50',
        text: 'text-success-700',
        border: 'border-success-200',
        label: 'Transcribed',
        icon: Mic2,
    },
    analyzed: {
        bg: 'bg-accent-50',
        text: 'text-accent-700',
        border: 'border-accent-200',
        label: 'Analyzed',
        icon: FlaskConical,
    },
    scripted: {
        bg: 'bg-primary-50',
        text: 'text-primary-700',
        border: 'border-primary-200',
        label: 'Scripted',
        icon: FileEdit,
    },
    generated: {
        bg: 'bg-primary-50',
        text: 'text-primary-700',
        border: 'border-primary-200',
        label: 'Script Generated',
        icon: FileEdit,
    },
    audio_ready: {
        bg: 'bg-accent-50',
        text: 'text-accent-700',
        border: 'border-accent-200',
        label: 'Audio Ready',
        icon: Mic2,
    },
};

export default function StatusBadge({ status, className = '' }) {
    const config = statuses[status] || statuses.pending;
    const IconComponent = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}>
            <IconComponent className="w-3 h-3" strokeWidth={2.5} />
            {config.label}
        </span>
    );
}
