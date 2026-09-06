import {describe, it, expect, vi} from 'vitest'
import {GrampsJs} from '../../src/GrampsJs.js'
import {passwordsMismatch} from '../../src/components/GrampsjsFirstRun.js'

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
