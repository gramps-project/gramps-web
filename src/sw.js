import {precacheAndRoute, createHandlerBoundToURL} from 'workbox-precaching'
import {registerRoute, NavigationRoute} from 'workbox-routing'
import {CacheFirst} from 'workbox-strategies'
import {CacheableResponsePlugin} from 'workbox-cacheable-response'
import {ExpirationPlugin} from 'workbox-expiration'

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api.*/],
  })
)

registerRoute('polyfills/*.js', new CacheFirst(), 'GET')

// Cache thumbnails with a stable cache key:
// - strip `jwt` so token rotation doesn't bust the cache
// - keep `checksum` in the cache key for content-addressed invalidation
// - strip `checksum` before the network request so the backend doesn't reject it
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
