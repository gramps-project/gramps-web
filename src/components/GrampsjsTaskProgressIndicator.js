import '@material/mwc-circular-progress'
import '@material/mwc-icon'

import {fireEvent} from '../util.js'
import {GrampsjsProgressIndicator} from './GrampsjsProgressIndicator.js'

export class GrampsjsTaskProgressIndicator extends GrampsjsProgressIndicator {
  static get properties() {
    return {
      taskId: {type: String},
      taskName: {type: String},
      hideAfter: {type: Number},
      status: {type: Object},
    }
  }

  constructor() {
    super()
    this.taskId = ''
    this.taskName = ''
    this.hideAfter = 10 // seconds
    this.status = {}
    this._closeTimer = null
    this._boundHandleTasksChanged = this._handleTasksChanged.bind(this)
  }

  firstUpdated() {
    this.open = !!this.taskId
    if (this.taskId) {
      this._syncStatusFromAppState()
    }
  }

  update(changed) {
    super.update(changed)
    // When appState is first provided (component mount / reconnect), try to
    // reconnect to a running task matching our taskName so inline indicators
    // resume progress after navigation without needing an explicit taskId set.
    if (
      changed.has('appState') &&
      this.appState &&
      !this.taskId &&
      this.taskName
    ) {
      this._reconnectByTaskName()
    }
    if (changed.has('taskId')) {
      this.reset()
      this.open = !!this.taskId
      if (this.taskId) {
        this._syncStatusFromAppState()
      }
    }
    if (changed.has('status') && this.status?.state) {
      this._applyStatus(this.status)
    }
  }

  // Pull current status from appState for the current taskId (used on mount
  // and when taskId changes, so the indicator is up-to-date immediately).
  _syncStatusFromAppState() {
    const tasks = this.appState?.getActiveTasks?.() ?? []
    const existing = tasks.find(t => t.id === this.taskId)
    if (existing) {
      this.status = existing
    }
  }

  // Reconnect to a running task whose taskName matches this indicator's
  // taskName attribute.  Called when appState becomes available and no taskId
  // is set — handles navigation back to a view that was mounted mid-task.
  _reconnectByTaskName() {
    const tasks = this.appState?.getActiveTasks?.() ?? []
    const task = tasks.find(t => t.taskName === this.taskName)
    if (task) {
      this.taskId = task.id
      this.open = true
    }
  }

  // React to appState task store updates fired as 'tasks:changed' on window.
  _handleTasksChanged(e) {
    if (this.taskId) {
      const task = e.detail.tasks.find(t => t.id === this.taskId)
      if (task) {
        this.status = task
      }
    } else if (this.taskName) {
      // Reconnect if a running task matches our taskName and we have no taskId
      // yet (e.g. tasks:changed fires before appState is set on first mount).
      const task = e.detail.tasks.find(t => t.taskName === this.taskName)
      if (task) {
        this.taskId = task.id
        this.open = true
      }
    }
  }

  _applyStatus(status) {
    if (!status?.state) return
    // Guard: do not re-fire terminal events if already complete or errored.
    if (this.progress >= 1 || this.error) return
    if (status.state === 'SUCCESS') {
      this.setComplete()
    } else if (status.state === 'FAILURE' || status.state === 'REVOKED') {
      this.setError()
    } else if (status.state === 'PENDING') {
      this.progress = status.progress ?? -1
      this.infoMessage = this._('Pending')
    } else if (status.state === 'STARTED') {
      this.progress = status.progress ?? -1
      this.infoMessage = this._('Started')
    } else if (status.state === 'PROGRESS') {
      this.progress = status.progress ?? -1
      this.infoMessage = `${status.result_object?.title ?? ''}
          ${status.result_object?.title ? '<br>' : ''}
          ${status.result_object?.message ?? ''}
          ${status.result_object?.message ? '<br>' : ''}
          ${Math.floor(100 * this.progress)}%`
    }
  }

  setComplete() {
    this.progress = 1
    this.closeAfter()
    fireEvent(this, 'task:complete', {status: this.status})
    this.infoMessage = ''
  }

  setError() {
    this.error = true
    this.errorMessage = this.status?.info || ''
    this.closeAfter()
    // Fire task:error for component-level handlers (e.g. _handleUndoError).
    // Notification-log entries are added centrally by appState.startPolling.
    fireEvent(this, 'task:error', {status: this.status})
    this.infoMessage = ''
  }

  closeAfter() {
    this._clearCloseTimer()
    if (this.hideAfter > 0) {
      this._closeTimer = setTimeout(() => {
        this.open = false
        this._closeTimer = null
      }, this.hideAfter * 1000)
    }
  }

  _clearCloseTimer() {
    if (this._closeTimer !== null) {
      clearTimeout(this._closeTimer)
      this._closeTimer = null
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('tasks:changed', this._boundHandleTasksChanged)
  }

  disconnectedCallback() {
    this._clearCloseTimer()
    window.removeEventListener('tasks:changed', this._boundHandleTasksChanged)
    super.disconnectedCallback()
  }
}

window.customElements.define(
  'grampsjs-task-progress-indicator',
  GrampsjsTaskProgressIndicator
)
