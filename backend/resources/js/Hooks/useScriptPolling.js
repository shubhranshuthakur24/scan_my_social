import { useEffect, useRef } from 'react';

/**
 * Custom hook for centralizing polling logic across the application.
 * Solves stale closure issues and ensures we only poll when necessary.
 * 
 * @param {Object} options
 * @param {boolean} options.enabled - Whether polling is currently active
 * @param {Function} options.onPoll - The function to execute on each poll interval
 * @param {number} [options.intervalMs=3000] - Polling interval in milliseconds
 */
export default function useScriptPolling({ enabled, onPoll, intervalMs = 3000 }) {
    // Use a ref to store the latest onPoll callback to avoid stale closures
    // without triggering re-renders or resetting the interval repeatedly.
    const onPollRef = useRef(onPoll);

    useEffect(() => {
        onPollRef.current = onPoll;
    }, [onPoll]);

    useEffect(() => {
        if (!enabled) return;

        let loading = false;

        const interval = setInterval(async () => {
            if (document.visibilityState !== 'visible' || loading) return;

            loading = true;
            try {
                await onPollRef.current?.();
            } finally {
                loading = false;
            }
        }, intervalMs);

        // Cleanup interval on unmount or when `enabled` changes
        return () => clearInterval(interval);
    }, [enabled, intervalMs]);
}
