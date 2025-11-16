/**
 * Service Worker - Version-Based Cache Management
 *
 * This service worker handles:
 * 1. Version detection and cache invalidation on app updates
 * 2. Offline-first caching for static assets
 * 3. Network-first for API calls and dynamic content
 * 4. Automatic cache cleanup on version changes
 */

// Cache version from build time
let APP_VERSION = 'unknown';

// Fetch version from server on install
async function getAppVersion() {
    try {
        const response = await fetch('/api/session-stats', { cache: 'no-store' });
        const data = await response.json();
        return data.version || 'unknown';
    } catch (e) {
        console.warn('[SW] Failed to fetch app version:', e.message);
        return 'unknown';
    }
}

// Initialize version
getAppVersion().then(v => {
    APP_VERSION = v;
    console.log(`[SW] Service Worker initialized with version: ${APP_VERSION}`);
});

const CACHE_PREFIX = 'submaker';
const getVersionedCacheName = (version) => `${CACHE_PREFIX}-static-v${version}`;
const API_CACHE_NAME = `${CACHE_PREFIX}-api-v1`;

// Assets to cache on install
const ASSET_URLS = [
    '/',
    '/configure',
    '/config.js',
    '/configure.html',
    '/favicon.svg'
];

/**
 * Install event: Cache static assets
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Install event triggered');

    event.waitUntil(
        getAppVersion().then(version => {
            APP_VERSION = version;
            const cacheName = getVersionedCacheName(version);

            return caches.open(cacheName).then(cache => {
                console.log(`[SW] Caching assets in ${cacheName}`);
                return cache.addAll(ASSET_URLS).catch(err => {
                    console.warn('[SW] Failed to cache some assets:', err.message);
                    // Don't fail install if some assets can't be cached
                    return Promise.resolve();
                });
            });
        })
    );

    // Skip waiting to activate immediately
    self.skipWaiting();
});

/**
 * Activate event: Clean up old cache versions
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event triggered');

    event.waitUntil(
        getAppVersion().then(currentVersion => {
            APP_VERSION = currentVersion;
            const currentCacheName = getVersionedCacheName(currentVersion);

            // Delete old version caches
            return caches.keys().then(cacheNames => {
                console.log(`[SW] Current version: ${currentVersion}, Current cache: ${currentCacheName}`);

                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Keep current version cache and API cache
                        if (cacheName === currentCacheName || cacheName === API_CACHE_NAME) {
                            console.log(`[SW] Keeping cache: ${cacheName}`);
                            return Promise.resolve();
                        }

                        // Delete old version caches
                        if (cacheName.startsWith(CACHE_PREFIX)) {
                            console.log(`[SW] Deleting old cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        }

                        return Promise.resolve();
                    })
                );
            });
        })
    );

    // Claim clients immediately
    self.clients.claim();
});

/**
 * Fetch event: Handle requests with appropriate caching strategy
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }

    // API calls: Network-first strategy
    if (url.pathname.startsWith('/api/')) {
        return event.respondWith(handleApiRequest(request));
    }

    // HTML pages: Network-first strategy
    if (url.pathname === '/' || url.pathname === '/configure' || url.pathname.endsWith('.html')) {
        return event.respondWith(handleHtmlRequest(request));
    }

    // Static assets: Cache-first strategy
    if (isStaticAsset(url.pathname)) {
        return event.respondWith(handleStaticAsset(request));
    }
});

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
    try {
        // Try to fetch from network
        const response = await fetch(request);

        // Cache successful API responses (except session-related)
        if (response.ok && !request.url.includes('session')) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        // Network failed, try cache
        const cached = await caches.match(request);
        if (cached) {
            console.log(`[SW] Serving API from cache: ${request.url}`);
            return cached;
        }

        // No cache available, return error response
        return new Response(
            JSON.stringify({ error: 'Offline - no cached response available' }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

/**
 * Handle HTML requests with network-first strategy
 */
async function handleHtmlRequest(request) {
    try {
        // Always try network first for HTML (configured with no-cache headers)
        const response = await fetch(request, { cache: 'no-store' });

        if (response.ok) {
            // Cache successful HTML responses
            const cache = await caches.open(getVersionedCacheName(APP_VERSION));
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        // Network failed, try cache
        const cached = await caches.match(request);
        if (cached) {
            console.log(`[SW] Serving HTML from cache: ${request.url}`);
            return cached;
        }

        return new Response(
            'Offline - no cached response available',
            {
                status: 503,
                statusText: 'Service Unavailable'
            }
        );
    }
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
    const cacheName = getVersionedCacheName(APP_VERSION);

    // Try cache first
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        // Not in cache, fetch from network
        const response = await fetch(request);

        if (response.ok) {
            // Cache the response
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        // Network failed and not in cache
        return new Response(
            'Offline - asset not cached',
            {
                status: 503,
                statusText: 'Service Unavailable'
            }
        );
    }
}

/**
 * Check if a path is a static asset
 */
function isStaticAsset(pathname) {
    const staticExtensions = ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.woff', '.woff2', '.ttf', '.eot'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Message handler for cache control from clients
 */
self.addEventListener('message', (event) => {
    console.log('[SW] Received message:', event.data);

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        handleClearCache();
    } else if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: APP_VERSION });
    }
});

/**
 * Manually clear cache when requested by client
 */
async function handleClearCache() {
    try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames.map(cacheName => {
            if (cacheName.startsWith(CACHE_PREFIX)) {
                console.log(`[SW] Clearing cache: ${cacheName}`);
                return caches.delete(cacheName);
            }
            return Promise.resolve();
        });

        await Promise.all(deletePromises);
        console.log('[SW] All caches cleared');
    } catch (error) {
        console.error('[SW] Error clearing cache:', error);
    }
}
