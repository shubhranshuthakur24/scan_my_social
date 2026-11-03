import React from 'react';
import { Link } from '@inertiajs/react';

export default function Button({
    type = 'button',
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    disabled = false,
    children,
    href,
    icon: Icon,
    iconPosition = 'left',
    ...props
}) {
    const baseClasses = 'inline-flex items-center justify-center font-bold rounded-brand-sm transition-[transform,box-shadow,background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none relative overflow-hidden group/btn btn-sweep';

    const variants = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/20 focus-visible:ring-primary-400 border border-transparent hover:-translate-y-px',
        solid: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/20 focus-visible:ring-primary-400 border border-transparent hover:-translate-y-px',
        accent: 'bg-accent-500 text-white hover:bg-accent-600 shadow-sm shadow-accent-500/20 focus-visible:ring-accent-300 border border-transparent hover:-translate-y-px',
        secondary: 'bg-white  rounded-xl text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm focus-visible:ring-primary-300 hover:-translate-y-px',
        danger: 'bg-danger-500 text-white hover:bg-danger-600 shadow-sm shadow-danger-500/20 focus-visible:ring-danger-300 border border-transparent hover:-translate-y-px',
        success: 'bg-success-500 text-white hover:bg-success-600 shadow-sm shadow-success-500/20 focus-visible:ring-success-300 border border-transparent hover:-translate-y-px',
        warning: 'bg-warning-500 text-white hover:bg-warning-600 shadow-sm shadow-warning-500/20 focus-visible:ring-warning-300 border border-transparent hover:-translate-y-px',
        ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-primary-300',
        outline: 'bg-transparent border border-slate-300 text-slate-700 hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-700 focus-visible:ring-primary-300',
        link: 'bg-transparent text-primary-700 hover:text-primary-800 hover:underline p-0 h-auto focus-visible:ring-0 shadow-none rounded-none',
        gradient: 'bg-gradient-to-r from-primary-600 to-accent-500 text-white hover:from-primary-700 hover:to-accent-600 shadow-md shadow-primary-600/20 focus-visible:ring-primary-300 border border-transparent hover:-translate-y-px',
        white: 'bg-white text-slate-900 hover:bg-slate-50 shadow-sm border border-white/30 focus-visible:ring-white focus-visible:ring-offset-primary-600 hover:-translate-y-px',
    };

    const sizes = {
        xs: 'px-2.5 py-1.5 text-xs',
        sm: 'px-3.5 py-2 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg',
    };

    const classes = `${baseClasses} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${isLoading ? 'cursor-wait opacity-80' : ''} ${className}`;

    const iconSize = size === 'xs' || size === 'sm' ? 16 : 18;
    const content = (
        <>
            {isLoading && (
                <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {!isLoading && Icon && iconPosition === 'left' && (
                <span className={children ? 'mr-2' : ''}>
                    {React.isValidElement(Icon) ? Icon : <Icon size={iconSize} strokeWidth={2} />}
                </span>
            )}
            {children}
            {!isLoading && Icon && iconPosition === 'right' && (
                <span className={children ? 'ml-2' : ''}>
                    {React.isValidElement(Icon) ? Icon : <Icon size={iconSize} strokeWidth={2} />}
                </span>
            )}
        </>
    );

    if (href) {
        return (
            <Link href={href} className={classes} {...props}>
                {content}
            </Link>
        );
    }

    return (
        <button type={type} className={classes} disabled={disabled || isLoading} {...props}>
            {content}
        </button>
    );
}
