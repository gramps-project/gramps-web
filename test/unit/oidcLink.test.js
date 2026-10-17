import {describe, it, expect, vi, beforeEach} from 'vitest'
import {
  completeLink,
  OIDC_LINK_RESULT_KEY,
  OIDC_RETURN_PATH_KEY,
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
