import {describe, it, expect, vi} from 'vitest'
import {GrampsJs} from '../../src/GrampsJs.js'

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
