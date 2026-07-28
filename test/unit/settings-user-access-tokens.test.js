import {afterEach, describe, expect, it, vi} from 'vitest'

import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'

const SCOPE = 'anniversaries_ics'
const TOKEN_ENDPOINT = `/api/users/-/access-tokens/${SCOPE}/`

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

function templateMarkup(value) {
  if (Array.isArray(value)) {
    return value.map(templateMarkup).join('')
  }
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

describe('persistent access token settings', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hides access token controls for unsupported API versions', () => {
    const apiGet = vi.fn()
    const view = createView({apiGet, version: '3.17.0'})
    const content = templateMarkup(view.renderContent())

    expect(content).not.to.contain('<h3>Access tokens</h3>')
    expect(content).not.to.contain('title="Access tokens"')

    view._loadAccessTokenStatusesIfNeeded()
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('renders active tokens under Account without a separate section', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      data: {active: true},
    })
    const view = createView({apiGet})

    await view._fetchAccessTokenStatus(SCOPE)
    const content = templateMarkup(view.renderContent())
    const tokenContent = templateMarkup(view.renderAccessTokens())

    expect(apiGet).toHaveBeenCalledWith(TOKEN_ENDPOINT)
    expect(content).to.match(
      /title="Account"(?:(?!<\/grampsjs-collapsible-section>)[\s\S])*<h3>Access tokens<\/h3>/
    )
    expect(content).not.to.contain('title="Access tokens"')
    expect(tokenContent).to.contain('Anniversary calendar subscription')
    expect(tokenContent).to.contain(SCOPE)
    expect(tokenContent).to.contain('Revoke')
    expect(tokenContent).not.to.contain('disabled')
  })

  it('shows loading without rendering a token row or revoke button', () => {
    const view = createView()
    const content = templateMarkup(view.renderAccessTokens())

    expect(content).to.contain('Loading...')
    expect(content).not.to.contain('<md-list-item')
    expect(content).not.to.contain('Revoke')
  })

  it('shows an empty state without rendering inactive scopes', async () => {
    const view = createView()

    await view._fetchAccessTokenStatus(SCOPE)
    const content = templateMarkup(view.renderAccessTokens())

    expect(view._accessTokenStates[SCOPE]).to.deep.equal({
      status: 'inactive',
      error: '',
    })
    expect(content).to.contain('No active access tokens.')
    expect(content).not.to.contain('Anniversary calendar subscription')
    expect(content).not.to.contain(SCOPE)
    expect(content).not.to.contain('<md-list-item')
    expect(content).not.to.contain('Revoke')
  })

  it('shows a generic loading error and retries unavailable scopes', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({error: 'Network error'})
      .mockResolvedValueOnce({data: {active: true}})
    const view = createView({apiGet})

    await view._fetchAccessTokenStatus(SCOPE)
    const errorContent = templateMarkup(view.renderAccessTokens())

    expect(view._accessTokenStates[SCOPE]).to.deep.equal({
      status: 'unavailable',
      error: 'Network error',
    })
    expect(errorContent).to.contain('Some access tokens could not be loaded.')
    expect(errorContent).not.to.contain('Anniversary calendar subscription')
    expect(errorContent).not.to.contain(SCOPE)
    expect(errorContent).to.contain('Retry')
    expect(errorContent).not.to.contain('Revoke')

    view._retryUnavailableAccessTokens()
    await vi.waitFor(() => {
      expect(view._accessTokenStates[SCOPE].status).to.equal('active')
    })

    expect(apiGet).toHaveBeenCalledTimes(2)
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

  it('removes a token after successful revocation', async () => {
    const apiDelete = vi.fn().mockResolvedValue({data: {active: false}})
    const view = createView({apiDelete})
    const notifications = []
    view.addEventListener('grampsjs:notification', event => {
      notifications.push(event.detail.message)
    })
    view._setAccessTokenState(SCOPE, {status: 'active', error: ''})
    view._requestAccessTokenRevocation(SCOPE)

    await view._confirmAccessTokenRevocation()
    const content = templateMarkup(view.renderAccessTokens())

    expect(apiDelete).toHaveBeenCalledOnce()
    expect(apiDelete).toHaveBeenCalledWith(TOKEN_ENDPOINT, {dbChanged: false})
    expect(view._accessTokenStates[SCOPE]).to.deep.equal({
      status: 'inactive',
      error: '',
    })
    expect(content).to.contain('No active access tokens.')
    expect(content).not.to.contain('<md-list-item')
    expect(notifications).to.deep.equal(['Access token revoked'])
  })

  it('keeps an enabled active token row when revocation fails', async () => {
    const apiDelete = vi.fn().mockResolvedValue({error: 'Delete failed'})
    const view = createView({apiDelete})
    const errors = []
    view.addEventListener('grampsjs:error', event => {
      errors.push(event.detail.message)
    })
    view._setAccessTokenState(SCOPE, {status: 'active', error: ''})
    view._requestAccessTokenRevocation(SCOPE)

    await view._confirmAccessTokenRevocation()
    const content = templateMarkup(view.renderAccessTokens())

    expect(view._accessTokenStates[SCOPE]).to.deep.equal({
      status: 'active',
      error: 'Delete failed',
    })
    expect(content).to.contain('Delete failed')
    expect(content).to.contain('Revoke')
    expect(content).not.to.contain('disabled')
    expect(errors).to.deep.equal(['Delete failed'])
  })
})
