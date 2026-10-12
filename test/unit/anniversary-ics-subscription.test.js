import {html} from 'lit'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {GrampsjsAccessTokens} from '../../src/components/GrampsjsAccessTokens.js'
import {GrampsjsAnniversaryIcsSubscription} from '../../src/components/GrampsjsAnniversaryIcsSubscription.js'
import {GrampsjsFilterTags} from '../../src/components/GrampsjsFilterTags.js'
import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'

const SCOPE = 'anniversaries_ics'
const ENDPOINT = `/api/users/-/access-tokens/${SCOPE}/`
const originalClipboard = navigator.clipboard
const subscriptions = []

function appState(overrides = {}) {
  return {
    i18n: {strings: {}, lang: 'en'},
    settings: {},
    permissions: {},
    dbInfo: {gramps_webapi: {version: '3.24.0'}},
    apiGet: vi.fn(async endpoint => {
      if (endpoint === '/api/types/') {
        return {
          data: {
            default: {event_types: ['Birth', 'Marriage', 'Death', 'Baptism']},
            custom: {event_types: ['Family reunion']},
          },
        }
      }
      if (endpoint.includes('/filters/')) return {data: {filters: []}}
      return {data: {active: true}}
    }),
    apiPost: vi
      .fn()
      .mockResolvedValue({data: {active: true, token: 'example token/+?'}}),
    apiDelete: vi.fn().mockResolvedValue({data: {}}),
    ...overrides,
  }
}

function createSubscription(overrides) {
  const element = new GrampsjsAnniversaryIcsSubscription()
  element.appState = appState(overrides)
  element.tokenStatus = 'inactive'
  subscriptions.push(element)
  return element
}

function deferred() {
  let finish
  const promise = new Promise(resolve => {
    finish = resolve
  })
  return {promise, resolve: finish}
}

function markup(value) {
  if (Array.isArray(value)) return value.map(markup).join('')
  if (value && Array.isArray(value.strings)) {
    return value.strings.reduce(
      (result, string, index) => result + string + markup(value.values[index]),
      ''
    )
  }
  return typeof value === 'string' ? value : ''
}

afterEach(() => {
  for (const element of subscriptions.splice(0)) element.clearSession()
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.useRealTimers()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  })
})

describe('anniversary selection and native filters', () => {
  it('starts with the whole tree and safe options encoded explicitly', () => {
    const element = createSubscription()
    const url = new URL(element._buildUrl('secret', 'https://api.test'))

    expect(Object.fromEntries(url.searchParams)).toEqual({
      token: 'secret',
      event_types: 'Birth,Marriage,Death',
      living_only: 'true',
      primary_participants_only: 'true',
      locale: 'en',
    })
    expect(element._validationMessage()).toBe('')
  })

  it('encodes saved filters and native tag rules and removes person restrictions for Whole tree', () => {
    const element = createSubscription()
    element._personFilter = 'Cousins & friends'
    element._personRules = [{name: 'HasTag', values: ['Été / famille']}]
    element._eventFilter = 'Births & marriages'
    element._eventRules = [{name: 'HasTag', values: ['Calendar']}]
    element._url = element._buildUrl('secret', 'https://api.test')
    let params = new URL(element._url).searchParams

    expect(params.get('person_filter')).toBe('Cousins & friends')
    expect(JSON.parse(params.get('person_rules'))).toEqual({
      rules: element._personRules,
    })
    expect(params.get('filter')).toBe('Births & marriages')
    expect(JSON.parse(params.get('rules'))).toEqual({
      rules: element._eventRules,
    })

    element._clearPersonFilters()
    params = new URL(element._url).searchParams
    expect(params.has('person_filter')).toBe(false)
    expect(params.has('person_rules')).toBe(false)
    expect(params.get('filter')).toBe('Births & marriages')
    expect(element._personRules).toEqual([])
    expect(element._urlChanged).toBe(true)
  })

  it('derives the people scope from selected native filters and requires an event type', async () => {
    const element = createSubscription()
    element._handleSavedFilterChange('person', {target: {value: 'Family'}})
    expect(
      new URL(element._buildUrl('secret')).searchParams.get('person_filter')
    ).toBe('Family')
    expect(element._scopeSummary()).toBe('Family')

    element._handleSavedFilterChange('person', {target: {value: ''}})
    element._handleRulesChange('person', {
      detail: {rules: [{name: 'HasTag', values: ['Friends']}]},
      stopPropagation: vi.fn(),
    })
    expect(element._scopeSummary()).toBe('Friends')
    expect(
      JSON.parse(
        new URL(element._buildUrl('secret')).searchParams.get('person_rules')
      )
    ).toEqual({rules: [{name: 'HasTag', values: ['Friends']}]})

    element._clearPersonFilters()
    expect(element._scopeSummary()).toBe('Whole tree')
    expect(element._validationMessage()).toBe('')
    element._eventTypes = []
    await element._generateToken()
    expect(element.appState.apiPost).not.toHaveBeenCalled()
  })

  it('loads filter catalogs only when Customize is opened', async () => {
    const element = createSubscription()
    element._handleAdvancedToggle({target: {open: false}})
    expect(element.appState.apiGet).not.toHaveBeenCalled()
    element._handleAdvancedToggle({target: {open: true}})
    await vi.waitFor(() =>
      expect(element.appState.apiGet).toHaveBeenCalledTimes(3)
    )
    expect(
      element.appState.apiGet.mock.calls.map(([endpoint]) => endpoint)
    ).toEqual(['/api/filters/people', '/api/filters/events', '/api/types/'])
    element._handleAdvancedToggle({target: {open: false}})
    element._handleAdvancedToggle({target: {open: true}})
    expect(element.appState.apiGet).toHaveBeenCalledTimes(3)
  })

  it('adds other native and custom types without duplicates or comma-delimited names', async () => {
    const element = createSubscription()
    await element._loadCatalog('types')
    expect(element._catalogs.types.types.custom.event_types).toEqual([
      'Family reunion',
    ])
    for (const type of [
      'Baptism',
      'Baptism',
      'Family reunion',
      'Custom, invalid',
    ]) {
      element._additionalType = type
      element._addOtherType()
    }
    expect(
      new URL(element._buildUrl('secret')).searchParams.get('event_types')
    ).toBe('Birth,Marriage,Death,Baptism,Family reunion')
  })

  it('loads advanced catalogs lazily and isolates failures and retries', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({error: 'Offline'})
      .mockResolvedValueOnce({data: {filters: [{name: 'Family'}]}})
    const element = createSubscription({apiGet})
    expect(apiGet).not.toHaveBeenCalled()
    await element._loadCatalog('person')
    expect(element._catalogs.person.status).toBe('unavailable')
    expect(element._catalogs.event.status).toBe('idle')
    expect(element._validationMessage()).toBe('')
    expect(
      markup(element._renderSavedFilter('person', 'Saved Person filter'))
    ).toContain('Retry')

    await element._loadCatalog('person')
    expect(element._catalogs.person.filters).toEqual([{name: 'Family'}])
    expect(element._catalogs.person.status).toBe('loaded')
  })

  it('updates an existing URL when a filter is removed or the language changes', () => {
    const element = createSubscription()
    element._eventFilter = 'Family'
    element._url = element._buildUrl('secret')
    element._copied = true
    element._handleSavedFilterChange('event', {target: {value: ''}})
    element.appState = {...element.appState, i18n: {strings: {}, lang: 'fr'}}
    element.updated(new Map([['appState', {}]]))

    const params = new URL(element._url).searchParams
    expect(params.has('filter')).toBe(false)
    expect(params.get('locale')).toBe('fr')
    expect(element._copied).toBe(false)
    expect(element._urlChanged).toBe(true)
    expect(element.appState.apiPost).not.toHaveBeenCalled()
  })
})

describe('private link creation and lifetime', () => {
  it('generates an encoded URL and sends only scoped status events', async () => {
    const element = createSubscription()
    const statuses = []
    element.addEventListener('access-token:changed', event =>
      statuses.push(event.detail)
    )
    await element._generateToken()

    expect(element.appState.apiPost).toHaveBeenCalledExactlyOnceWith(
      ENDPOINT,
      {},
      {dbChanged: false}
    )
    expect(new URL(element._url).searchParams.get('token')).toBe(
      'example token/+?'
    )
    expect(statuses).toEqual([
      {scope: SCOPE, status: 'loading'},
      {scope: SCOPE, status: 'active'},
    ])
  })

  it('confirms rotation and preserves the old URL when the dialog is cancelled', async () => {
    const element = createSubscription()
    element.tokenStatus = 'active'
    element._url = element._buildUrl('previous')
    element._requestGenerateToken()
    expect(element._confirmRotation).toBe(true)
    expect(element.appState.apiPost).not.toHaveBeenCalled()
    element._cancelRegenerateToken()
    expect(new URL(element._url).searchParams.get('token')).toBe('previous')

    element._requestGenerateToken()
    await element._confirmRegenerateToken()
    expect(element._confirmRotation).toBe(false)
    expect(new URL(element._url).searchParams.get('token')).toBe(
      'example token/+?'
    )
  })

  it.each([
    {error: 'Offline'},
    {data: {active: true}},
    {data: {active: true, token: 42}},
  ])(
    'handles failed or incomplete generation without leaving an old link to copy',
    async result => {
      const element = createSubscription({
        apiPost: vi.fn().mockResolvedValue(result),
      })
      element.tokenStatus = 'active'
      element._url = element._buildUrl('previous')
      await element._generateToken()

      expect(element._url).toBe('')
      expect(element._loading).toBe(false)
      expect(element._errorMessage).not.toBe('')
    }
  )

  it('does not generate when token status is unavailable or during another request', async () => {
    const request = deferred()
    const element = createSubscription({
      apiPost: vi.fn().mockReturnValue(request.promise),
    })
    element.tokenStatus = 'unavailable'
    await element._generateToken()
    expect(element.appState.apiPost).not.toHaveBeenCalled()
    element.tokenStatus = 'inactive'
    const first = element._generateToken()
    await element._generateToken()
    request.resolve({data: {active: true, token: 'secret'}})
    await first
    expect(element.appState.apiPost).toHaveBeenCalledOnce()
  })

  it('discards a delayed token response after leaving the page and requests a status refresh', async () => {
    const request = deferred()
    const element = createSubscription({
      apiPost: vi.fn().mockReturnValue(request.promise),
    })
    const refreshes = []
    element.addEventListener('access-token:refresh', event =>
      refreshes.push(event.detail)
    )
    const generation = element._generateToken()
    element.clearSession()
    request.resolve({data: {active: true, token: 'late secret'}})
    await generation

    expect(element._url).toBe('')
    expect(element._loading).toBe(false)
    expect(refreshes).toEqual([{scope: SCOPE}])
  })

  it('copies the complete URL and reports failure without claiming success', async () => {
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Denied'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText},
    })
    const element = createSubscription()
    element._url = element._buildUrl('secret', '')
    await element._copyUrl()
    expect(writeText).toHaveBeenCalledWith(element._url)
    expect(element._copied).toBe(true)
    await element._copyUrl()
    expect(element._copied).toBe(false)
  })

  it('does not show Copied if the selection changes while the clipboard is pending', async () => {
    const request = deferred()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: vi.fn().mockReturnValue(request.promise)},
    })
    const element = createSubscription()
    element._url = element._buildUrl('secret')
    const copy = element._copyUrl()
    element._handleEventTypeChange('Death', false)
    request.resolve()
    await copy
    expect(element._copied).toBe(false)
    expect(element._urlChanged).toBe(true)
  })
})

describe('integration with the current Account token manager', () => {
  it('opens Account and scrolls to access tokens without motion when reduced motion is requested', async () => {
    const heading = {scrollIntoView: vi.fn()}
    const section = {open: false, updateComplete: Promise.resolve()}
    const manager = {closest: () => section, previousElementSibling: heading}
    const view = new GrampsjsViewSettingsUser()
    view.renderRoot = {querySelector: () => manager}
    vi.spyOn(window, 'matchMedia').mockReturnValue({matches: true})

    await view._showAccessTokenManager()

    expect(section.open).toBe(true)
    expect(heading.scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'auto',
    })
  })
  it('ignores an old status request after rotation and refreshes only the ICS scope', async () => {
    const old = deferred()
    const manager = new GrampsjsAccessTokens()
    manager.appState = appState({
      apiGet: vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockResolvedValue({data: {active: true}}),
    })
    const pending = manager._fetchStatus(SCOPE)
    manager.setScopeStatus(SCOPE, 'active')
    await manager.refresh(SCOPE)
    old.resolve({data: {active: false}})
    await pending
    expect(manager._states[SCOPE].status).toBe('active')
    expect(
      manager.appState.apiGet.mock.calls.every(([url]) => url === ENDPOINT)
    ).toBe(true)
  })

  it('keeps a revoked token inactive when an older status request arrives', async () => {
    const old = deferred()
    const manager = new GrampsjsAccessTokens()
    manager.appState = appState({apiGet: vi.fn().mockReturnValue(old.promise)})
    manager.setScopeStatus(SCOPE, 'active')
    const pending = manager._fetchStatus(SCOPE)
    manager._requestRevocation(SCOPE)
    await manager._confirmRevocation()
    old.resolve({data: {active: true}})
    await pending
    expect(manager._states[SCOPE].status).toBe('inactive')
  })

  it('connects rotation and central revocation without changing Sync tokens', async () => {
    const manager = new GrampsjsAccessTokens()
    const element = createSubscription()
    manager.appState = element.appState
    manager._setState('sync', {
      status: 'active',
      tokens: [{id: 1, label: 'Laptop'}],
      error: '',
    })
    const view = new GrampsjsViewSettingsUser()
    view.renderRoot = {
      querySelector: selector =>
        selector === 'grampsjs-access-tokens' ? manager : element,
    }
    manager.addEventListener('access-token:changed', event =>
      view._handleAccessTokenChanged(event)
    )
    element.addEventListener('access-token:changed', event =>
      view._handleAnniversaryTokenChanged(event)
    )
    await element._generateToken()
    expect(manager._states[SCOPE].status).toBe('active')
    manager._requestRevocation(SCOPE)
    await manager._confirmRevocation()
    element.updated(new Map([['tokenStatus', 'active']]))

    expect(element._url).toBe('')
    expect(manager._states.sync.tokens).toEqual([{id: 1, label: 'Laptop'}])
  })

  it('shows the section from API 3.23 and places it after Appearance', () => {
    const view = new GrampsjsViewSettingsUser()
    view.appState = appState({dbInfo: {gramps_webapi: {version: '3.22.99'}}})
    expect(markup(view.renderContent())).not.toContain(
      'Anniversary calendar (ICS)'
    )
    view.appState = appState({dbInfo: {gramps_webapi: {version: '3.23.0'}}})
    const content = markup(view.renderContent())
    expect(content).toContain('Anniversary calendar (ICS)')
    expect(content.indexOf('Anniversary calendar (ICS)')).toBeGreaterThan(
      content.indexOf('Appearance')
    )
  })

  it('clears the URL on deactivation even though inactive views skip their update', async () => {
    vi.spyOn(
      GrampsjsAnniversaryIcsSubscription.prototype,
      'render'
    ).mockReturnValue(html``)
    const view = new GrampsjsViewSettingsUser()
    view.appState = appState()
    view._fetchOwnUserDetails = vi.fn()
    view._fetchDataLang = vi.fn()
    view.renderContent = () =>
      html`<grampsjs-anniversary-ics-subscription
        .appState="${view.appState}"
      ></grampsjs-anniversary-ics-subscription>`
    view.active = true
    document.body.append(view)
    await view.updateComplete
    const element = view.renderRoot.querySelector(
      'grampsjs-anniversary-ics-subscription'
    )
    element._url = element._buildUrl('secret')
    view.active = false
    await view.updateComplete
    expect(element._url).toBe('')
    element._url = element._buildUrl('secret')
    window.dispatchEvent(new Event('user:loggedout'))
    expect(element._url).toBe('')
  })

  it('keeps tag loading failures recoverable through the existing tag selector', async () => {
    const tags = new GrampsjsFilterTags()
    tags.appState = appState({
      apiGet: vi
        .fn()
        .mockResolvedValueOnce({error: 'Offline'})
        .mockResolvedValueOnce({data: [{name: 'Family'}]}),
    })
    await tags._updateData()
    expect(markup(tags.render())).toContain('Retry')
    await tags._updateData()
    expect(tags.error).toBe(false)
    expect(tags._data.data).toEqual([{name: 'Family'}])
  })
})
