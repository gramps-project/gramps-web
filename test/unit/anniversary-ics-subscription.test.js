import {afterEach, describe, expect, it, vi} from 'vitest'

import {__APIHOST__} from '../../src/api.js'
import {GrampsjsAnniversaryIcsSubscription} from '../../src/components/GrampsjsAnniversaryIcsSubscription.js'
import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'

const SCOPE = 'anniversaries_ics'
const TOKEN_ENDPOINT = `/api/users/-/access-tokens/${SCOPE}/`
const originalClipboard = globalThis.navigator.clipboard

function createSubscription({apiPost} = {}) {
  const subscription = new GrampsjsAnniversaryIcsSubscription()
  subscription.appState = {
    i18n: {strings: {}},
    apiPost:
      apiPost ||
      vi.fn().mockResolvedValue({data: {active: true, token: 'token'}}),
  }
  return subscription
}

function createSettingsView(version = '3.18.0') {
  const view = new GrampsjsViewSettingsUser()
  view.appState = {
    i18n: {strings: {}},
    settings: {},
    permissions: {},
    dbInfo: {gramps_webapi: {version}},
    apiGet: vi.fn().mockResolvedValue({data: {active: false}}),
    apiDelete: vi.fn().mockResolvedValue({data: {active: false}}),
  }
  return view
}

function templateText(value) {
  if (Array.isArray(value)) {
    return value.map(templateText).join(' ')
  }
  if (value && Array.isArray(value.values)) {
    return value.values.map(templateText).join(' ')
  }
  return typeof value === 'string' ? value : ''
}

describe('anniversary ICS subscription settings', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
  })

  it('is included when the persistent token API is supported', () => {
    const view = createSettingsView()

    expect(templateText(view.renderContent())).to.contain(
      'Anniversary calendar (ICS)'
    )
  })

  it('generates a token and exposes only the complete subscription URL', async () => {
    const apiPost = vi.fn().mockResolvedValue({
      data: {active: true, token: 'new token/+?'},
    })
    const subscription = createSubscription({apiPost})
    const tokenChanges = []
    subscription.tokenStatus = 'inactive'
    subscription.addEventListener('access-token:changed', event => {
      tokenChanges.push(event.detail)
    })

    await subscription._generateToken()

    expect(apiPost).toHaveBeenCalledWith(TOKEN_ENDPOINT, {}, {dbChanged: false})
    expect(subscription._url).to.equal(
      `${__APIHOST__}/api/anniversaries.ics?token=new+token%2F%2B%3F`
    )
    expect(subscription.token).to.equal(undefined)
    expect(subscription._token).to.equal(undefined)
    expect(tokenChanges).to.deep.equal([
      {scope: SCOPE, status: 'loading'},
      {scope: SCOPE, status: 'active'},
    ])
  })

  it('builds an absolute feed URL for a same-origin API', () => {
    const subscription = createSubscription()

    expect(subscription._buildUrl('secret value', '')).to.equal(
      `${window.location.origin}/api/anniversaries.ics?token=secret+value`
    )
  })

  it('does not generate while token status is unavailable', async () => {
    const apiPost = vi.fn()
    const subscription = createSubscription({apiPost})
    subscription.tokenStatus = 'unavailable'

    await subscription._generateToken()

    expect(apiPost).not.toHaveBeenCalled()
    expect(subscription._url).to.equal('')
  })

  it('rejects a successful response without a raw token', async () => {
    const apiPost = vi.fn().mockResolvedValue({data: {active: true}})
    const subscription = createSubscription({apiPost})
    const errors = []
    const tokenChanges = []
    subscription.tokenStatus = 'inactive'
    subscription.addEventListener('grampsjs:error', event => {
      errors.push(event.detail.message)
    })
    subscription.addEventListener('access-token:changed', event => {
      tokenChanges.push(event.detail)
    })

    await subscription._generateToken()

    expect(subscription._url).to.equal('')
    expect(subscription._errorMessage).to.equal(
      'No access token returned by server'
    )
    expect(errors).to.deep.equal(['No access token returned by server'])
    expect(tokenChanges).to.deep.equal([
      {scope: SCOPE, status: 'loading'},
      {scope: SCOPE, status: 'inactive'},
    ])
  })

  it('copies only the complete subscription URL', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {writeText},
    })
    const subscription = createSubscription()
    subscription._url = `${__APIHOST__}/api/anniversaries.ics?token=secret`

    await subscription._copyUrl()

    expect(writeText).toHaveBeenCalledWith(subscription._url)
    expect(subscription._copied).to.equal(true)
  })

  it('clears a generated URL after centralized revocation', () => {
    const subscription = createSubscription()
    subscription._url = `${__APIHOST__}/api/anniversaries.ics?token=secret`
    subscription.tokenStatus = 'inactive'

    subscription.updated(new Map([['tokenStatus', 'active']]))

    expect(subscription._url).to.equal('')
  })

  it('synchronizes generation with the centralized token state', () => {
    const view = createSettingsView()

    view._handleAccessTokenChanged({
      detail: {scope: SCOPE, status: 'active'},
    })

    expect(view._accessTokenStates[SCOPE]).to.deep.equal({
      status: 'active',
      error: '',
    })
  })

  it('leaves revocation exclusively to the centralized manager', () => {
    const subscription = createSubscription()

    expect(subscription._revokeToken).to.equal(undefined)
    expect(subscription.appState.apiDelete).to.equal(undefined)
  })
})
