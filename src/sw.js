import {precacheAndRoute, matchPrecache} from 'workbox-precaching'
import {registerRoute, NavigationRoute} from 'workbox-routing'
import {CacheFirst} from 'workbox-strategies'
import {CacheableResponsePlugin} from 'workbox-cacheable-response'
import {ExpirationPlugin} from 'workbox-expiration'

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] skipWaiting triggered')
    event.waitUntil(self.skipWaiting())
  }
})

// No clients.claim(): SKIP_WAITING → controllerchange → reload (via PwaUpdateAvailable)
// without the unwanted auto-reload on first install that clients.claim() causes.

precacheAndRoute(self.__WB_MANIFEST)

// Always fetch a fresh index.html (cache:'no-cache') so a new deployment's
// JS filenames are never blocked by a stale HTTP-cached index.html.
// Opaque redirects (e.g. Cloudflare Access) pass through; offline falls back
// to the precached index.html.
registerRoute(
  new NavigationRoute(
    async ({request}) => {
      try {
        const revalidatingRequest = new Request(request, {cache: 'no-cache'})
        const response = await fetch(revalidatingRequest, {redirect: 'manual'})
        if (response.type === 'opaqueredirect') {
          console.log('[SW] NavigationRoute: opaque redirect - passing through')
          return response
        }
        if (response.ok) {
          return response
        }
      } catch {
        // offline — fall through to precache
      }
      return matchPrecache('/index.html')
    },
    {denylist: [/^\/api.*/]}
  )
)

// Cache thumbnails: strip `jwt` from cache key (token rotation), strip `checksum`
// before fetching (backend rejects it; kept in cache key for invalidation).
const thumbnailPlugin = {
  cacheKeyWillBeUsed: async ({request}) => {
    const url = new URL(request.url)
    url.searchParams.delete('jwt')
    return url.toString()
  },
  requestWillFetch: async ({request}) => {
    const url = new URL(request.url)
    url.searchParams.delete('checksum')
    return new Request(url.toString(), request)
  },
}

const thumbnailCacheStrategy = new CacheFirst({
  cacheName: 'gramps-thumbnails-v1',
  plugins: [
    thumbnailPlugin,
    new CacheableResponsePlugin({statuses: [200]}),
    new ExpirationPlugin({maxEntries: 1000, maxAgeSeconds: 30 * 24 * 60 * 60}),
  ],
})

registerRoute(
  ({url}) => url.pathname.match(/\/api\/media\/[^/]+\/thumbnail\//),
  thumbnailCacheStrategy
)

registerRoute(
  ({url}) =>
    url.pathname.match(/\/api\/media\/[^/]+\/cropped\/.+\/thumbnail\//),
  thumbnailCacheStrategy
)
