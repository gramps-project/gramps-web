import {describe, it, expect} from 'vitest'
import {
  LOADING_STATE_INITIAL,
  LOADING_STATE_UNAUTHORIZED,
  LOADING_STATE_UNAUTHORIZED_NOCONNECTION,
  LOADING_STATE_NO_OWNER,
  LOADING_STATE_DB_SCHEMA_MISMATCH,
  LOADING_STATE_NO_TREE,
  LOADING_STATE_READY,
  selectPreReadyView,
} from '../../src/routing.js'

describe('selectPreReadyView', () => {
  it('shows the initial loading view', () => {
    expect(selectPreReadyView(LOADING_STATE_INITIAL, {page: 'home'})).toEqual({
      view: 'initial',
    })
  })

  it('shows the no-connection view', () => {
    expect(
      selectPreReadyView(LOADING_STATE_UNAUTHORIZED_NOCONNECTION, {
        page: 'home',
      })
    ).toEqual({view: 'noconn'})
  })

  describe('unauthorized', () => {
    it('renders the register view without navigating when on the register page', () => {
      expect(
        selectPreReadyView(LOADING_STATE_UNAUTHORIZED, {page: 'register'})
      ).toEqual({view: 'register'})
    })

    it('navigates to login when not already there', () => {
      expect(
        selectPreReadyView(LOADING_STATE_UNAUTHORIZED, {page: 'home'})
      ).toEqual({view: 'login', navigateTo: 'login', redirect: null})
    })

    it('does not re-navigate when already on the login page', () => {
      expect(
        selectPreReadyView(LOADING_STATE_UNAUTHORIZED, {page: 'login'})
      ).toEqual({view: 'login', navigateTo: null, redirect: null})
    })

    it('sets an external redirect when loginRedirect is configured and not on login/register', () => {
      const decision = selectPreReadyView(LOADING_STATE_UNAUTHORIZED, {
        page: 'home',
        frontendConfig: {loginRedirect: 'https://sso.example.com'},
      })
      expect(decision.redirect).toBe('https://sso.example.com')
      expect(decision.navigateTo).toBe('login')
    })

    it('does not redirect when already on the login page', () => {
      const decision = selectPreReadyView(LOADING_STATE_UNAUTHORIZED, {
        page: 'login',
        frontendConfig: {loginRedirect: 'https://sso.example.com'},
      })
      expect(decision.redirect).toBe(null)
    })

    it('does not redirect on the register page', () => {
      const decision = selectPreReadyView(LOADING_STATE_UNAUTHORIZED, {
        page: 'register',
        frontendConfig: {loginRedirect: 'https://sso.example.com'},
      })
      expect(decision).toEqual({view: 'register'})
    })
  })

  describe('no owner (first run)', () => {
    it('navigates to firstrun when not already there', () => {
      expect(
        selectPreReadyView(LOADING_STATE_NO_OWNER, {page: 'home'})
      ).toEqual({view: 'firstrun', navigateTo: 'firstrun'})
    })

    it('does not re-navigate when already on firstrun', () => {
      expect(
        selectPreReadyView(LOADING_STATE_NO_OWNER, {page: 'firstrun'})
      ).toEqual({view: 'firstrun', navigateTo: null})
    })
  })

  describe('no tree', () => {
    it('shows the create-tree view for a server administrator', () => {
      expect(
        selectPreReadyView(LOADING_STATE_NO_TREE, {
          page: 'home',
          permissions: {canViewOtherTree: true},
        })
      ).toEqual({view: 'create-tree', navigateTo: 'create-tree'})
    })

    it('shows the waiting view for a non-administrator', () => {
      expect(
        selectPreReadyView(LOADING_STATE_NO_TREE, {
          page: 'home',
          permissions: {canViewOtherTree: false},
        })
      ).toEqual({view: 'no-tree-wait', navigateTo: 'create-tree'})
    })

    it('does not re-navigate when already on the create-tree page', () => {
      expect(
        selectPreReadyView(LOADING_STATE_NO_TREE, {
          page: 'create-tree',
          permissions: {canViewOtherTree: true},
        })
      ).toEqual({view: 'create-tree', navigateTo: null})
    })

    it('treats missing permissions as non-administrator', () => {
      expect(
        selectPreReadyView(LOADING_STATE_NO_TREE, {page: 'home'}).view
      ).toBe('no-tree-wait')
    })
  })

  it('falls through for the schema-mismatch state', () => {
    expect(
      selectPreReadyView(LOADING_STATE_DB_SCHEMA_MISMATCH, {page: 'home'})
    ).toEqual({view: 'continue'})
  })

  it('falls through for the ready state', () => {
    expect(selectPreReadyView(LOADING_STATE_READY, {page: 'home'})).toEqual({
      view: 'continue',
    })
  })

  it('tolerates being called with no options', () => {
    expect(selectPreReadyView(LOADING_STATE_INITIAL)).toEqual({view: 'initial'})
  })
})
