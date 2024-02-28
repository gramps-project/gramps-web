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
      return
    }
    if (this.taskName) {
      // store the task ID in local storage
      addTaskId(this.taskName, this.taskId)
    }
    updateTaskStatus(
      this.taskId,
      status => {
        this.status = status
        if (status.state === 'SUCCESS') {
          this.setComplete()
        } else if (status.state === 'FAILURE' || status.state === 'REVOKED') {
          this.setError()
        } else if (status.state === 'PROGRESS') {
          this.progress = status.result_object?.progress ?? -1
          this.infoMessage = `${status.result_object?.title ?? ''}
          ${status.result_object?.title ? '<br>' : ''}
          ${status.result_object?.message ?? ''}
          ${status.result_object?.message ? '<br>' : ''}
          ${Math.floor(100 * this.progress)}%`
        }
      },
      this.pollInterval * 1000
    )
  }

  setComplete() {
    this.progress = 1
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
    this.closeAfter()
    if (this.taskName) {
      deleteTaskId(this.taskName, this.taskId)
    }
    fireEvent(this, 'task:error', {status: this.status})
    this.infoMessage = ''
  }

  closeAfter() {
    if (this.hideAfter > 0) {
      setTimeout(() => {
        this.open = false
      }, this.hideAfter * 1000)
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
    if (this.taskName && taskIds[this.taskName]) {
      this.taskId = taskIds[this.taskName]
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('storage', this._handleStorage.bind(this))
    this._restoreState()
  }
}

window.customElements.define(
  'grampsjs-task-progress-indicator',
  GrampsjsTaskProgressIndicator
)
