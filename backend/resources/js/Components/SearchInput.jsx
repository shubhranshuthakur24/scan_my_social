import React from 'react';
import Icon from '@/Components/Icon';

export default function SearchInput({
    value,
    onChange,
    onClear,
    placeholder = 'Search...',
    className = '',
    inputClassName = '',
    searchIconClassName = '',
    rightAdornment = null,
    onEscape,
    onKeyDown,
    ...props
}) {
    const handleKeyDown = (event) => {
        if (event.key === 'Escape' && typeof onEscape === 'function') {
            onEscape(event);
        }

        if (typeof onKeyDown === 'function') {
            onKeyDown(event);
        }
    };

    const showClearButton = onClear && value && value.length > 0;
    const hasRightElements = rightAdornment || showClearButton;

    return (
        <div className={`relative ${className}`}>
            <input
                type="text"
                placeholder={placeholder}
                className={`w-full rounded-brand-sm border border-slate-200 bg-white py-2.5 pl-10 text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10 ${hasRightElements ? 'pr-10' : 'pr-4'} ${inputClassName}`}
                value={value}
                onChange={onChange}
                onKeyDown={handleKeyDown}
                {...props}
            />
            <div className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 ${searchIconClassName}`}>
                <Icon name="search" size={4} />
            </div>
            
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {showClearButton && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-100"
                        aria-label="Clear search"
                    >
                        <Icon name="x" size={3.5} />
                    </button>
                )}
                {rightAdornment}
            </div>
        </div>
    );
}
