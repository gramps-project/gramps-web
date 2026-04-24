import {
  getSettings,
  getPermissions,
  apiGet,
  Auth,
  apiPutPostDelete,
  updateSettings,
} from './api.js'
import {getCurrentTheme} from './theme.js'
import {fireEvent, makeHandle} from './util.js'

export function getInitialAppState() {
  const auth = new Auth()
  let activeGetCount = 0
  let activeSaveCount = 0
  let lastSaveSucceeded = true

  // In-memory notification log
  const notifications = []
  let unreadCount = 0

  function addNotification({
    type = 'error',
    message = '',
    source = 'api',
    detail = {},
  }) {
    const notification = {
      id: makeHandle(),
      type,
      message,
      source,
      detail,
      timestamp: new Date(),
      read: false,
    }
    notifications.unshift(notification)
    if (notifications.length > 100) {
      notifications.length = 100
    }
    unreadCount = notifications.filter(n => n.read === false).length
    fireEvent(window, 'notifications:changed', {
      notifications: [...notifications],
      unreadCount,
    })
  }

  function markAllRead() {
    notifications.forEach(n => {
      // eslint-disable-next-line no-param-reassign
      n.read = true
    })
    unreadCount = 0
    fireEvent(window, 'notifications:changed', {
      notifications: [...notifications],
      unreadCount,
    })
  }

  function clearNotifications() {
    notifications.length = 0
    unreadCount = 0
    fireEvent(window, 'notifications:changed', {
      notifications: [],
      unreadCount,
    })
  }

  function notifyCounters() {
    fireEvent(window, 'requests:changed', {
      activeGet: activeGetCount,
      activeSave: activeSaveCount,
      lastSaveSucceeded,
    })
  }

  function completeSave(result) {
    activeSaveCount = Math.max(0, activeSaveCount - 1)
    lastSaveSucceeded = !('error' in result)
    notifyCounters()
    return result
  }

  return {
    auth,
    screenSize: 'small',
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
    apiGet: endpoint => {
      activeGetCount += 1
      notifyCounters()
      return apiGet(auth, endpoint).finally(() => {
        activeGetCount = Math.max(0, activeGetCount - 1)
        notifyCounters()
      })
    },
    apiPost: (endpoint, payload, options = {}) => {
      const {saving: isSave = true} = options
      if (isSave) {
        if (activeSaveCount === 0) lastSaveSucceeded = true
        activeSaveCount += 1
        notifyCounters()
      }
      return apiPutPostDelete(auth, 'POST', endpoint, payload, options).then(
        result => (isSave ? completeSave(result) : result)
      )
    },
    apiPut: (endpoint, payload, options = {}) => {
      const {saving: isSave = true} = options
      if (isSave) {
        if (activeSaveCount === 0) lastSaveSucceeded = true
        activeSaveCount += 1
        notifyCounters()
      }
      return apiPutPostDelete(auth, 'PUT', endpoint, payload, options).then(
        result => (isSave ? completeSave(result) : result)
      )
    },
    apiDelete: (endpoint, options = {}) => {
      const {saving: isSave = true} = options
      if (isSave) {
        if (activeSaveCount === 0) lastSaveSucceeded = true
        activeSaveCount += 1
        notifyCounters()
      }
      return apiPutPostDelete(auth, 'DELETE', endpoint, {}, options).then(
        result => (isSave ? completeSave(result) : result)
      )
    },
    refreshTokenIfNeeded: (force = false) => auth.getValidAccessToken(force),
    signout: () => auth.signout(),
    updateSettings: (settings = {}, tree = false) =>
      updateSettings(settings, tree),
    getCurrentTheme: () => getCurrentTheme(getSettings().theme),
    getNotifications() {
      return [...notifications]
    },
    addNotification,
    markAllRead,
    clearNotifications,
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
