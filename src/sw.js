import {precacheAndRoute, matchPrecache} from 'workbox-precaching'
import {registerRoute, NavigationRoute} from 'workbox-routing'
import {CacheFirst} from 'workbox-strategies'
import {CacheableResponsePlugin} from 'workbox-cacheable-response'
import {ExpirationPlugin} from 'workbox-expiration'

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting())
  }
})

self.addEventListener('activate', event => {
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim())
})

precacheAndRoute(self.__WB_MANIFEST)

// Try the network first with redirect:manual so cross-origin auth redirects
// (e.g. Cloudflare Access) are passed through to the browser. Falls back to
// precached index.html for SPA routing and offline use.
registerRoute(
  new NavigationRoute(
    async ({request}) => {
      try {
        const response = await fetch(request, {redirect: 'manual'})
        if (response.type === 'opaqueredirect') {
          return response
        }
        // Return successful network response
        if (response.ok) {
          return response
        }
      } catch {
        // offline
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
