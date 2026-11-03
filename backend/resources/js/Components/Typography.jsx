import React from 'react';

const headingClasses = {
    1: 'text-h1',
    2: 'text-h2',
    3: 'text-h3',
    4: 'text-h4',
    5: 'text-h5',
    6: 'text-h6',
};

const textVariants = {
    base: 'text-base',
    sm: 'text-sm',
    xs: 'text-xs',
    lg: 'text-lg',
};

const weightClasses = {
    regular: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    black: 'font-extrabold',
};

const toneClasses = {
    default: 'text-slate-700',
    muted: 'text-slate-500',
    strong: 'text-ink',
    brand: 'text-primary-700',
    success: 'text-success-700',
    danger: 'text-danger-700',
};

export function Heading({ level = 2, className = '', children, ...props }) {
    const Tag = `h${level}`;

    return (
        <Tag
            className={`font-heading text-ink tracking-tight ${headingClasses[level] || headingClasses[2]} ${className}`}
            {...props}
        >
            {children}
        </Tag>
    );
}

export function Text({
    as: Tag = 'p',
    variant = 'base',
    weight = 'medium',
    tone = 'default',
    className = '',
    children,
    ...props
}) {
    return (
        <Tag
            className={`font-sans leading-relaxed ${textVariants[variant] || textVariants.base} ${weightClasses[weight] || weightClasses.medium} ${toneClasses[tone] || toneClasses.default} ${className}`}
            {...props}
        >
            {children}
        </Tag>
    );
}

export function DataText({ weight = 'semibold', className = '', children, ...props }) {
    return (
        <span
            className={`font-mono tabular-nums tracking-tight ${weightClasses[weight] || weightClasses.semibold} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
}
