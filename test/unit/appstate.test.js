import {describe, it, expect, afterEach, vi} from 'vitest'
import {
  appStateUpdatePermissions,
  getInitialAppState,
  isTaskActive,
  isTaskInTree,
} from '../../src/appState.js'

// Minimal fake JWT with known permissions claims.
// jwtDecode only base64-decodes the payload — no signature verification needed.
function makeFakeJwt(claims) {
  const header = btoa(JSON.stringify({alg: 'HS256', typ: 'JWT'}))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return `${header}.${payload}.fakesignature`
}

const BASE_STATE = {permissions: {}}

describe('appStateUpdatePermissions', () => {
  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  it('sets canAdd when AddObject permission is present', () => {
    localStorage.setItem(
      'access_token',
      makeFakeJwt({permissions: ['AddObject'], exp: 9999999999})
    )
    const result = appStateUpdatePermissions(BASE_STATE)
    expect(result.permissions.canAdd).to.be.true
    expect(result.permissions.canEdit).to.be.false
  })

  it('sets canEdit when EditObject permission is present', () => {
    localStorage.setItem(
      'access_token',
      makeFakeJwt({permissions: ['EditObject'], exp: 9999999999})
    )
    const result = appStateUpdatePermissions(BASE_STATE)
    expect(result.permissions.canEdit).to.be.true
  })

  it('sets canViewOtherTree when ViewOtherTree permission is present', () => {
    localStorage.setItem(
      'access_token',
      makeFakeJwt({permissions: ['ViewOtherTree'], exp: 9999999999})
    )
    const result = appStateUpdatePermissions(BASE_STATE)
    expect(result.permissions.canViewOtherTree).to.be.true
  })

  it('sets canManageBackups when ManageBackups permission is present', () => {
    localStorage.setItem(
      'access_token',
      makeFakeJwt({permissions: ['ManageBackups'], exp: 9999999999})
    )
    const result = appStateUpdatePermissions(BASE_STATE)
    expect(result.permissions.canManageBackups).to.be.true
    expect(result.permissions.canEditTree).to.be.false
  })

  it('does not set canViewOtherTree for an owner-level token', () => {
    localStorage.setItem(
      'access_token',
      makeFakeJwt({
        permissions: ['AddObject', 'EditObject', 'EditOtherUser'],
        exp: 9999999999,
      })
    )
    const result = appStateUpdatePermissions(BASE_STATE)
    expect(result.permissions.canViewOtherTree).to.be.false
  })

  it('sets all permissions for owner-level token', () => {
    localStorage.setItem(
      'access_token',
      makeFakeJwt({
        permissions: [
          'AddObject',
          'EditObject',
          'ViewPrivate',
          'EditOtherUser',
          'ImportFile',
          'UseChat',
          'UpgradeSchema',
        ],
        exp: 9999999999,
      })
    )
    const result = appStateUpdatePermissions(BASE_STATE)
    expect(result.permissions.canAdd).to.be.true
    expect(result.permissions.canEdit).to.be.true
    expect(result.permissions.canViewPrivate).to.be.true
    expect(result.permissions.canManageUsers).to.be.true
    expect(result.permissions.canImport).to.be.true
    expect(result.permissions.canUseChat).to.be.true
    expect(result.permissions.canUpgradeTree).to.be.true
  })

  it('sets no permissions when token has empty permissions', () => {
    localStorage.setItem(
      'access_token',
      makeFakeJwt({permissions: [], exp: 9999999999})
    )
    const result = appStateUpdatePermissions(BASE_STATE)
    expect(result.permissions.canAdd).to.be.false
    expect(result.permissions.canEdit).to.be.false
    expect(result.permissions.canViewPrivate).to.be.false
    expect(result.permissions.canManageUsers).to.be.false
    expect(result.permissions.canImport).to.be.false
    expect(result.permissions.canUseChat).to.be.false
    expect(result.permissions.canUpgradeTree).to.be.false
  })

  it('does not mutate the original appState', () => {
    localStorage.setItem(
      'access_token',
      makeFakeJwt({permissions: ['AddObject'], exp: 9999999999})
    )
    appStateUpdatePermissions(BASE_STATE)
    expect(BASE_STATE.permissions).to.deep.equal({})
  })
})

describe('isTaskInTree', () => {
  it('keeps tasks of the current tree and drops those of other trees', () => {
    expect(isTaskInTree({tree: 'tree-a'}, 'tree-a')).to.be.true
    expect(isTaskInTree({tree: 'tree-b'}, 'tree-a')).to.be.false
  })

  it('keeps tasks without a tree field', () => {
    expect(isTaskInTree({task_id: 'x'}, 'tree-a')).to.be.true
  })

  it('keeps all tasks when the current tree is unknown', () => {
    expect(isTaskInTree({tree: 'tree-b'}, undefined)).to.be.true
  })
})

describe('isTaskActive', () => {
  it('uses the status field when present', () => {
    expect(isTaskActive({status: 'queued', state: 'PENDING'})).to.be.true
    expect(isTaskActive({status: 'running', state: 'PROGRESS'})).to.be.true
    expect(isTaskActive({status: 'lost', state: 'FAILURE'})).to.be.false
    expect(isTaskActive({status: 'unknown', state: 'PENDING'})).to.be.false
  })

  it('falls back to the Celery state without a status field', () => {
    expect(isTaskActive({state: 'STARTED'})).to.be.true
    expect(isTaskActive({state: 'SUCCESS'})).to.be.false
  })
})

describe('appState.apiGet progress counter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function countCounterEvents(options) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: () => Promise.resolve({}),
        headers: {get: () => null},
      })
    )
    const events = []
    const listener = e => events.push(e.detail.activeGet)
    window.addEventListener('requests:changed', listener)
    try {
      await getInitialAppState().apiGet('/api/metadata/', options)
    } finally {
      window.removeEventListener('requests:changed', listener)
    }
    return events
  }

  it('counts a normal request', async () => {
    expect(await countCounterEvents()).to.deep.equal([1, 0])
  })

  it('skips the counter for a background request', async () => {
    expect(await countCounterEvents({background: true})).to.deep.equal([])
  })
})

describe('appState date format requests', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.removeItem('grampsjs_settings')
  })

  it('sends the German date format only to supporting API versions', async () => {
    localStorage.setItem('grampsjs_settings', JSON.stringify({lang: 'de'}))
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({}),
      headers: {get: () => null},
    })
    vi.stubGlobal('fetch', fetchMock)

    const appState = getInitialAppState()
    appState.setApiVersion('3.26.0')
    await appState.apiGet('/api/people/?locale=de&profile=all')

    expect(fetchMock.mock.calls[0][0]).to.contain('date_format=6')
  })

  it('does not send the new query parameter to older API versions', async () => {
    localStorage.setItem('grampsjs_settings', JSON.stringify({lang: 'de'}))
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({}),
      headers: {get: () => null},
    })
    vi.stubGlobal('fetch', fetchMock)

    const appState = getInitialAppState()
    appState.setApiVersion('3.25.3')
    await appState.apiGet('/api/people/?locale=de&profile=all')

    expect(fetchMock.mock.calls[0][0]).not.to.contain('date_format=')
  })

  it('does not send an unsupported German-only format for another language', async () => {
    localStorage.setItem(
      'grampsjs_settings',
      JSON.stringify({lang: 'en', dateFormat: 6})
    )
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({}),
      headers: {get: () => null},
    })
    vi.stubGlobal('fetch', fetchMock)

    const appState = getInitialAppState()
    appState.setApiVersion('3.26.0')
    await appState.apiGet('/api/people/?profile=all')

    expect(fetchMock.mock.calls[0][0]).not.to.contain('date_format=')
  })
})
