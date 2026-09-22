import {describe, expect, it} from 'vitest'

import {
  normalizeWebPushNotification,
  serializePushSubscription,
  urlBase64ToUint8Array,
  webPushTargetUrl,
} from '../../src/webPush.js'

describe('Web Push helpers', () => {
  it('converts a URL-safe VAPID public key', () => {
    expect([...urlBase64ToUint8Array('BAECAw')]).to.deep.equal([4, 1, 2, 3])
  })

  it('serializes only the browser subscription fields expected by the API', () => {
    const subscription = {
      toJSON: () => ({
        endpoint: 'https://push.example.test/1',
        expirationTime: undefined,
        keys: {p256dh: 'public-key', auth: 'auth-secret'},
        ignored: 'value',
      }),
    }

    expect(serializePushSubscription(subscription)).to.deep.equal({
      endpoint: 'https://push.example.test/1',
      expirationTime: null,
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
})
