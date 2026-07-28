import {afterEach, describe, expect, it, vi} from 'vitest'

import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'

const SCOPE = 'anniversaries_ics'
const TOKEN_ENDPOINT = `/api/users/-/access-tokens/${SCOPE}/`

function templateText(value) {
  if (Array.isArray(value)) {
    return value.map(templateText).join(' ')
  }
  if (value && Array.isArray(value.values)) {
    return value.values.map(templateText).join(' ')
  }
  return typeof value === 'string' ? value : ''
}

function createView({apiGet, apiDelete, version = '3.18.0'} = {}) {
  const view = new GrampsjsViewSettingsUser()
  view.appState = {
    i18n: {strings: {}},
    settings: {},
    permissions: {},
    dbInfo: {gramps_webapi: {version}},
    apiGet: apiGet || vi.fn().mockResolvedValue({data: {active: false}}),
    apiDelete: apiDelete || vi.fn().mockResolvedValue({data: {active: false}}),
  }
  return view
}

describe('persistent access token settings', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hides the section for API versions without persistent tokens', () => {
    const view = createView({version: '3.17.0'})

    expect(templateText(view.renderContent())).not.to.contain('Access tokens')
  })

  it('renders every known scope and its active state', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      data: {active: true, token: 'must-not-be-stored'},
    })
    const view = createView({apiGet})

    await view._fetchAccessTokenStatus(SCOPE)
    const content = templateText(view.renderContent())

    expect(apiGet).toHaveBeenCalledWith(TOKEN_ENDPOINT)
    expect(view._accessTokenStates).to.deep.equal({
      [SCOPE]: {status: 'active', error: ''},
    })
    expect(content).to.contain('Access tokens')
    expect(content).to.contain('Anniversary calendar subscription')
    expect(content).to.contain(SCOPE)
    expect(content).to.contain('Active')
    expect(JSON.stringify(view._accessTokenStates)).not.to.contain(
      'must-not-be-stored'
    )
    expect(content).not.to.contain('must-not-be-stored')
  })

  it('represents an inactive scope', async () => {
    const view = createView()

    await view._fetchAccessTokenStatus(SCOPE)

    expect(view._accessTokenStates[SCOPE]).to.deep.equal({
      status: 'inactive',
      error: '',
    })
    expect(view._accessTokenStatusLabel(SCOPE)).to.equal('Inactive')
  })

  it('isolates status errors and allows the scope to be retried', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({error: 'Network error'})
      .mockResolvedValueOnce({data: {active: true}})
    const view = createView({apiGet})

    await view._fetchAccessTokenStatus(SCOPE)

    expect(view._accessTokenStates[SCOPE]).to.deep.equal({
      status: 'unavailable',
      error: 'Network error',
    })

    await view._fetchAccessTokenStatus(SCOPE)

    expect(view._accessTokenStates[SCOPE]).to.deep.equal({
      status: 'active',
      error: '',
    })
  })

  it('does not load token status on unsupported API versions', () => {
    const apiGet = vi.fn()
    const view = createView({apiGet, version: '3.17.0'})

    view._loadAccessTokenStatusesIfNeeded()

    expect(apiGet).not.toHaveBeenCalled()
  })

  it('refreshes known scopes when the settings view is reactivated', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({data: {active: false}})
      .mockResolvedValueOnce({data: {active: true}})
    const view = createView({apiGet})

    await view._fetchAccessTokenStatus(SCOPE)
    view._loadAccessTokenStatusesIfNeeded(true)
    await vi.waitFor(() => {
      expect(view._accessTokenStates[SCOPE].status).to.equal('active')
    })

    expect(apiGet).toHaveBeenCalledTimes(2)
  })

  it('cancels revocation without calling the API', async () => {
    const apiDelete = vi.fn()
    const view = createView({apiDelete})
    view._setAccessTokenState(SCOPE, {status: 'active', error: ''})
    view._requestAccessTokenRevocation(SCOPE)

    view._cancelAccessTokenRevocation()
    await view._confirmAccessTokenRevocation()

    expect(view._pendingAccessTokenScope).to.equal('')
    expect(apiDelete).not.toHaveBeenCalled()
  })

  it('revokes an active token after confirmation', async () => {
    const apiDelete = vi.fn().mockResolvedValue({data: {active: false}})
    const view = createView({apiDelete})
    const notifications = []
    view.addEventListener('grampsjs:notification', event => {
      notifications.push(event.detail.message)
    })
    view._setAccessTokenState(SCOPE, {status: 'active', error: ''})
    view._requestAccessTokenRevocation(SCOPE)

    await view._confirmAccessTokenRevocation()

    expect(apiDelete).toHaveBeenCalledOnce()
    expect(apiDelete).toHaveBeenCalledWith(TOKEN_ENDPOINT, {dbChanged: false})
    expect(view._accessTokenStates[SCOPE]).to.deep.equal({
      status: 'inactive',
      error: '',
    })
    expect(notifications).to.deep.equal(['Access token revoked'])
  })

  it('keeps a token active when revocation fails', async () => {
    const apiDelete = vi.fn().mockResolvedValue({error: 'Delete failed'})
    const view = createView({apiDelete})
    const errors = []
    view.addEventListener('grampsjs:error', event => {
      errors.push(event.detail.message)
    })
    view._setAccessTokenState(SCOPE, {status: 'active', error: ''})
    view._requestAccessTokenRevocation(SCOPE)

    await view._confirmAccessTokenRevocation()

    expect(view._accessTokenStates[SCOPE]).to.deep.equal({
      status: 'active',
      error: 'Delete failed',
    })
    expect(errors).to.deep.equal(['Delete failed'])
  })

  it('does not expose token generation or ICS URL helpers', () => {
    const view = createView()

    expect(view._generateAnniversaryIcsToken).to.equal(undefined)
    expect(view._buildAnniversaryIcsUrl).to.equal(undefined)
    expect(view.appState.apiPost).to.equal(undefined)
  })
})
