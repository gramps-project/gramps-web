import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GrampsjsWebPushSettings} from '../../src/components/GrampsjsWebPushSettings.js'
import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'
import {PUSH_SUBSCRIPTIONS_ENDPOINT} from '../../src/webPush.js'

const PUBLIC_KEY = 'BAECAw'

function createSubscription(endpoint = 'https://push.example.test/1') {
  return {
    endpoint,
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: () => ({
      endpoint,
      expirationTime: null,
      keys: {p256dh: 'public-key', auth: 'auth-secret'},
    }),
  }
}

function createElement(overrides = {}) {
  const element = new GrampsjsWebPushSettings()
  element.appState = {
    i18n: {strings: {}},
    apiGet: vi.fn().mockResolvedValue({
      data: {available: true, public_key: PUBLIC_KEY, subscriptions: 0},
    }),
    apiPost: vi.fn().mockResolvedValue({data: {subscriptions: 1}}),
    apiDelete: vi.fn().mockResolvedValue({data: {subscriptions: 0}}),
    ...overrides,
  }
  return element
}

function templateMarkup(value) {
  if (Array.isArray(value)) return value.map(templateMarkup).join('')
  if (value && Array.isArray(value.strings)) {
    return value.strings.reduce(
      (markup, string, index) =>
        `${markup}${string}${templateMarkup(value.values[index])}`,
      ''
    )
  }
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

function renderSettingsForApiVersion(version) {
  const view = new GrampsjsViewSettingsUser()
  view.appState = {
    i18n: {strings: {}},
    settings: {},
    permissions: {},
    dbInfo: {gramps_webapi: {version}},
  }
  return templateMarkup(view.renderContent())
}

function installBrowserApi({subscription = null, permission = 'default'} = {}) {
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(subscription),
    subscribe: vi.fn(),
  }
  const registration = {pushManager}
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: {
      permission,
      requestPermission: vi.fn().mockResolvedValue('granted'),
    },
  })
  Object.defineProperty(window, 'PushManager', {
    configurable: true,
    value: class PushManager {},
  })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    },
  })
  return {pushManager, registration}
}

describe('browser notification settings', () => {
  let descriptors

  beforeEach(() => {
    descriptors = {
      notification: Object.getOwnPropertyDescriptor(window, 'Notification'),
      pushManager: Object.getOwnPropertyDescriptor(window, 'PushManager'),
      serviceWorker: Object.getOwnPropertyDescriptor(
        navigator,
        'serviceWorker'
      ),
    }
  })

  afterEach(() => {
    for (const [target, property, descriptor] of [
      [window, 'Notification', descriptors.notification],
      [window, 'PushManager', descriptors.pushManager],
      [navigator, 'serviceWorker', descriptors.serviceWorker],
    ]) {
      if (descriptor) Object.defineProperty(target, property, descriptor)
      else delete target[property]
    }
    vi.restoreAllMocks()
  })

  it('is shown only for API 3.23 or newer', () => {
    expect(renderSettingsForApiVersion('3.22.9')).not.to.contain(
      'title="Browser notifications"'
    )
    expect(renderSettingsForApiVersion('3.23.0')).to.contain(
      'title="Browser notifications"'
    )
  })

  it('reports unsupported browsers without calling the API', async () => {
    delete window.PushManager
    const element = createElement()

    await element._loadState()

    expect(element._status).to.equal('unsupported')
    expect(element.appState.apiGet).not.toHaveBeenCalled()
  })

  it('reports a server where Web Push is unavailable', async () => {
    installBrowserApi()
    const element = createElement({
      apiGet: vi.fn().mockResolvedValue({
        data: {available: false, public_key: null, subscriptions: 0},
      }),
    })

    await element._loadState()

    expect(element._status).to.equal('unavailable')
  })

  it('synchronizes an existing browser subscription', async () => {
    const subscription = createSubscription()
    installBrowserApi({subscription, permission: 'granted'})
    const element = createElement()

    await element._loadState()

    expect(element._status).to.equal('active')
    expect(element.appState.apiPost).toHaveBeenCalledWith(
      PUSH_SUBSCRIPTIONS_ENDPOINT,
      subscription.toJSON(),
      {saving: false, dbChanged: false}
    )
  })

  it('requests permission only when the user enables notifications', async () => {
    const subscription = createSubscription()
    const {pushManager} = installBrowserApi()
    pushManager.subscribe.mockResolvedValue(subscription)
    const element = createElement()
    element._publicKey = PUBLIC_KEY

    await element._enable()

    expect(window.Notification.requestPermission).toHaveBeenCalledOnce()
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([4, 1, 2, 3]),
    })
    expect(element._status).to.equal('active')
  })

  it('keeps a dismissed permission prompt retryable', async () => {
    installBrowserApi()
    window.Notification.requestPermission.mockResolvedValue('default')
    const element = createElement()

    await element._enable()

    expect(element._status).to.equal('permission-dismissed')
    expect(element.appState.apiPost).not.toHaveBeenCalled()
  })

  it('rolls back a new browser subscription when server storage fails', async () => {
    const subscription = createSubscription()
    const {pushManager} = installBrowserApi()
    pushManager.subscribe.mockResolvedValue(subscription)
    const element = createElement({
      apiPost: vi.fn().mockResolvedValue({error: 'Storage failed'}),
    })
    element._publicKey = PUBLIC_KEY

    await element._enable()

    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(element._status).to.equal('error')
  })

  it('unsubscribes locally and removes exactly that endpoint', async () => {
    const subscription = createSubscription()
    installBrowserApi({subscription})
    const element = createElement()
    element._subscription = subscription

    await element._disable()

    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(element.appState.apiDelete).toHaveBeenCalledWith(
      PUSH_SUBSCRIPTIONS_ENDPOINT,
      {
        body: {endpoint: subscription.endpoint},
        saving: false,
        dbChanged: false,
      }
    )
    expect(element._status).to.equal('inactive')
  })

  it('retries server cleanup without recreating the browser subscription', async () => {
    const subscription = createSubscription()
    installBrowserApi({subscription})
    const apiDelete = vi
      .fn()
      .mockResolvedValueOnce({error: 'Network error'})
      .mockResolvedValueOnce({data: {subscriptions: 0}})
    const element = createElement({apiDelete})
    element._subscription = subscription

    await element._disable()
    await element._retry()

    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(apiDelete).toHaveBeenCalledTimes(2)
    expect(element._status).to.equal('inactive')
  })
})
