import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

const csrfRecoveryAttemptKey = 'csrf-recovery-attempted';

window.axios.interceptors.response.use(
    (response) => {
        if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(csrfRecoveryAttemptKey);
        }

        return response;
    },
    (error) => {
        if (error?.response?.status === 419 && typeof window !== 'undefined') {
            const hasAttemptedRecovery = window.sessionStorage.getItem(csrfRecoveryAttemptKey) === '1';

            if (!hasAttemptedRecovery) {
                window.sessionStorage.setItem(csrfRecoveryAttemptKey, '1');
                window.location.reload();

                return new Promise(() => {});
            }

            window.sessionStorage.removeItem(csrfRecoveryAttemptKey);
        }

        return Promise.reject(error);
    }
);

window.Pusher = Pusher;

if (import.meta.env.VITE_PUSHER_APP_KEY) {
    window.Echo = new Echo({
        broadcaster: 'pusher',
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
        forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
    });
} else if (import.meta.env.VITE_REVERB_APP_KEY) {
    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
        wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
    });
}
