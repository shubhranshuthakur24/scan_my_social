import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const VARIANTS = {
    success: {
        icon: CheckCircle2,
        bg: 'bg-green-50',
        border: 'border-green-100',
        text: 'text-green-800',
        iconColor: 'text-green-500',
    },
    error: {
        icon: XCircle,
        bg: 'bg-red-50',
        border: 'border-red-100',
        text: 'text-red-800',
        iconColor: 'text-red-500',
    },
    info: {
        icon: Info,
        bg: 'bg-primary-50',
        border: 'border-primary-100',
        text: 'text-primary-800',
        iconColor: 'text-primary-500',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-warning-50',
        border: 'border-warning-100',
        text: 'text-warning-800',
        iconColor: 'text-warning-500',
    },
};

export default function Toast({ id, message, type = 'success', onClose, duration = 3000 }) {
    const [isExiting, setIsExiting] = useState(false);
    const autoCloseTimerRef = useRef(null);
    const exitTimerRef = useRef(null);
    const isClosingRef = useRef(false);
    const variant = VARIANTS[type] || VARIANTS.success;
    const IconComponent = variant.icon;

    const handleClose = useCallback(() => {
        if (isClosingRef.current) {
            return;
        }

        isClosingRef.current = true;
        setIsExiting(true);
        exitTimerRef.current = setTimeout(() => {
            onClose(id);
        }, 220);
    }, [id, onClose]);

    useEffect(() => {
        autoCloseTimerRef.current = setTimeout(() => {
            handleClose();
        }, duration);

        return () => {
            if (autoCloseTimerRef.current) {
                clearTimeout(autoCloseTimerRef.current);
            }
            if (exitTimerRef.current) {
                clearTimeout(exitTimerRef.current);
            }
        };
    }, [duration, handleClose]);

    return (
        <div
            className={`
                pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-brand-sm border
                ${variant.bg} ${variant.border}
                transform transition-all duration-[220ms] ease-out
                ${isExiting ? 'translate-y-[-120%] opacity-0 scale-95' : 'translate-y-0 opacity-100 scale-100'}
            `}
            style={{ boxShadow: 'var(--shadow-interactive)' }}
            role="alert"
        >
            <div className="p-4 flex items-start gap-3 w-full">
                <IconComponent className={`shrink-0 mt-0.5 w-5 h-5 ${variant.iconColor}`} strokeWidth={2} />
                <div className="flex-1">
                    <p className={`text-sm font-semibold ${variant.text}`}>{message}</p>
                </div>
                <button
                    onClick={handleClose}
                    className={`inline-flex rounded-brand-sm p-1.5 ${variant.text} hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-150`}
                    aria-label="Dismiss notification"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
