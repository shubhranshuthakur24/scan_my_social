import { useState, useEffect } from 'react';

/**
 * useMediaQuery hook
 * @param {string} query - CSS media query string
 * @returns {boolean} - True if the query matches
 */
export default function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const media = window.matchMedia(query);
        const listener = (event) => setMatches(event.matches);

        // Keep state in sync when the query string changes.
        setMatches(media.matches);

        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', listener);
            return () => media.removeEventListener('change', listener);
        }

        // Fallback for older browsers.
        media.addListener(listener);
        return () => media.removeListener(listener);
    }, [query]);

    return matches;
}
