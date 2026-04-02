import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {
  apiGet,
  apiGetTokens,
  apiRegisterUser,
  apiResetPassword,
  apiGetOIDCConfig,
} from '../../src/api.js'

describe('apiGet authentication', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({}),
      headers: {get: () => null},
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({error: {message: 'Unauthorized'}}),
      headers: {get: () => null},
    })

    const result = await apiGet(undefined, '/api/tasks/test-123')

    expect(result.error).toBeDefined()
    expect(result.error).to.be.a('string')
  })
})

describe('apiGetTokens error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns error.message from JSON body on non-200 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 422,
      statusText: 'UNPROCESSABLE ENTITY',
      json: () =>
        Promise.resolve({
          error: {
            message: 'username: Missing data for required field.',
          },
        }),
    })

    const result = await apiGetTokens('', '')
    expect(result.error).toBe('username: Missing data for required field.')
  })

  it('falls back to statusText when JSON body has no error.message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 503,
      statusText: 'Service Unavailable',
      json: () => Promise.resolve({}),
    })

    const result = await apiGetTokens('user', 'pass')
    expect(result.error).toBe('Service Unavailable')
  })

  it('falls back to Error <status> when JSON parse fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 503,
      statusText: '',
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    })

    const result = await apiGetTokens('user', 'pass')
    expect(result.error).toBe('Error 503')
  })
})

describe('apiResetPassword error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns error.message from JSON body on unexpected status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 422,
      statusText: 'UNPROCESSABLE ENTITY',
      json: () =>
        Promise.resolve({error: {message: 'username: Missing field.'}}),
    })

    const result = await apiResetPassword('user')
    expect(result.error).toBe('username: Missing field.')
  })

  it('falls back to statusText when response body is not JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    })

    const result = await apiResetPassword('user')
    expect(result.error).toBe('Bad Request')
  })
})

describe('apiRegisterUser error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns error.message from JSON body on non-201 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 422,
      statusText: 'UNPROCESSABLE ENTITY',
      json: () =>
        Promise.resolve({error: {message: 'password: Missing field.'}}),
    })

    const result = await apiRegisterUser('user', 'pass', '', '', '')
    expect(result.error).toBe('password: Missing field.')
  })

  it('falls back to statusText when JSON body has no error.message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
    })

    const result = await apiRegisterUser('user', 'pass', '', '', '')
    expect(result.error).toBe('Internal Server Error')
  })
})

describe('apiGetOIDCConfig error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns error.message from JSON body on error response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () =>
        Promise.resolve({error: {message: 'OIDC provider misconfigured.'}}),
    })

    const result = await apiGetOIDCConfig()
    expect(result.error).toBe('OIDC provider misconfigured.')
  })

  it('falls back to statusText on error response with non-JSON body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    })

    const result = await apiGetOIDCConfig()
    expect(result.error).toBe('Bad Gateway')
  })

  it('surfaces JSON parse failure on ok response as an error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    })

    const result = await apiGetOIDCConfig()
    expect(result.error).toBeDefined()
  })
})
