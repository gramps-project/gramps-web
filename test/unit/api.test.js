import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {apiGet} from '../../src/api.js'

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
