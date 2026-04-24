import '@material/mwc-circular-progress'
import '@material/mwc-icon'

import {updateTaskStatus, addTaskId, deleteTaskId, getTaskIds} from '../api.js'
import {fireEvent} from '../util.js'
import {GrampsjsProgressIndicator} from './GrampsjsProgressIndicator.js'

export class GrampsjsTaskProgressIndicator extends GrampsjsProgressIndicator {
  static get properties() {
    return {
      taskId: {type: String},
      taskName: {type: String},
      pollInterval: {type: Number},
      hideAfter: {type: Number},
      status: {type: Object},
    }
  }

  constructor() {
    super()
    this.taskId = ''
    this.taskName = ''
    this.pollInterval = 1 // seconds
    this.hideAfter = 10 // seconds
    this.status = {}
    this._closeTimer = null
    this._pollingTaskId = ''
    this._boundHandleStorage = this._handleStorage.bind(this)
  }

  firstUpdated() {
    this.open = !!this.taskId
    this.fetchData()
  }

  update(changed) {
    super.update(changed)
    if (changed.has('taskId')) {
      this.reset()
      this.open = !!this.taskId
      this.fetchData()
    }
  }

  fetchData() {
    if (!this.taskId) {
      this._pollingTaskId = ''
      return
    }
    const currentTaskId = this.taskId
    this._pollingTaskId = currentTaskId
    if (this.taskName) {
      // store the task ID in local storage
      addTaskId(this.taskName, this.taskId)
    }
    updateTaskStatus(
      this.appState.auth,
      currentTaskId,
      status => {
        if (!this._shouldKeepPolling(currentTaskId)) {
          return
        }
        this.status = status
        if (status.state === 'SUCCESS') {
          this.setComplete()
        } else if (status.state === 'FAILURE' || status.state === 'REVOKED') {
          this.setError()
        } else if (status.state === 'PENDING') {
          this.progress = status.result_object?.progress ?? -1
          this.infoMessage = this._('Pending')
        } else if (status.state === 'STARTED') {
          this.progress = status.result_object?.progress ?? -1
          this.infoMessage = this._('Started')
        } else if (status.state === 'PROGRESS') {
          this.progress = status.result_object?.progress ?? -1
          this.infoMessage = `${status.result_object?.title ?? ''}
          ${status.result_object?.title ? '<br>' : ''}
          ${status.result_object?.message ?? ''}
          ${status.result_object?.message ? '<br>' : ''}
          ${Math.floor(100 * this.progress)}%`
        }
      },
      this.pollInterval * 1000,
      Infinity,
      () => this._shouldKeepPolling(currentTaskId)
    )
  }

  _shouldKeepPolling(taskId) {
    return (
      this.isConnected &&
      this.taskId === taskId &&
      this._pollingTaskId === taskId
    )
  }

  setComplete() {
    this.progress = 1
    this._pollingTaskId = ''
    this.closeAfter()
    if (this.taskName) {
      deleteTaskId(this.taskName, this.taskId)
    }
    fireEvent(this, 'task:complete', {status: this.status})
    this.infoMessage = ''
  }

  setError() {
    this.error = true
    this.errorMessage = this.status?.info || ''
    this._pollingTaskId = ''
    this.closeAfter()
    if (this.taskName) {
      deleteTaskId(this.taskName, this.taskId)
    }
    // Fire grampsjs:error with silent:true so GrampsJs logs it without showing
    // a snackbar — the inline progress indicator already displays the message.
    fireEvent(this, 'grampsjs:error', {
      message: this.errorMessage || this.taskName || this._('Task failed'),
      silent: true,
      source: 'task',
      detail: this.status?.result_object ?? {},
    })
    fireEvent(this, 'task:error', {status: this.status})
    this.infoMessage = ''
  }

  closeAfter() {
    this._clearCloseTimer()
    if (this.hideAfter > 0) {
      // Keep only one pending close timer so completed tasks do not retain
      // component state longer than necessary.
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

  _handleStorage() {
    if (!this.taskName) {
      return
    }
    if (!this.taskId || !this.open) {
      this._restoreState()
    }
  }

  _restoreState() {
    const taskIds = getTaskIds()
    if (this.taskName && taskIds?.[this.taskName]) {
      this.taskId = taskIds[this.taskName]
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('storage', this._boundHandleStorage)
    this._restoreState()
  }

  disconnectedCallback() {
    this._pollingTaskId = ''
    this._clearCloseTimer()
    window.removeEventListener('storage', this._boundHandleStorage)
    super.disconnectedCallback()
  }
}

window.customElements.define(
  'grampsjs-task-progress-indicator',
  GrampsjsTaskProgressIndicator
)
