import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {
  apiGet,
  apiGetTokens,
  apiRegisterUser,
  apiResetPassword,
  apiGetOIDCConfig,
  Auth,
  createFirstTree,
  updateTaskStatus,
} from '../../src/api.js'

describe('apiGet authentication', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: () => Promise.resolve({}),
        headers: {get: () => null},
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('includes Authorization header when auth is provided', async () => {
    const mockAuth = {
      getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
    }

    await apiGet(mockAuth, '/api/tasks/test-123')

    expect(fetch).toHaveBeenCalled()
    const [, options] = fetch.mock.calls[0]
    expect(options.headers).to.have.property(
      'Authorization',
      'Bearer test-token'
    )
  })

  it('returns an error when auth is undefined and backend returns 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({error: {message: 'Unauthorized'}}),
        headers: {get: () => null},
      })
    )

    const result = await apiGet(undefined, '/api/tasks/test-123')

    expect(result.error).toBeDefined()
    expect(result.error).to.be.a('string')
  })
})

describe('apiGetTokens error handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns error.message from JSON body on non-200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 422,
        statusText: 'UNPROCESSABLE ENTITY',
        json: () =>
          Promise.resolve({
            error: {
              message: 'username: Missing data for required field.',
            },
          }),
      })
    )

    const result = await apiGetTokens('', '')
    expect(result.error).toBe('username: Missing data for required field.')
  })

  it('falls back to statusText when JSON body has no error.message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({}),
      })
    )

    const result = await apiGetTokens('user', 'pass')
    expect(result.error).toBe('Service Unavailable')
  })

  it('falls back to Error <status> when JSON parse fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 503,
        statusText: '',
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      })
    )

    const result = await apiGetTokens('user', 'pass')
    expect(result.error).toBe('Error 503')
  })

  it('surfaces JSON parse failure on 200 response as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      })
    )

    const result = await apiGetTokens('user', 'pass')
    expect(result.error).toBeDefined()
    expect(result.error).not.toBe('Access token missing in response')
  })
})

describe('createFirstTree', () => {
  function makeAppState({postResult, putResult} = {}) {
    return {
      apiPost: vi
        .fn()
        .mockResolvedValue(postResult ?? {data: {id: 'tree-123'}}),
      apiPut: vi.fn().mockResolvedValue(putResult ?? {data: {}}),
      refreshTokenIfNeeded: vi.fn().mockResolvedValue(undefined),
    }
  }

  it('creates the tree, assigns it, and refreshes the token', async () => {
    const appState = makeAppState()

    const result = await createFirstTree(appState, 'My Family Tree')

    expect(appState.apiPost).toHaveBeenCalledWith(
      '/api/trees/',
      {name: 'My Family Tree'},
      {dbChanged: false}
    )
    expect(appState.apiPut).toHaveBeenCalledWith(
      '/api/users/-/',
      {tree: 'tree-123'},
      {dbChanged: false}
    )
    expect(appState.refreshTokenIfNeeded).toHaveBeenCalledWith(true)
    expect(result).toEqual({})
  })

  it('propagates an error from creating the tree without assigning it', async () => {
    const appState = makeAppState({postResult: {error: 'Tree is required'}})

    const result = await createFirstTree(appState, 'My Family Tree')

    expect(result).toEqual({error: 'Tree is required'})
    expect(appState.apiPut).not.toHaveBeenCalled()
    expect(appState.refreshTokenIfNeeded).not.toHaveBeenCalled()
  })

  it('returns an error without assigning when the created tree has no id', async () => {
    const appState = makeAppState({postResult: {data: {}}})

    const result = await createFirstTree(appState, 'My Family Tree')

    expect(result.error).to.be.a('string')
    expect(appState.apiPut).not.toHaveBeenCalled()
    expect(appState.refreshTokenIfNeeded).not.toHaveBeenCalled()
  })

  it('propagates an error from assigning the tree without refreshing the token', async () => {
    const appState = makeAppState({putResult: {error: 'Not authorized'}})

    const result = await createFirstTree(appState, 'My Family Tree')

    expect(result).toEqual({error: 'Not authorized'})
    expect(appState.refreshTokenIfNeeded).not.toHaveBeenCalled()
  })
})

describe('apiResetPassword error handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns error.message from JSON body on unexpected status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 422,
        statusText: 'UNPROCESSABLE ENTITY',
        json: () =>
          Promise.resolve({error: {message: 'username: Missing field.'}}),
      })
    )

    const result = await apiResetPassword('user')
    expect(result.error).toBe('username: Missing field.')
  })

  it('falls back to statusText when response body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      })
    )

    const result = await apiResetPassword('user')
    expect(result.error).toBe('Bad Request')
  })
})

describe('apiRegisterUser error handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns error.message from JSON body on non-201 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 422,
        statusText: 'UNPROCESSABLE ENTITY',
        json: () =>
          Promise.resolve({error: {message: 'password: Missing field.'}}),
      })
    )

    const result = await apiRegisterUser('user', 'pass', '', '', '')
    expect(result.error).toBe('password: Missing field.')
  })

  it('falls back to statusText when JSON body has no error.message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      })
    )

    const result = await apiRegisterUser('user', 'pass', '', '', '')
    expect(result.error).toBe('Internal Server Error')
  })
})

describe('apiGetOIDCConfig error handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns error.message from JSON body on error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () =>
          Promise.resolve({error: {message: 'OIDC provider misconfigured.'}}),
      })
    )

    const result = await apiGetOIDCConfig()
    expect(result.error).toBe('OIDC provider misconfigured.')
  })

  it('falls back to statusText on error response with non-JSON body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      })
    )

    const result = await apiGetOIDCConfig()
    expect(result.error).toBe('Bad Gateway')
  })

  it('surfaces JSON parse failure on ok response as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      })
    )

    const result = await apiGetOIDCConfig()
    expect(result.error).toBeDefined()
  })
})

describe('updateTaskStatus cleanup behavior', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('stops polling when shouldContinue becomes false', async () => {
    vi.useFakeTimers()
    let keepPolling = true
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: () =>
          Promise.resolve({state: 'PENDING', result_object: {progress: 0.25}}),
        headers: {get: () => null},
      })
    )

    const callback = vi.fn(() => {
      keepPolling = false
    })

    const promise = updateTaskStatus(
      {getValidAccessToken: vi.fn().mockResolvedValue('test-token')},
      'task-1',
      callback,
      1000,
      Infinity,
      () => keepPolling
    )

    await Promise.resolve()
    await vi.runAllTimersAsync()
    await promise

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not schedule another wait after a terminal task state', async () => {
    vi.useFakeTimers()
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: () => Promise.resolve({state: 'SUCCESS'}),
        headers: {get: () => null},
      })
    )

    await updateTaskStatus(
      {getValidAccessToken: vi.fn().mockResolvedValue('test-token')},
      'task-2',
      vi.fn(),
      1000
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(timeoutSpy).not.toHaveBeenCalled()
  })
})

describe('Auth.signout', () => {
  // Minimal unsigned JWT: only the payload is ever decoded.
  const makeToken = claims => {
    const encode = obj =>
      btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    return `${encode({alg: 'HS256', typ: 'JWT'})}.${encode(claims)}.signature`
  }

  let events
  let calls

  const setUpLocation = () => {
    vi.stubGlobal('location', {
      origin: 'https://gramps.example.com',
      get href() {
        return 'https://gramps.example.com/'
      },
      set href(url) {
        calls.push(`navigate:${url}`)
      },
    })
  }

  const onLoggedOut = e => events.push(e)

  beforeEach(() => {
    events = []
    calls = []
    localStorage.setItem('id_token', 'the-id-token')
    window.addEventListener('user:loggedout', onLoggedOut)
    setUpLocation()
  })

  afterEach(() => {
    window.removeEventListener('user:loggedout', onLoggedOut)
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  const stubLogoutFetch = logoutUrl =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(url => {
        calls.push(`fetch:${url}`)
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({logout_url: logoutUrl}),
        })
      })
    )

  it('resolves the provider logout URL before announcing the logout', async () => {
    localStorage.setItem('access_token', makeToken({oidc_provider: 'custom'}))
    stubLogoutFetch('https://auth.example.com/end-session')

    const auth = new Auth()
    const signout = auth.signout()
    // The event must not fire while the logout URL request is still in flight:
    // it would send the app back through the OIDC login flow (#1325).
    expect(events).toHaveLength(0)
    await signout

    expect(calls[0]).toContain('/api/oidc/logout/')
    expect(calls[1]).toBe('navigate:https://auth.example.com/end-session')
    expect(events).toHaveLength(1)
    expect(events[0].detail.redirecting).toBe(true)
  })

  it('passes the id token and post-logout redirect URI to the backend', async () => {
    localStorage.setItem('access_token', makeToken({oidc_provider: 'custom'}))
    stubLogoutFetch('https://auth.example.com/end-session')

    await new Auth().signout()

    const [url] = fetch.mock.calls[0]
    expect(url).toContain('provider=custom')
    expect(url).toContain('id_token=the-id-token')
    expect(url).toContain(
      `post_logout_redirect_uri=${encodeURIComponent(
        'https://gramps.example.com'
      )}`
    )
  })

  it('falls back to the login view when the provider has no logout URL', async () => {
    localStorage.setItem('access_token', makeToken({oidc_provider: 'custom'}))
    stubLogoutFetch(null)

    await new Auth().signout()

    expect(calls.some(c => c.startsWith('navigate:'))).toBe(false)
    expect(events[0].detail.redirecting).toBe(false)
  })

  it('clears the stored tokens', async () => {
    localStorage.setItem('access_token', makeToken({oidc_provider: 'custom'}))
    localStorage.setItem('refresh_token', 'refresh')
    localStorage.setItem('access_token_expires', '123')
    stubLogoutFetch('https://auth.example.com/end-session')

    await new Auth().signout()

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('access_token_expires')).toBeNull()
    expect(localStorage.getItem('id_token')).toBeNull()
  })

  it('does not call the OIDC logout endpoint for a local account', async () => {
    localStorage.setItem('access_token', makeToken({sub: 'alice'}))
    stubLogoutFetch('https://auth.example.com/end-session')

    await new Auth().signout()

    expect(fetch).not.toHaveBeenCalled()
    expect(events[0].detail.redirecting).toBe(false)
  })
})
