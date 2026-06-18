import {describe, it, expect, vi} from 'vitest'
import {GrampsJs} from '../../src/GrampsJs.js'

describe('first run onboarding', () => {
  it('skips owner token creation and falls through to login', () => {
    // Trees are initialised via init-tree.sh / the OIDC flow on this fork.
    // _fetchOnboardingToken should set loadingState to LOADING_STATE_UNAUTHORIZED (1)
    // directly without making any API calls.
    const element = Object.create(GrampsJs.prototype)
    const apiPost = vi.fn()

    element.appState = {
      path: {page: 'home', pageId: '', pageId2: ''},
      apiPost,
    }
    element.loadingState = null

    element._fetchOnboardingToken()

    expect(apiPost).not.toHaveBeenCalled()
    expect(element.loadingState).toBe(1) // LOADING_STATE_UNAUTHORIZED
  })
})
