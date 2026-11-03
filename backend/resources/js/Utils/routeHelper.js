export const APP_DOMAIN = 'https://app.scanmysocial.com';
export const PUBLIC_DOMAIN = 'https://scanmysocial.com';

const APP_ROUTES = [
    'dashboard',
    'login',
    'register',
    'logout',
    'password',
    'verification',
    'profile',
    'settings',
    'projects',
    'channels',
    'videos',
    'scripts',
    'autodm',
    'lead-forms',
    'referrals',
    'watchlists',
    'recent-activity',
    'viral-image-prompts',
    'confirm-password',
    'affiliate'
];

/**
 * Generates an absolute URL for a given route name and parameters,
 * switching between APP_DOMAIN and PUBLIC_DOMAIN based on the route category.
 */
export function toAbsoluteRoute(name, params = {}) {
    // Ensure route() helper is available (from Ziggy)
    if (typeof route === 'undefined') {
        console.warn('Ziggy route() helper not found. Returning relative path.');
        return `/${name}`;
    }

    const path = route(name, params, false);
    const isAppRoute = APP_ROUTES.some(r => name === r || name.startsWith(`${r}.`));

    return `${isAppRoute ? APP_DOMAIN : PUBLIC_DOMAIN}${path}`;
}
