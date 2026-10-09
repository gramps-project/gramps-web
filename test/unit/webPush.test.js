import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  focusOrOpenWebPushWindow,
  normalizeWebPushNotification,
  removeWebPushSubscription,
  serializePushSubscription,
  urlBase64ToUint8Array,
  webPushTargetUrl,
} from '../../src/webPush.js'

describe('Web Push helpers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('converts a URL-safe VAPID public key', () => {
    expect([...urlBase64ToUint8Array('BAECAw')]).to.deep.equal([4, 1, 2, 3])
  })

  it('serializes only the browser subscription fields expected by the API', () => {
    const subscription = {
      toJSON: () => ({
        endpoint: 'https://push.example.test/1',
        keys: {p256dh: 'public-key', auth: 'auth-secret'},
        ignored: 'value',
      }),
    }

    expect(serializePushSubscription(subscription)).to.deep.equal({
      endpoint: 'https://push.example.test/1',
      keys: {p256dh: 'public-key', auth: 'auth-secret'},
    })
  })

  it('normalizes notification content and keeps URLs on the app origin', () => {
    const notification = normalizeWebPushNotification(
      {
        title: 'New activity',
        body: 'A record changed',
        icon: '/images/icon192.png',
        data: {url: '/person/abc'},
      },
      'https://tree.example.test/app/'
    )

    expect(notification).to.deep.equal({
      title: 'New activity',
      options: {
        body: 'A record changed',
        icon: 'https://tree.example.test/images/icon192.png',
        data: {url: 'https://tree.example.test/person/abc'},
      },
    })
    expect(
      webPushTargetUrl(
        'https://attacker.example/redirect',
        'https://tree.example.test/app/'
      )
    ).to.equal('https://tree.example.test/app/')
  })

  it('uses safe defaults for malformed payloads', () => {
    expect(
      normalizeWebPushNotification(null, 'https://tree.example.test/app/')
    ).to.deep.equal({
      title: 'Gramps Web',
      options: {
        body: '',
        data: {url: 'https://tree.example.test/app/'},
      },
    })
  })

  it('focuses a matching tab without navigating another tab', async () => {
    const other = {url: 'https://tree.test/edit', navigate: vi.fn()}
    const matching = {url: 'https://tree.test/person/1', focus: vi.fn()}
    const clients = {
      matchAll: vi.fn().mockResolvedValue([other, matching]),
      openWindow: vi.fn(),
    }

    await focusOrOpenWebPushWindow(clients, matching.url)

    expect(matching.focus).toHaveBeenCalledOnce()
    expect(other.navigate).not.toHaveBeenCalled()
    expect(clients.openWindow).not.toHaveBeenCalled()
  })

  it('opens a new window if no tab matches the target', async () => {
    const other = {
      url: 'https://tree.test/edit',
      navigate: vi.fn(),
      focus: vi.fn(),
    }
    const clients = {
      matchAll: vi.fn().mockResolvedValue([other]),
      openWindow: vi.fn(),
    }

    await focusOrOpenWebPushWindow(clients, 'https://tree.test/person/1')

    expect(clients.openWindow).toHaveBeenCalledWith(
      'https://tree.test/person/1'
    )
    expect(other.navigate).not.toHaveBeenCalled()
    expect(other.focus).not.toHaveBeenCalled()
  })

  it('tries both logout cleanup methods independently', async () => {
    const subscription = {
      endpoint: 'https://push.test/1',
      unsubscribe: vi.fn().mockResolvedValue(false),
    }
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(subscription),
          },
        }),
      },
    })
    const deleteRemote = vi.fn().mockResolvedValue({data: {}})

    expect(await removeWebPushSubscription(deleteRemote)).to.equal(true)
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(deleteRemote).toHaveBeenCalledWith(subscription.endpoint)
  })
})
