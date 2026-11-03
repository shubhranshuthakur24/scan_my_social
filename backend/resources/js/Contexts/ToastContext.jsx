import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast from '@/Components/Toast';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const fallbackIdCounter = useRef(0);

    const createToastId = useCallback(() => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }

        fallbackIdCounter.current += 1;
        return `${Date.now()}-${fallbackIdCounter.current}`;
    }, []);

    const addToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = createToastId();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        return id;
    }, [createToastId]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const contextValue = React.useMemo(() => ({
        addToast,
        removeToast
    }), [addToast, removeToast]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}

            <div className="fixed top-0 right-0 z-[400] flex flex-col gap-2 p-4 sm:p-6 w-full max-w-sm pointer-events-none">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        {...toast}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
