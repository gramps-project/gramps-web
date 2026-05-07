import {describe, it, expect, afterEach} from 'vitest'
import {appStateUpdatePermissions} from '../../src/appState.js'

// Minimal fake JWT with known permissions claims.
// jwt_decode only base64-decodes the payload — no signature verification needed.
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

  it('sets all permissions for owner-level token', () => {
    localStorage.setItem(
      'access_token',
      makeFakeJwt({
        permissions: [
          'AddObject',
          'EditObject',
          'ViewPrivate',
          'EditOtherUser',
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
