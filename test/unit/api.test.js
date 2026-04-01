import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {
  apiGet,
  apiPutPostDelete,
  apiGetTokens,
  apiRegisterUser,
  apiResetPassword,
  apiGetOIDCConfig,
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

describe('apiPutPostDelete If-Match header', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({}),
      headers: {get: () => 'test-etag-value'},
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds If-Match header when etag is provided for PUT request', async () => {
    const mockAuth = {
      getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
    }

    await apiPutPostDelete(
      mockAuth,
      'PUT',
      '/api/people/handle',
      {_class: 'Person'},
      {etag: 'test-etag-value'}
    )

    expect(fetch).toHaveBeenCalled()
    const [, options] = fetch.mock.calls[0]
    expect(options.headers).to.have.property('If-Match', 'test-etag-value')
  })

  it('does not add If-Match header when etag is not provided', async () => {
    const mockAuth = {
      getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
    }

    await apiPutPostDelete(
      mockAuth,
      'PUT',
      '/api/people/handle',
      {_class: 'Person'},
      {}
    )

    expect(fetch).toHaveBeenCalled()
    const [, options] = fetch.mock.calls[0]
    expect(options.headers).to.not.have.property('If-Match')
  })

  it('does not add If-Match header for POST request even with etag', async () => {
    const mockAuth = {
      getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
    }

    await apiPutPostDelete(
      mockAuth,
      'POST',
      '/api/people/',
      {_class: 'Person'},
      {etag: 'test-etag-value'}
    )

    expect(fetch).toHaveBeenCalled()
    const [, options] = fetch.mock.calls[0]
    expect(options.headers).to.not.have.property('If-Match')
  })

  it('does not add If-Match header for DELETE request even with etag', async () => {
    const mockAuth = {
      getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
    }

    await apiPutPostDelete(
      mockAuth,
      'DELETE',
      '/api/people/handle',
      {},
      {etag: 'test-etag-value'}
    )

    expect(fetch).toHaveBeenCalled()
    const [, options] = fetch.mock.calls[0]
    expect(options.headers).to.not.have.property('If-Match')
  })

  it('returns error when backend returns 412 Precondition Failed', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 412,
      ok: false,
      statusText: 'Precondition Failed',
      json: () => Promise.resolve({error: {message: 'ETag mismatch'}}),
      headers: {get: () => null},
    })

    const mockAuth = {
      getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
    }

    const result = await apiPutPostDelete(
      mockAuth,
      'PUT',
      '/api/people/handle',
      {_class: 'Person'},
      {etag: 'stale-etag'}
    )

    expect(result.error).toBeDefined()
    expect(result.error).to.include('modified by another user')
  })

  it('returns etag in response when request succeeds', async () => {
    const mockAuth = {
      getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
    }

    const result = await apiPutPostDelete(
      mockAuth,
      'PUT',
      '/api/people/handle',
      {_class: 'Person'},
      {}
    )

    expect(result).to.have.property('etag', 'test-etag-value')
  })

  it('returns error on network failure without throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'))

    const mockAuth = {
      getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
    }

    const result = await apiPutPostDelete(
      mockAuth,
      'PUT',
      '/api/people/handle',
      {_class: 'Person'},
      {}
    )

    expect(result).to.have.property('error')
    expect(result.error).to.equal('Network error')
  })

  it('does not throw on any error - always returns error object', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Unexpected error'))

    const mockAuth = {
      getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
    }

    const result = await apiPutPostDelete(
      mockAuth,
      'PUT',
      '/api/people/handle',
      {_class: 'Person'},
      {}
    )

    expect(result).to.have.property('error')
  })
})

describe('fetch-update cycle with etag (mid-air collision detection)', () => {
  const mockAuth = {
    getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
  }

  it('succeeds when PUT with fresh etag from GET', async () => {
    const getEtag = '"abc123"'
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({handle: 'H123', name: {value: 'Test'}}),
        headers: {get: header => (header === 'ETag' ? getEtag : null)},
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({}),
        headers: {get: () => '"new-etag"'},
      })

    const getResult = await apiGet(mockAuth, '/api/people/H123')
    expect(getResult).to.have.property('etag', getEtag)

    const putResult = await apiPutPostDelete(
      mockAuth,
      'PUT',
      '/api/people/H123',
      {...getResult.data, name: {value: 'Updated'}},
      {etag: getResult.etag}
    )
    expect(putResult).to.not.have.property('error')
  })

  it('fails with 412 when PUT with stale etag', async () => {
    const staleEtag = '"stale-etag"'
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({handle: 'H123', name: {value: 'Test'}}),
        headers: {get: header => (header === 'ETag' ? staleEtag : null)},
      })
      .mockResolvedValueOnce({
        status: 412,
        ok: false,
        statusText: 'Precondition Failed',
        json: () => Promise.resolve({error: {message: 'ETag mismatch'}}),
        headers: {get: () => null},
      })

    const getResult = await apiGet(mockAuth, '/api/people/H123')
    expect(getResult).to.have.property('etag', staleEtag)

    const putResult = await apiPutPostDelete(
      mockAuth,
      'PUT',
      '/api/people/H123',
      {...getResult.data, name: {value: 'Updated'}},
      {etag: getResult.etag}
    )
    expect(putResult.error).toBeDefined()
    expect(putResult.error).to.include('modified by another user')
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

describe('fetch-update cycle with etag (mid-air collision detection)', () => {
  const mockAuth = {
    getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
  }

  it('succeeds when PUT with fresh etag from GET', async () => {
    const getEtag = '"abc123"'
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({handle: 'H123', name: {value: 'Test'}}),
        headers: {get: (header) => header === 'ETag' ? getEtag : null},
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({}),
        headers: {get: () => '"new-etag"'},
      })

    const getResult = await apiGet(mockAuth, '/api/people/H123')
    expect(getResult).to.have.property('etag', getEtag)

    const putResult = await apiPutPostDelete(
      mockAuth,
      'PUT',
      '/api/people/H123',
      {...getResult.data, name: {value: 'Updated'}},
      {etag: getResult.etag}
    )
    expect(putResult).to.not.have.property('error')
  })

  it('fails with 412 when PUT with stale etag', async () => {
    const staleEtag = '"stale-etag"'
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({handle: 'H123', name: {value: 'Test'}}),
        headers: {get: (header) => header === 'ETag' ? staleEtag : null},
      })
      .mockResolvedValueOnce({
        status: 412,
        ok: false,
        statusText: 'Precondition Failed',
        json: () => Promise.resolve({error: {message: 'ETag mismatch'}}),
        headers: {get: () => null},
      })

    const getResult = await apiGet(mockAuth, '/api/people/H123')
    expect(getResult).to.have.property('etag', staleEtag)

    const putResult = await apiPutPostDelete(
      mockAuth,
      'PUT',
      '/api/people/H123',
      {...getResult.data, name: {value: 'Updated'}},
      {etag: getResult.etag}
    )
    expect(putResult.error).toBeDefined()
    expect(putResult.error).to.include('modified by another user')
  })
})
