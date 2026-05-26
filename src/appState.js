import {
  getSettings,
  getPermissions,
  getTreeConfig,
  setTreeConfig,
  apiGet,
  Auth,
  apiPutPostDelete,
  updateSettings,
  updateTaskStatus,
} from './api.js'
import {getCurrentTheme} from './theme.js'
import {fireEvent, makeHandle} from './util.js'
import {getTaskLabel, getTaskName} from './taskLabels.js'

export function getInitialAppState() {
  const auth = new Auth()
  let activeGetCount = 0
  let activeSaveCount = 0
  let lastSaveSucceeded = true

  // In-memory notification log
  const notifications = []
  let unreadCount = 0

  // ---------------------------------------------------------------------------
  // Active background task store
  // ---------------------------------------------------------------------------
  // Each entry: { id, label, taskName, state, progress, info, result,
  //               result_object, createdAt (unix seconds) }
  // taskName is the frontend identifier matching the taskName attribute on
  // <grampsjs-task-progress-indicator> elements (e.g. "exportFile").
  const activeTasks = new Map()

  // Redis result TTL — tasks older than this can no longer be polled for status.
  // Should match the backend's result_expires setting (default 24 h).
  const TASK_TTL_SECONDS = 24 * 60 * 60

  // Total badge count = unread notifications + non-terminal running tasks.
  // Terminal tasks (SUCCESS/FAILURE/REVOKED) linger in activeTasks for ~10 s
  // but are already counted as unread notifications, so exclude them here to
  // avoid double-counting during the grace period.
  const TERMINAL_STATES = new Set(['SUCCESS', 'FAILURE', 'REVOKED'])
  function totalUnreadCount() {
    const runningCount = [...activeTasks.values()].filter(
      t => !TERMINAL_STATES.has(t.state)
    ).length
    return unreadCount + runningCount
  }

  function notifyTasks() {
    fireEvent(window, 'tasks:changed', {tasks: [...activeTasks.values()]})
    // Also update the notification bell count to include running tasks.
    // Re-use notifications:changed so GrampsjsMainMenu picks it up without
    // needing a separate listener.
    fireEvent(window, 'notifications:changed', {
      notifications: [...notifications],
      unreadCount: totalUnreadCount(),
    })
  }

  function updateTask(id, patch) {
    const existing = activeTasks.get(id)
    if (!existing) return
    activeTasks.set(id, {...existing, ...patch})
    notifyTasks()
  }

  function removeTask(id) {
    activeTasks.delete(id)
    notifyTasks()
  }

  function startPolling(taskId) {
    const doneStates = ['SUCCESS', 'FAILURE', 'REVOKED']
    updateTaskStatus(
      auth,
      taskId,
      status => {
        const entry = activeTasks.get(taskId)
        // If the task result has expired from Redis (TTL elapsed), Celery
        // returns PENDING indefinitely.  Detect this via createdAt age and
        // stop polling to avoid spinning forever.
        if (status.state === 'PENDING' && entry?.createdAt) {
          const age = Date.now() / 1000 - entry.createdAt
          if (age > TASK_TTL_SECONDS) {
            addNotification({
              type: 'warning',
              message: entry.label ?? taskId,
              source: 'task',
              detail: {
                info: 'Task status expired (result no longer in backend)',
              },
              userName: entry.userName ?? null,
            })
            removeTask(taskId)
            return
          }
        }
        updateTask(taskId, {
          state: status.state,
          progress: status.result_object?.progress ?? -1,
          info: status.info ?? null,
          result: status.result ?? null,
          result_object: status.result_object ?? null,
        })
        if (doneStates.includes(status.state)) {
          const eventName =
            status.state === 'SUCCESS' ? 'task:complete' : 'task:error'
          fireEvent(window, eventName, {taskId, status: entry})
          // Add a persistent entry to the notification log.
          if (status.state === 'SUCCESS') {
            addNotification({
              type: 'info',
              message: entry?.label ?? taskId,
              source: 'task',
              detail: status.result_object ?? {},
              userName: entry?.userName ?? null,
            })
          } else {
            addNotification({
              type: 'error',
              message: entry?.label ?? taskId,
              source: 'task',
              detail: {info: status.info, result_object: status.result_object},
              userName: entry?.userName ?? null,
            })
          }
          setTimeout(() => removeTask(taskId), 10_000)
        }
      },
      1000,
      Infinity,
      () => activeTasks.has(taskId)
    )
  }

  // options.taskName: frontend identifier matching the taskName attribute on
  //   <grampsjs-task-progress-indicator> (used for reconnection on remount).
  // options.createdAt: unix seconds; defaults to now.
  // options.userName: display name of the user who started the task, or null.
  function registerTask(
    id,
    label,
    {createdAt = Date.now() / 1000, taskName = '', userName = null} = {}
  ) {
    if (activeTasks.has(id)) return // already tracked
    activeTasks.set(id, {
      id,
      label,
      taskName,
      userName,
      state: 'PENDING',
      progress: -1,
      info: null,
      result: null,
      result_object: null,
      createdAt,
    })
    notifyTasks()
    startPolling(id)
  }

  async function loadActiveTasks() {
    const res = await apiGet(auth, '/api/tasks/?include_state=true')
    if (!res.data) return
    const runningStates = ['PENDING', 'STARTED', 'PROGRESS']
    for (const t of res.data) {
      if (runningStates.includes(t.state) && !activeTasks.has(t.task_id)) {
        // Ensure created_at is treated as UTC (backend may omit the Z suffix).
        let createdAt
        if (t.created_at) {
          const str =
            t.created_at.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(t.created_at)
              ? t.created_at
              : `${t.created_at}Z`
          const parsed = new Date(str).getTime() / 1000
          createdAt = Number.isFinite(parsed) ? parsed : Date.now() / 1000
        }
        // Skip tasks older than the Redis TTL — they appear as PENDING because
        // their result expired, not because they are genuinely still running.
        if (createdAt && Date.now() / 1000 - createdAt > TASK_TTL_SECONDS) {
          // eslint-disable-next-line no-continue
          continue
        }
        registerTask(t.task_id, getTaskLabel(t.name), {
          createdAt,
          taskName: getTaskName(t.name),
          userName: t.user_name ?? null,
        })
      }
    }
  }

  function addNotification({
    type = 'error',
    message = '',
    source = 'api',
    detail = {},
    userName = null,
  }) {
    const notification = {
      id: makeHandle(),
      type,
      message,
      source,
      detail,
      userName,
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
      unreadCount: totalUnreadCount(),
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
      unreadCount: totalUnreadCount(),
    })
  }

  function clearNotifications() {
    notifications.length = 0
    unreadCount = 0
    fireEvent(window, 'notifications:changed', {
      notifications: [],
      unreadCount: totalUnreadCount(),
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
    treeConfig: getTreeConfig(),
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
    updateTreeConfig: async (patch = {}) => {
      const merged = {...getTreeConfig(), ...patch}
      const res = await apiPutPostDelete(
        auth,
        'PUT',
        '/api/trees/-/config',
        merged,
        {saving: false, dbChanged: false}
      )
      if (!('error' in res)) {
        setTreeConfig(merged)
        fireEvent(window, 'treeconfig:changed', merged)
      }
      return res
    },
    replaceTreeConfig: async (config = {}) => {
      const res = await apiPutPostDelete(
        auth,
        'PUT',
        '/api/trees/-/config',
        config,
        {saving: false, dbChanged: false}
      )
      if (!('error' in res)) {
        setTreeConfig(config)
        fireEvent(window, 'treeconfig:changed', config)
      }
      return res
    },
    cacheTreeConfig: config => {
      setTreeConfig(config)
      fireEvent(window, 'treeconfig:changed', config)
    },
    getCurrentTheme: () => getCurrentTheme(getSettings().theme),
    getNotifications() {
      return [...notifications]
    },
    addNotification,
    markAllRead,
    clearNotifications,
    registerTask,
    loadActiveTasks,
    getActiveTasks() {
      return [...activeTasks.values()]
    },
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
