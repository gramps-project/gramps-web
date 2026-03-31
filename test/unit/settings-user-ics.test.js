import {describe, it, expect, vi, afterEach} from 'vitest'

import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'

function createView({apiGet, apiPost, apiDelete}) {
  const view = new GrampsjsViewSettingsUser()
  view.appState = {
    i18n: {strings: {}},
    settings: {},
    permissions: {},
    dbInfo: {},
    apiGet: apiGet || vi.fn().mockResolvedValue({data: {}}),
    apiPost: apiPost || vi.fn().mockResolvedValue({data: {}}),
    apiDelete: apiDelete || vi.fn().mockResolvedValue({data: {}}),
    refreshTokenIfNeeded: vi.fn().mockResolvedValue('token'),
  }
  return view
}

describe('GrampsjsViewSettingsUser ICS controls', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads ICS token status from API', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      data: {
        active: true,
        url: 'https://example.test/api/anniversaries.ics?token=abc',
      },
    })
    const view = createView({apiGet})
    await view._fetchAnniversariesIcsTokenStatus()

    expect(apiGet).toHaveBeenCalledWith('/api/users/-/anniversaries/ics/token/')
    expect(view._icsToken).to.deep.equal({
      active: true,
      url: 'https://example.test/api/anniversaries.ics?token=abc',
    })
    expect(view._icsErrorMessage).to.equal('')
  })

  it('handles API error while loading ICS token status', async () => {
    const apiGet = vi.fn().mockResolvedValue({error: 'Not found'})
    const view = createView({apiGet})
    await view._fetchAnniversariesIcsTokenStatus()

    expect(view._icsToken).to.deep.equal({active: false, url: null})
    expect(view._icsErrorMessage).to.equal('Not found')
  })

  it('generates token and updates state', async () => {
    const apiPost = vi.fn().mockResolvedValue({
      data: {
        active: true,
        url: 'https://example.test/api/anniversaries.ics?token=xyz',
      },
    })
    const view = createView({apiPost})
    const notifications = []
    view.addEventListener('grampsjs:notification', event => {
      notifications.push(event.detail.message)
    })

    await view._generateAnniversariesIcsToken()

    expect(apiPost).toHaveBeenCalledWith(
      '/api/users/-/anniversaries/ics/token/',
      {},
      {dbChanged: false}
    )
    expect(view._icsToken).to.deep.equal({
      active: true,
      url: 'https://example.test/api/anniversaries.ics?token=xyz',
    })
    expect(notifications).to.deep.equal(['ICS subscription link updated'])
  })

  it('revokes token and updates state', async () => {
    const apiDelete = vi
      .fn()
      .mockResolvedValue({data: {active: false, url: null}})
    const view = createView({apiDelete})

    await view._revokeAnniversariesIcsToken()

    expect(apiDelete).toHaveBeenCalledWith(
      '/api/users/-/anniversaries/ics/token/',
      {dbChanged: false}
    )
    expect(view._icsToken).to.deep.equal({active: false, url: null})
    expect(view._icsErrorMessage).to.equal('')
  })

  it('copies ICS URL to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {writeText},
    })
    const view = createView({})
    view._icsToken = {
      active: true,
      url: 'https://example.test/api/anniversaries.ics?token=abc',
    }

    await view._copyAnniversariesIcsUrl()

    expect(writeText).toHaveBeenCalledWith(
      'https://example.test/api/anniversaries.ics?token=abc'
    )
    expect(view._icsCopied).to.equal(true)
  })
})
