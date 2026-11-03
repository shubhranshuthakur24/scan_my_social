import React from 'react';
import { Heading, Text } from '@/Components/Typography';

export default function EmptyState({
    title,
    description,
    icon: Icon,
    action,
    className = '',
    variant = 'default',
    iconContainerClassName = '',
    iconClassName = '',
    titleClassName = '',
    descriptionClassName = '',
}) {
    const variants = {
        default: 'rounded-brand-lg border border-slate-200/70 bg-white shadow-base',
        card: 'surface-interactive rounded-brand-lg',
        transparent: 'bg-transparent',
    };

    return (
        <div className={`flex flex-col items-center justify-center p-10 text-center xl:p-8 ${variants[variant]} ${className}`}>
            <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-brand border border-primary-100 bg-primary-50 xl:mb-4 xl:h-12 xl:w-12 ${iconContainerClassName}`}>
                {Icon ? (
                    <Icon className={`h-7 w-7 text-primary-500 xl:h-6 xl:w-6 ${iconClassName}`} strokeWidth={1.5} />
                ) : (
                    <svg className="h-7 w-7 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                )}
            </div>

            <Heading level={3} className={`mb-2 text-lg xl:text-base ${titleClassName}`}>
                {title}
            </Heading>

            <Text variant="sm" className={`mb-6 max-w-sm text-slate-500 xl:mb-5 ${descriptionClassName}`}>
                {description}
            </Text>

            {action && <div className="mt-1">{action}</div>}
        </div>
    );
}
