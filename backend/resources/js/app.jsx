import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ToastProvider } from '@/Contexts/ToastContext';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Laravel';

if (typeof window !== 'undefined') {
    document.addEventListener('inertia:before', (event) => {
        const url = event?.detail?.visit?.url;
        if (!url) {
            return;
        }

        const target =
            typeof url === 'string'
                ? new URL(url, window.location.origin)
                : new URL(url.href, window.location.origin);

        if (target.host !== window.location.host) {
            event.preventDefault();
            window.location.href = target.toString();
        }
    });
}

createInertiaApp({
    title: (title) => {
        if (!title) return appName;
        if (title.includes(appName)) return title;
        return `${title} - ${appName}`;
    },
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ToastProvider>
                <App {...props} />
            </ToastProvider>
        );
    },
    progress: {
        color: '#7C3AED',
    },
});
