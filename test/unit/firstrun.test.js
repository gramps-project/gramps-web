import {describe, it, expect, vi, beforeEach} from 'vitest'
import {GrampsJs} from '../../src/GrampsJs.js'
import {apiGetTokens, createFirstTree} from '../../src/api.js'
import {passwordsMismatch} from '../../src/components/GrampsjsFirstRun.js'

vi.mock('../../src/api.js', async importActual => {
  const actual = await importActual()
  return {...actual, apiGetTokens: vi.fn(), createFirstTree: vi.fn()}
})

const fakeJwt = claims => `header.${btoa(JSON.stringify(claims))}.signature`

describe('password confirmation', () => {
  it('reports nothing while the confirmation is empty', () => {
    expect(passwordsMismatch('hunter2', '')).to.equal(false)
    expect(passwordsMismatch('', '')).to.equal(false)
  })

  it('reports a mismatch once the confirmation differs', () => {
    expect(passwordsMismatch('hunter2', 'hunter')).to.equal(true)
    expect(passwordsMismatch('hunter2', 'Hunter2')).to.equal(true)
  })

  it('accepts an exact repeat', () => {
    expect(passwordsMismatch('hunter2', 'hunter2')).to.equal(false)
  })

  it('treats a missing password as a mismatch for a typed confirmation', () => {
    expect(passwordsMismatch(undefined, 'hunter2')).to.equal(true)
  })
})

describe('first run onboarding', () => {
  it('requests the owner token without using stored auth tokens', async () => {
    const element = Object.create(GrampsJs.prototype)
    const apiPost = vi
      .fn()
      .mockResolvedValue({data: {access_token: 'first-run-token'}})

    element.appState = {
      path: {page: 'home', pageId: '', pageId2: ''},
      apiPost,
    }
    element._firstRunToken = ''

    element._fetchOnboardingToken()
    await Promise.resolve()

    expect(apiPost).toHaveBeenCalledWith(
      '/api/token/create_owner/',
      {},
      {
        dbChanged: false,
        saving: false,
        skipAuth: true,
      }
    )
    expect(element._firstRunToken).to.equal('first-run-token')
  })

  it('keeps the tree id when requesting a tree-specific owner token', async () => {
    const element = Object.create(GrampsJs.prototype)
    const apiPost = vi
      .fn()
      .mockResolvedValue({data: {access_token: 'first-run-token'}})

    element.appState = {
      path: {page: 'firstrun', pageId: 'tree-id', pageId2: ''},
      apiPost,
    }
    element._firstRunToken = ''

    element._fetchOnboardingToken()
    await Promise.resolve()

    expect(apiPost).toHaveBeenCalledWith(
      '/api/token/create_owner/',
      {tree: 'tree-id'},
      {dbChanged: false, saving: false, skipAuth: true}
    )
  })
})

describe('first run submit', () => {
  const makeElement = () => {
    const element = document.createElement('grampsjs-first-run')
    element.createRenderRoot()
    element.appState = {}
    element._submitUser = vi.fn(async () => {
      element.stateUser = 3
    })
    element._submitConfig = vi.fn()
    return element
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    createFirstTree.mockResolvedValue({})
  })

  it('skips tree creation when the login token has a tree', async () => {
    apiGetTokens.mockImplementation(async () => {
      localStorage.setItem('access_token', fakeJwt({tree: 'Queen'}))
      return {}
    })
    const element = makeElement()

    await element._submit()

    expect(createFirstTree).not.toHaveBeenCalled()
    expect(element._hasTree).to.equal(true)
  })

  it('creates the first tree when the login token has no tree', async () => {
    apiGetTokens.mockImplementation(async () => {
      localStorage.setItem('access_token', fakeJwt({}))
      return {}
    })
    const element = makeElement()

    await element._submit()

    expect(createFirstTree).toHaveBeenCalledOnce()
    expect(element._hasTree).to.equal(false)
  })
})
