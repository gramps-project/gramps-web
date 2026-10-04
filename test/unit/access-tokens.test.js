import {html} from 'lit'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {GrampsjsAccessTokens} from '../../src/components/GrampsjsAccessTokens.js'
import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'

const SCOPE = 'anniversaries_ics'
const TOKEN_ENDPOINT = `/api/users/-/access-tokens/${SCOPE}/`
const SYNC_ENDPOINT = '/api/users/-/access-tokens/sync/tokens/'

const NOT_FOUND = {error: 'Not Found', errorDetail: {status: 404}}

const LAPTOP = {
  id: 1,
  label: 'Laptop',
  created_at: '2026-10-01T10:00:00',
  last_used_at: null,
}
const DESKTOP = {
  id: 2,
  label: 'Desktop',
  created_at: '2026-10-02T10:00:00',
  last_used_at: '2026-10-03T10:00:00',
}

function createAppState({apiGet, apiDelete, apiPost, version = '3.18.0'} = {}) {
  return {
    i18n: {strings: {}},
    settings: {},
    permissions: {},
    dbInfo: {gramps_webapi: {version}},
    apiGet: apiGet || vi.fn().mockResolvedValue({data: {active: false}}),
    apiDelete: apiDelete || vi.fn().mockResolvedValue({data: {}}),
    apiPost: apiPost || vi.fn(),
  }
}

function createTokens(options) {
  const element = new GrampsjsAccessTokens()
  element.appState = createAppState(options)
  return element
}

// API answering per endpoint: ICS status, and the sync token list (or 404)
function endpointGet({ics = {data: {active: false}}, sync = NOT_FOUND} = {}) {
  return vi.fn(async endpoint => (endpoint === SYNC_ENDPOINT ? sync : ics))
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

function stubLabelField(element, field) {
  element.renderRoot = {querySelector: () => field}
}

function collectEvents(element, name) {
  const messages = []
  element.addEventListener(name, event => {
    messages.push(event.detail.message)
  })
  return messages
}

describe('access tokens in the user settings view', () => {
  function createView(version) {
    const view = new GrampsjsViewSettingsUser()
    view.appState = createAppState({version})
    return view
  }

  it('hides access token controls for unsupported API versions', () => {
    const content = templateMarkup(createView('3.17.0').renderContent())

    expect(content).not.to.contain('<h3>Access tokens</h3>')
    expect(content).not.to.contain('<grampsjs-access-tokens')
  })

  it('refreshes the token component each time the view is shown', async () => {
    const refresh = vi
      .spyOn(GrampsjsAccessTokens.prototype, 'refresh')
      .mockImplementation(() => {})
    const view = createView('3.18.0')
    view._fetchOwnUserDetails = vi.fn()
    view._fetchDataLang = vi.fn()
    // the full view needs form-associated elements happy-dom lacks
    view.renderContent = () =>
      html`<grampsjs-access-tokens></grampsjs-access-tokens>`
    document.body.append(view)

    try {
      view.active = true
      await view.updateComplete
      view.active = false
      await view.updateComplete
      view.active = true
      await view.updateComplete

      expect(refresh).toHaveBeenCalledTimes(2)
    } finally {
      view.remove()
      refresh.mockRestore()
    }
  })

  it('renders the token component under Account', () => {
    const content = templateMarkup(createView('3.18.0').renderContent())

    expect(content).to.match(
      /title="Account"(?:(?!<\/grampsjs-collapsible-section>)[\s\S])*<h3>Access tokens<\/h3>\s*<grampsjs-access-tokens/
    )
    expect(content).not.to.contain('title="Access tokens"')
  })
})

describe('single-token scopes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not load tokens for unsupported API versions', () => {
    const apiGet = vi.fn()
    const element = createTokens({apiGet, version: '3.17.0'})

    element._loadIfNeeded()

    expect(apiGet).not.toHaveBeenCalled()
  })

  it('renders an active token', async () => {
    const apiGet = vi.fn().mockResolvedValue({data: {active: true}})
    const element = createTokens({apiGet})

    await element._fetchStatus(SCOPE)
    const content = templateMarkup(element.render())

    expect(apiGet).toHaveBeenCalledWith(TOKEN_ENDPOINT)
    expect(content).to.contain('Anniversary calendar subscription')
    expect(content).to.contain(SCOPE)
    expect(content).to.contain('Revoke')
    expect(content).not.to.contain('disabled')
  })

  it('shows loading without rendering a token row or revoke button', () => {
    const content = templateMarkup(createTokens().render())

    expect(content).to.contain('Loading...')
    expect(content).not.to.contain('<md-list-item')
    expect(content).not.to.contain('Revoke')
  })

  it('shows an empty state without rendering inactive scopes', async () => {
    const element = createTokens({apiGet: endpointGet()})

    await element._fetchStatus(SCOPE)
    await element._fetchStatus('sync')
    const content = templateMarkup(element.render())

    expect(element._states[SCOPE]).to.deep.equal({
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
    const element = createTokens({apiGet})

    await element._fetchStatus(SCOPE)
    const errorContent = templateMarkup(element.render())

    expect(element._states[SCOPE]).to.deep.equal({
      status: 'unavailable',
      error: 'Network error',
    })
    expect(errorContent).to.contain('Some access tokens could not be loaded.')
    expect(errorContent).not.to.contain('Anniversary calendar subscription')
    expect(errorContent).to.contain('Retry')
    expect(errorContent).not.to.contain('Revoke')

    element._retryUnavailable()
    await vi.waitFor(() => {
      expect(element._states[SCOPE].status).to.equal('active')
    })

    expect(apiGet).toHaveBeenCalledTimes(2)
  })

  it('refreshes known scopes when reactivated, keeping them visible', async () => {
    let resolveRefresh
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({data: {active: true}})
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveRefresh = resolve
        })
      )
    const element = createTokens({apiGet})

    await element._fetchStatus(SCOPE)
    const refresh = element._fetchStatus(SCOPE)

    expect(element._states[SCOPE].status).to.equal('active')
    resolveRefresh({data: {active: false}})
    await refresh
    expect(element._states[SCOPE].status).to.equal('inactive')
    expect(apiGet).toHaveBeenCalledTimes(2)
  })

  it('does not start a second request while one is in flight', async () => {
    const apiGet = vi.fn().mockResolvedValue({data: {active: true}})
    const element = createTokens({apiGet})

    await Promise.all([
      element._fetchStatus(SCOPE),
      element._fetchStatus(SCOPE),
    ])

    expect(apiGet).toHaveBeenCalledOnce()
  })

  it('cancels revocation without calling the API', async () => {
    const apiDelete = vi.fn()
    const element = createTokens({apiDelete})
    element._setState(SCOPE, {status: 'active', error: ''})
    element._requestRevocation(SCOPE)

    element._cancelRevocation()
    await element._confirmRevocation()

    expect(element._pendingRevocation).to.equal(null)
    expect(apiDelete).not.toHaveBeenCalled()
  })

  it('removes a token after successful revocation', async () => {
    const apiDelete = vi.fn().mockResolvedValue({data: {}})
    const element = createTokens({apiDelete})
    element._setState('sync', {status: 'unsupported', error: ''})
    const notifications = collectEvents(element, 'grampsjs:notification')
    element._setState(SCOPE, {status: 'active', error: ''})
    element._requestRevocation(SCOPE)

    await element._confirmRevocation()
    const content = templateMarkup(element.render())

    expect(apiDelete).toHaveBeenCalledOnce()
    expect(apiDelete).toHaveBeenCalledWith(TOKEN_ENDPOINT, {dbChanged: false})
    expect(element._states[SCOPE]).to.deep.equal({
      status: 'inactive',
      error: '',
    })
    expect(content).to.contain('No active access tokens.')
    expect(content).not.to.contain('<md-list-item')
    expect(notifications).to.deep.equal(['Access token revoked'])
  })

  it('keeps an enabled active token row when revocation fails', async () => {
    const apiDelete = vi.fn().mockResolvedValue({error: 'Delete failed'})
    const element = createTokens({apiDelete})
    const errors = collectEvents(element, 'grampsjs:error')
    element._setState(SCOPE, {status: 'active', error: ''})
    element._requestRevocation(SCOPE)

    await element._confirmRevocation()
    const content = templateMarkup(element.render())

    expect(element._states[SCOPE]).to.deep.equal({
      status: 'active',
      error: 'Delete failed',
    })
    expect(content).to.contain('Delete failed')
    expect(content).to.contain('Revoke')
    expect(content).not.to.contain('disabled')
    expect(errors).to.deep.equal(['Delete failed'])
  })
})

describe('multiple-token scopes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hides the scope when the server lacks the token list endpoint', async () => {
    const element = createTokens({apiGet: endpointGet()})

    await element._fetchStatus(SCOPE)
    await element._fetchStatus('sync')
    const content = templateMarkup(element.render())

    expect(element._states.sync.status).to.equal('unsupported')
    expect(content).not.to.contain('Add sync device')
    expect(content).not.to.contain('Some access tokens could not be loaded.')
    expect(content).to.contain('No active access tokens.')
  })

  it('does not refetch an unsupported scope on refresh', async () => {
    const apiGet = endpointGet()
    const element = createTokens({apiGet})
    await element._fetchStatus('sync')
    apiGet.mockClear()

    element.refresh()
    await vi.waitFor(() => expect(apiGet).toHaveBeenCalled())

    expect(apiGet).not.toHaveBeenCalledWith(SYNC_ENDPOINT)
  })

  it('lists each token with its label and dates', async () => {
    const element = createTokens({
      apiGet: endpointGet({sync: {data: [LAPTOP, DESKTOP]}}),
    })

    await element._fetchStatus('sync')
    const content = templateMarkup(element.render())

    expect(content.match(/<md-list-item/g)).to.have.length(2)
    expect(content).to.contain('Laptop')
    expect(content).to.contain('Desktop')
    expect(content).to.contain('Last used: Never')
    expect(content).to.contain('Add sync device')
  })

  it('offers creation when there are no tokens yet', async () => {
    const element = createTokens({apiGet: endpointGet({sync: {data: []}})})

    await element._fetchStatus('sync')
    const content = templateMarkup(element.render())

    expect(element._states.sync.status).to.equal('inactive')
    expect(content).to.contain('Add sync device')
    expect(content).not.to.contain('<md-list-item')
  })

  it('revokes a single token and keeps the others', async () => {
    const apiDelete = vi.fn().mockResolvedValue({data: {}})
    const element = createTokens({apiDelete})
    const notifications = collectEvents(element, 'grampsjs:notification')
    element._setState('sync', {
      status: 'active',
      tokens: [LAPTOP, DESKTOP],
      error: '',
    })

    element._requestRevocation('sync', 1)
    await element._confirmRevocation()

    expect(apiDelete).toHaveBeenCalledWith(`${SYNC_ENDPOINT}1/`, {
      dbChanged: false,
    })
    expect(element._states.sync).to.deep.equal({
      status: 'active',
      tokens: [DESKTOP],
      error: '',
    })
    expect(notifications).to.deep.equal(['Access token revoked'])
  })

  it('becomes inactive after revoking the last token', async () => {
    const element = createTokens()
    element._setState('sync', {status: 'active', tokens: [LAPTOP], error: ''})

    element._requestRevocation('sync', 1)
    await element._confirmRevocation()

    expect(element._states.sync).to.deep.equal({
      status: 'inactive',
      tokens: [],
      error: '',
    })
  })

  it('shows a revocation error only on the affected token', async () => {
    const apiDelete = vi.fn().mockResolvedValue({error: 'Delete failed'})
    const element = createTokens({apiDelete})
    element._setState('sync', {
      status: 'active',
      tokens: [LAPTOP, DESKTOP],
      error: '',
    })

    element._requestRevocation('sync', 2)
    await element._confirmRevocation()
    const entries = element._entries()

    expect(entries.map(({error}) => error)).to.deep.equal(['', 'Delete failed'])
  })

  it('creates a token, adds it to the list and shows its value once', async () => {
    const apiPost = vi.fn().mockResolvedValue({
      data: {...DESKTOP, token: 'secret'},
    })
    const element = createTokens({apiPost})
    element._setState('sync', {status: 'active', tokens: [LAPTOP], error: ''})
    element._openCreation('sync')
    stubLabelField(element, {
      value: '  Desktop ',
    })

    await element._createToken()

    expect(apiPost).toHaveBeenCalledWith(
      SYNC_ENDPOINT,
      {label: 'Desktop'},
      {dbChanged: false}
    )
    expect(element._states.sync.tokens).to.deep.equal([LAPTOP, DESKTOP])
    expect(element._creatingScope).to.equal('')
    expect(element._createdToken).to.equal('secret')
  })

  it('sends only one create request at a time', async () => {
    let resolvePost
    const apiPost = vi.fn().mockReturnValue(
      new Promise(resolve => {
        resolvePost = resolve
      })
    )
    const element = createTokens({apiPost})
    element._setState('sync', {status: 'inactive', tokens: [], error: ''})
    element._openCreation('sync')
    stubLabelField(element, {
      value: 'Laptop',
    })

    const first = element._createToken()
    await element._createToken()
    resolvePost({data: {...LAPTOP, token: 'secret'}})
    await first

    expect(apiPost).toHaveBeenCalledOnce()
  })

  it('shows the server message when creation fails', async () => {
    const apiPost = vi.fn().mockResolvedValue({
      error: 'An access token with this label exists',
      errorDetail: {status: 409},
    })
    const element = createTokens({apiPost})
    const errors = collectEvents(element, 'grampsjs:error')
    element._setState('sync', {status: 'active', tokens: [LAPTOP], error: ''})
    element._openCreation('sync')
    stubLabelField(element, {
      value: 'Laptop',
    })

    await element._createToken()

    expect(errors).to.deep.equal(['An access token with this label exists'])
    expect(element._creatingScope).to.equal('sync')
    expect(element._createdToken).to.equal('')
  })

  it('does not post an empty label', async () => {
    const apiPost = vi.fn()
    const element = createTokens({apiPost})
    element._openCreation('sync')
    const reportValidity = vi.fn()
    stubLabelField(element, {
      value: '   ',
      reportValidity,
    })

    await element._createToken()

    expect(apiPost).not.toHaveBeenCalled()
    expect(reportValidity).toHaveBeenCalled()
  })

  it('keeps the created token dialog open on cancel', () => {
    const element = createTokens()
    element._createdToken = 'secret'
    const dialog = element._renderCreatedDialog()
    const onCancel = dialog.values.find(value => typeof value === 'function')
    const event = {preventDefault: vi.fn()}

    onCancel(event)

    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('treats timestamps without a time zone as UTC', () => {
    const element = createTokens()

    expect(element._formatDate('2026-10-01T10:00:00')).to.equal(
      new Date(Date.UTC(2026, 9, 1, 10)).toLocaleString()
    )
  })
})
