import React from 'react';

export default function Skeleton({ className = '', variant = 'default', ...props }) {
    const variants = {
        default: 'rounded-md',
        text: 'rounded-md h-4',
        circle: 'rounded-full',
        card: 'rounded-2xl h-48',
        row: 'rounded-md h-12',
    };

    return (
        <div
            className={`bg-slate-100 animate-shimmer ${variants[variant] || variants.default} ${className}`}
            style={{
                backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
            }}
            {...props}
        />
    );
}

