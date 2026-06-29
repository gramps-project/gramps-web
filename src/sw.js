import {precacheAndRoute} from 'workbox-precaching'
import {registerRoute, NavigationRoute} from 'workbox-routing'
import {CacheFirst, NetworkFirst} from 'workbox-strategies'
import {CacheableResponsePlugin} from 'workbox-cacheable-response'
import {ExpirationPlugin} from 'workbox-expiration'

// Skip waiting immediately so the new SW activates without user interaction.
// clients.claim() fires controllerchange on all open tabs → PwaUpdateAvailable
// reloads them, recovering any tab stuck on a broken page.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event =>
  event.waitUntil(self.clients.claim())
)

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

precacheAndRoute(self.__WB_MANIFEST)

// Always fetch index.html fresh (cache:'no-cache'). Opaque redirects pass through.
registerRoute(
  new NavigationRoute(
    async ({request}) => {
      try {
        const revalidatingRequest = new Request(request, {cache: 'no-cache'})
        const response = await fetch(revalidatingRequest, {redirect: 'manual'})
        if (response.type === 'opaqueredirect') {
          console.log(
            '[SW]  NavigationRoute: opaque redirect - passing through'
          )
          return response
        }
        if (response.ok) {
          return response
        }
      } catch {
        // offline
      }
      return fetch(new Request(request, {cache: 'no-cache'}))
    },
    {denylist: [/^\/api.*/]}
  )
)

// config.js is replaced post-build, so serve it fresh with an offline fallback.
registerRoute(
  ({url}) => url.pathname === '/config.js',
  new NetworkFirst({
    cacheName: 'gramps-config-v1',
    plugins: [new CacheableResponsePlugin({statuses: [200]})],
  })
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
