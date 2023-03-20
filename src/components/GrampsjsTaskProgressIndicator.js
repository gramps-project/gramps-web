import '@material/mwc-circular-progress'
import '@material/mwc-icon'

import {updateTaskStatus} from '../api.js'
import {GrampsjsProgressIndicator} from './GrampsjsProgressIndicator.js'

export class GrampsjsTaskProgressIndicator extends GrampsjsProgressIndicator {
  static get properties() {
    return {
      taskId: {type: String},
      pollInterval: {type: Number},
    }
  }

  constructor() {
    super()
    this.taskId = ''
    this.pollInterval = 1 // seconds
    this.hideAfter = 10 // seconds
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
    updateTaskStatus(
      this.taskId,
      status => {
        if (status.state === 'SUCCESS') {
          this.setComplete()
        } else if (status.state === 'FAILURE' || status.state === 'REVOKED') {
          this.setError()
        }
      },
      this.pollInterval * 1000
    )
  }

  setComplete() {
    this.progress = 1
    this.closeAfter()
  }

  setError() {
    this.error = true
    this.closeAfter()
  }

  closeAfter() {
    setTimeout(() => {
      this.open = false
    }, this.hideAfter * 1000)
  }
}

window.customElements.define(
  'grampsjs-task-progress-indicator',
  GrampsjsTaskProgressIndicator
)
