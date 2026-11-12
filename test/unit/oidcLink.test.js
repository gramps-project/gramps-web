import {describe, it, expect, vi, beforeEach} from 'vitest'
import {
  completeLink,
  OIDC_LINK_RESULT_KEY,
  OIDC_RETURN_PATH_KEY,
  reloginProviders,
  takeReturnPath,
} from '../../src/oidc.js'

const storedResult = () =>
  JSON.parse(sessionStorage.getItem(OIDC_LINK_RESULT_KEY))

describe('completing a link from /oidc/complete', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('completes the link with the code and reports the provider', async () => {
    const appState = {
      apiPost: vi.fn().mockResolvedValue({data: {provider: 'custom'}}),
    }
    await completeLink(appState, 'the-code', null)
    expect(appState.apiPost).toHaveBeenCalledWith(
      '/api/oidc/link/complete/',
      {code: 'the-code'},
      {dbChanged: false, saving: false}
    )
    expect(storedResult()).toEqual({linked: 'custom'})
    expect(window.location.pathname).toBe('/settings/user')
  })

  it('reports an error from completing the link', async () => {
    const appState = {
      apiPost: vi.fn().mockResolvedValue({error: 'identity_in_use'}),
    }
    await completeLink(appState, 'the-code', null)
    expect(storedResult()).toEqual({error: 'identity_in_use'})
  })

  it('reports a provider error without calling the API', async () => {
    const appState = {apiPost: vi.fn()}
    await completeLink(appState, null, 'link_failed')
    expect(appState.apiPost).not.toHaveBeenCalled()
    expect(storedResult()).toEqual({error: 'link_failed'})
  })
})

describe('returning after signing in through the provider', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns to the stored path once', () => {
    sessionStorage.setItem(OIDC_RETURN_PATH_KEY, '/settings/user')
    expect(takeReturnPath()).toBe('/settings/user')
    expect(takeReturnPath()).toBe('/')
  })

  it('returns home without a stored path', () => {
    expect(takeReturnPath()).toBe('/')
  })

  it('never leaves the site', () => {
    for (const path of ['//evil.example/x', 'https://evil.example/']) {
      sessionStorage.setItem(OIDC_RETURN_PATH_KEY, path)
      expect(takeReturnPath()).toBe('/')
    }
  })
})

describe('providers offered for signing in again', () => {
  const config = {
    enabled: true,
    providers: [
      {id: 'google', name: 'Google'},
      {id: 'custom', name: 'Company login'},
    ],
  }

  it('offers the linked providers, not the claim', () => {
    const accounts = [{provider_id: 'custom'}, {provider_id: 'custom'}]
    expect(reloginProviders(config, accounts, 'google')).toEqual([
      {id: 'custom', name: 'Company login'},
    ])
  })

  it('works without a claim, as after a token refresh', () => {
    const accounts = [{provider_id: 'google'}, {provider_id: 'custom'}]
    expect(reloginProviders(config, accounts, undefined)).toEqual([
      {id: 'google', name: 'Google'},
      {id: 'custom', name: 'Company login'},
    ])
  })

  it('skips identities of providers that are no longer configured', () => {
    expect(reloginProviders(config, [{provider_id: 'gone'}], 'gone')).toEqual(
      []
    )
  })

  it('falls back to the claim if the accounts cannot be listed', () => {
    expect(reloginProviders(config, null, 'google')).toEqual([
      {id: 'google', name: 'Google'},
    ])
    expect(reloginProviders(config, null, undefined)).toEqual([])
  })

  it('falls back to the claim if the configuration cannot be loaded', () => {
    expect(reloginProviders({error: 'Network error'}, null, 'google')).toEqual([
      {id: 'google', name: 'google'},
    ])
    expect(reloginProviders(undefined, null, 'google')).toEqual([
      {id: 'google', name: 'google'},
    ])
    expect(reloginProviders({error: 'Network error'}, null, undefined)).toEqual(
      []
    )
  })

  it('offers nothing while OIDC is disabled', () => {
    expect(
      reloginProviders({enabled: false}, [{provider_id: 'google'}], 'google')
    ).toEqual([])
  })
})
