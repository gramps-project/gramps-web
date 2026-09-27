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
      _downloadUrl: {type: String},
      _options: {type: Object},
      _generating: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.reportId = ''
    this.data = {}
    this._downloadUrl = ''
    this._options = {}
    this._generating = false
    this._requestedReportId = ''
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
          ?disabled="${this._generating}"
          @click="${this._generateReport}"
          >${this._('_Generate')}</md-filled-button
        >
        <grampsjs-task-progress-indicator
          id="indicator-report"
          taskName="generateReport"
          class="button"
          size="20"
          .appState="${this.appState}"
          @task:complete="${this._handleTaskComplete}"
          @task:error="${this._handleTaskError}"
        ></grampsjs-task-progress-indicator>
        <a
          download
          href="${this._downloadUrl
            ? getExporterDownloadUrl(this._downloadUrl)
            : ''}"
          id="downloadanchor"
          >&nbsp;</a
        >
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
      this._downloadUrl = ''
      this._fetchData()
    }
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('_downloadUrl') && this._downloadUrl) {
      this.renderRoot.querySelector('#downloadanchor').click()
    }
  }

  _getQueryUrl() {
    // Empty values are left out so the backend uses its defaults.
    const options = Object.fromEntries(
      Object.entries(this._options).filter(([, val]) => `${val}` !== '')
    )
    const param = encodeURIComponent(JSON.stringify(options))
    return `/api/reports/${this.reportId}/file?options=${param}`
  }

  // The indicator fires task:complete or task:error on every outcome, which
  // re-enables the Generate button.
  async _generateReport() {
    this._generating = true
    this._downloadUrl = ''
    const prog = this.renderRoot.querySelector('#indicator-report')
    prog.reset()
    prog.open = true
    const data = await this.appState.apiPost(this._getQueryUrl(), undefined, {
      saving: false,
      dbChanged: false,
    })
    if ('error' in data) {
      prog.setError()
      prog.errorMessage = data.error
    } else if ('task' in data) {
      // queued task
      const taskId = data.task?.id || ''
      if (taskId) {
        this.appState.registerTask(taskId, 'Report', {
          taskName: 'generateReport',
        })
        prog.taskId = taskId
      } else {
        prog.setError()
      }
    } else {
      // eagerly executed task
      this._downloadUrl = data?.data?.url || ''
      prog.setComplete()
    }
  }

  _handleTaskComplete(e) {
    this._generating = false
    const {status} = e.detail
    let result = status?.result ?? {}
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result)
      } catch (error) {
        result = {}
      }
    }
    // An eagerly executed report completes with an empty status after its
    // URL is already set, so only a queued task's result sets it here.
    if (result?.url) {
      this._downloadUrl = result.url
    }
  }

  _handleTaskError() {
    this._generating = false
  }

  _handleOptionsChanged(e) {
    this._options = {...e.detail}
  }

  _handleBack() {
    fireEvent(this, 'nav', {path: 'reports'})
  }
}

window.customElements.define('grampsjs-view-report', GrampsjsViewReport)
