import {
  getSettings,
  getPermissions,
  apiGet,
  Auth,
  apiPutPostDelete,
  updateSettings,
} from './api.js'
import {getCurrentTheme} from './theme.js'

export function getInitialAppState() {
  const auth = new Auth()
  return {
    auth,
    screenSize: 'small',
    progress: false,
    settings: getSettings(),
    dbInfo: {},
    frontendConfig: window.grampsjsConfig,
    permissions: {
      canAdd: false,
      canEdit: false,
      canViewPrivate: false,
      canManageUsers: false,
      canUseChat: false,
      canUpgradeTree: false,
      canEditTree: false,
    },
    i18n: {
      strings: {},
      lang: '',
    },
    path: {
      page: 'home',
      pageId: '',
      pageId2: '',
    },
    apiGet: endpoint => apiGet(auth, endpoint),
    apiPost: (endpoint, payload, options = {}) =>
      apiPutPostDelete(auth, 'POST', endpoint, payload, options),
    apiPut: (endpoint, payload, options = {}) =>
      apiPutPostDelete(auth, 'PUT', endpoint, payload, options),
    apiDelete: (endpoint, options = {}) =>
      apiPutPostDelete(auth, 'DELETE', endpoint, {}, options),
    refreshTokenIfNeeded: (force = false) => auth.getValidAccessToken(force),
    signout: () => auth.signout(),
    updateSettings: (settings = {}, tree = false) =>
      updateSettings(settings, tree),
    getCurrentTheme: () => getCurrentTheme(getSettings().theme),
  }
}

export function appStateUpdatePermissions(appState) {
  const rawPermissions = getPermissions()
  const permissions = {
    canAdd: rawPermissions.includes('AddObject'),
    canEdit: rawPermissions.includes('EditObject'),
    canViewPrivate: rawPermissions.includes('ViewPrivate'),
    canManageUsers: rawPermissions.includes('EditOtherUser'),
    canUseChat: rawPermissions.includes('UseChat'),
    canUpgradeTree: rawPermissions.includes('UpgradeSchema'),
    canEditTree: rawPermissions.includes('EditTree'),
  }
  // Return the same object reference if permissions haven't changed,
  // to avoid triggering unnecessary re-renders (which would reset open dialogs).
  const existing = appState.permissions
  if (
    existing &&
    Object.keys(permissions).every(key => existing[key] === permissions[key])
  ) {
    return appState
  }
  return {...appState, permissions}
}
