import {css, html} from 'lit'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/filled-button.js'

import {mdiArrowLeft} from '@mdi/js'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsReportOptions.js'
import '../components/GrampsjsTaskProgressIndicator.js'
import {getExporterDownloadUrl} from '../api.js'
import {fireEvent} from '../util.js'

const _terminalStates = ['SUCCESS', 'FAILURE', 'REVOKED']

export class GrampsjsViewReport extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          padding-bottom: 2em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      reportId: {type: String},
      data: {type: Object},
      _options: {type: Object},
      _submitting: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.reportId = ''
    this.data = {}
    this._options = {}
    this._submitting = false
    this._requestedReportId = ''
    // Report tasks started in this tab. This element serves every report and
    // stays mounted on other pages, so a finished task downloads its own file
    // wherever the user is.
    this._ownTaskIds = new Set()
    this._boundHandleTasksChanged = () => this.requestUpdate()
    this._boundHandleTaskDone = this._handleTaskDone.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('tasks:changed', this._boundHandleTasksChanged)
    window.addEventListener('task:complete', this._boundHandleTaskDone)
    window.addEventListener('task:error', this._boundHandleTaskDone)
  }

  disconnectedCallback() {
    window.removeEventListener('tasks:changed', this._boundHandleTasksChanged)
    window.removeEventListener('task:complete', this._boundHandleTaskDone)
    window.removeEventListener('task:error', this._boundHandleTaskDone)
    super.disconnectedCallback()
  }

  renderContent() {
    if (!('id' in this.data)) {
      return ''
    }
    return html`
      <h2>
        <md-icon-button
          aria-label="${this._('_Back')}"
          @click="${this._handleBack}"
        >
          <grampsjs-icon
            path="${mdiArrowLeft}"
            color="var(--mdc-theme-primary)"
          ></grampsjs-icon>
        </md-icon-button>
        ${this._(this.data.name)}
      </h2>
      <dl style="clear:left;">
        <div>
          <dt>${this._('Description')}</dt>
          <dd>${this._(this.data.description)}</dd>
        </div>
        <div>
          <dt>${this._('Author')}</dt>
          <dd>${(this.data.authors ?? []).join(', ')}</dd>
        </div>
        <div>
          <dt>${this._('Version')}</dt>
          <dd>${this.data.version}</dd>
        </div>
      </dl>
      <div style="clear:left;"></div>

      <h3>${this._('Options')}</h3>

      <grampsjs-report-options
        .optionsDict="${this.data.options_dict}"
        .optionsHelp="${this.data.options_help}"
        @report-options:changed="${this._handleOptionsChanged}"
        .appState="${this.appState}"
      ></grampsjs-report-options>

      <p>
        <md-filled-button
          ?disabled="${this._submitting || this._ownTaskRunning()}"
          @click="${this._generateReport}"
          >${this._('_Generate')}</md-filled-button
        >
        <grampsjs-task-progress-indicator
          id="indicator-report"
          taskName="generateReport"
          class="button"
          size="20"
          .appState="${this.appState}"
        ></grampsjs-task-progress-indicator>
      </p>
    `
  }

  async _fetchData() {
    const {reportId} = this
    this._requestedReportId = reportId
    this.loading = true
    const data = await this.appState.apiGet(`/api/reports/${reportId}`)
    // A newer request for another report supersedes this one.
    if (reportId !== this._requestedReportId) {
      return
    }
    this.loading = false
    if ('data' in data) {
      this.error = false
      this.data = data.data
    } else if ('error' in data) {
      // Allow a retry on the next visit.
      this._requestedReportId = ''
      this.error = true
      this._errorMessage = data.error
    }
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    // reportId follows the URL even while this view is inactive, so only
    // reload when it names a report other than the one loaded or loading.
    if (changed.has('reportId') && this.reportId !== this._requestedReportId) {
      this.data = {}
      this._options = {}
      this._fetchData()
    }
  }

  _ownTaskRunning() {
    const tasks = this.appState?.getActiveTasks?.() ?? []
    return tasks.some(
      task =>
        this._ownTaskIds.has(task.id) && !_terminalStates.includes(task.state)
    )
  }

  _getQueryUrl() {
    // Empty values are left out so the backend uses its defaults.
    const options = Object.fromEntries(
      Object.entries(this._options).filter(([, val]) => `${val}` !== '')
    )
    const param = encodeURIComponent(JSON.stringify(options))
    return `/api/reports/${this.reportId}/file?options=${param}`
  }

  // While the request is in flight, _submitting disables Generate; once the
  // task is queued, its state in the task store does.
  async _generateReport() {
    this._submitting = true
    const prog = this.renderRoot.querySelector('#indicator-report')
    prog.reset()
    prog.open = true
    let data
    try {
      data = await this.appState.apiPost(this._getQueryUrl(), undefined, {
        saving: false,
        dbChanged: false,
      })
    } finally {
      this._submitting = false
    }
    const taskId = data.task?.id || ''
    if ('error' in data) {
      prog.setError()
      prog.errorMessage = data.error
    } else if ('task' in data && taskId) {
      // queued task
      this._ownTaskIds.add(taskId)
      this.appState.registerTask(taskId, 'Report', {
        taskName: 'generateReport',
      })
      prog.taskId = taskId
    } else if ('task' in data) {
      prog.setError()
    } else {
      // eagerly executed task
      prog.setComplete()
      this._download(data?.data?.url)
    }
  }

  // appState fires these on window for every polled task; the indicator's
  // events of the same name carry no taskId and are ignored.
  _handleTaskDone(e) {
    const {taskId, status} = e.detail ?? {}
    if (!this._ownTaskIds.has(taskId)) {
      return
    }
    this._ownTaskIds.delete(taskId)
    this.requestUpdate()
    if (e.type !== 'task:complete') {
      return
    }
    let result = status?.result ?? {}
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result)
      } catch (error) {
        result = {}
      }
    }
    this._download(result?.url)
  }

  // A temporary anchor works while this view is inactive and not rendering.
  _download(url) {
    if (!url) {
      return
    }
    const anchor = document.createElement('a')
    anchor.href = getExporterDownloadUrl(url)
    anchor.download = ''
    this.renderRoot.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  _handleOptionsChanged(e) {
    this._options = {...e.detail}
  }

  _handleBack() {
    fireEvent(this, 'nav', {path: 'reports'})
  }
}

window.customElements.define('grampsjs-view-report', GrampsjsViewReport)
