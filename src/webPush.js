export const PUSH_SUBSCRIPTIONS_ENDPOINT = '/api/users/-/push-subscriptions/'

export function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = globalThis.atob(base64)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

export function serializePushSubscription(subscription) {
  const value = subscription.toJSON()
  return {
    endpoint: value.endpoint,
    expirationTime: value.expirationTime ?? null,
    keys: {
      p256dh: value.keys?.p256dh,
      auth: value.keys?.auth,
    },
  }
}

function safeSameOriginUrl(value, baseUrl) {
  if (typeof value !== 'string' || !value) return undefined
  try {
    const url = new URL(value, baseUrl)
    return url.origin === new URL(baseUrl).origin ? url.href : undefined
  } catch {
    return undefined
  }
}

export function normalizeWebPushNotification(payload, baseUrl) {
  const value = payload && typeof payload === 'object' ? payload : {}
  const data = value.data && typeof value.data === 'object' ? value.data : {}
  const options = {
    body: typeof value.body === 'string' ? value.body : '',
    data: {
      url: safeSameOriginUrl(data.url, baseUrl) || baseUrl,
    },
  }

  for (const property of ['tag', 'lang']) {
    if (typeof value[property] === 'string') {
      options[property] = value[property]
    }
  }
  for (const property of ['icon', 'badge']) {
    const url = safeSameOriginUrl(value[property], baseUrl)
    if (url) options[property] = url
  }

  return {
    title:
      typeof value.title === 'string' && value.title.trim()
        ? value.title
        : 'Gramps Web',
    options,
  }
}

export function webPushTargetUrl(value, baseUrl) {
  return safeSameOriginUrl(value, baseUrl) || baseUrl
}
