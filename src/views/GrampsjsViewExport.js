import {css, html} from 'lit'
import '@material/web/select/filled-select'
import '@material/web/select/select-option'
import '@material/web/button/filled-button'
import {mdiAlertOutline} from '@mdi/js'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsImportExportReport.js'
import {getExporterDownloadUrl, getPermissions} from '../api.js'
import {awaitTaskResponse} from '../taskResponse.js'

export class GrampsjsViewExport extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .hidden {
          display: none;
        }

        p {
          line-height: 1.6em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      _formData: {type: Object},
      _downloadUrl: {type: String},
      _mediaDownloadUrl: {type: String},
      _messages: {type: Array},
      _viewPrivate: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = []
    this._formData = {exporter: 'gramps', options: {}}
    this._downloadUrl = ''
    this._mediaDownloadUrl = ''
    this._messages = []
    this._viewPrivate = true
    // Tokens of the latest export and media export. A new run, or selecting
    // another exporter, replaces the token; a replaced run discards its
    // result.
    this._exportOp = null
    this._mediaOp = null
  }

  renderContent() {
    return html`
      <h2>${this._('Export')}</h2>
      <h3>${this._('Export your family tree')}</h3>

      ${this.data.length === 0
        ? html`<md-filled-select
            style="min-width:30em;"
            disabled
          ></md-filled-select>`
        : html`
            <md-filled-select
              @change=${this._handleSelect}
              style="min-width:30em;"
            >
              ${this.data.map(
                obj => html`
                  <md-select-option
                    value="${obj.extension}"
                    ?selected="${obj.extension === this._formData.exporter}"
                  >
                    <div slot="headline">${this._(obj.name)}</div>
                  </md-select-option>
                `
              )}
            </md-filled-select>
          `}
      ${this._getDescription()} ${this._renderWarning()}
      <p>
        <md-filled-button
          @click="${this._generateExport}"
          ?disabled="${!this._formData.exporter}"
          >${this._('_Generate')}</md-filled-button
        >
        <grampsjs-task-progress-indicator
          id="indicator-export"
          taskName="exportFile"
          class="button"
          size="20"
          .appState="${this.appState}"
        ></grampsjs-task-progress-indicator>
        <a
          download="${this._getFileName()}"
          href="${this._downloadUrl
            ? getExporterDownloadUrl(this._downloadUrl)
            : ''}"
          id="downloadanchor"
          >&nbsp;</a
        >
      </p>
      <grampsjs-import-export-report
        .appState="${this.appState}"
        .messages="${this._messages}"
        heading="${this._('Left out of the export')}"
        warn
      ></grampsjs-import-export-report>

      <h3>${this._('Export your media files')}</h3>

      <p>${this._('Generate a ZIP archive with all media files.')}</p>

      ${this._renderWarning()}
      <p>
        <md-filled-button @click="${this._generateMediaArchive}"
          >${this._('_Generate')}</md-filled-button
        >
        <grampsjs-task-progress-indicator
          id="indicator-media"
          taskName="exportMedia"
          class="button"
          size="20"
          .appState="${this.appState}"
        ></grampsjs-task-progress-indicator>
        <a
          download="grampsweb-media-export.zip"
          href="${this._mediaDownloadUrl
            ? getExporterDownloadUrl(this._mediaDownloadUrl)
            : ''}"
          id="downloadanchor-media"
          >&nbsp;</a
        >
      </p>
    `
  }

  _renderWarning() {
    if (this._viewPrivate) {
      return ''
    }
    return html`
      <p class="warn">
        <grampsjs-icon
          path="${mdiAlertOutline}"
          height="1em"
          width="1em"
          color="var(--grampsjs-body-font-color-50)"
        ></grampsjs-icon>
        ${this._(
          'You do not have permissions to view private records, so the export will be incomplete.'
        )}
      </p>
    `
  }

  _getFileName() {
    const id = this._formData.exporter
    if (!id) {
      // this shouldn't happen
      return 'file'
    }
    return `grampsweb-export.${id}`
  }

  _getDescription() {
    if (this.data.length === 0) {
      return ''
    }
    const [exporter] = this.data.filter(
      obj => obj.extension === this._formData.exporter
    )
    if (!exporter) {
      return ''
    }
    return html`<p>${this._(exporter.description)}</p>`
  }

  _handleSelect(e) {
    this._formData = {...this._formData, exporter: e.target.value}
    this._messages = []
    this._exportOp = null
    const prog = this.renderRoot.querySelector('#indicator-export')
    prog.reset()
    prog.open = false
  }

  _startDownload() {
    this.shadowRoot.querySelector('#downloadanchor').click()
  }

  _startMediaDownload() {
    this.shadowRoot.querySelector('#downloadanchor-media').click()
  }

  _getQueryUrl() {
    const id = this._formData.exporter
    const options = this._formData.options || {}
    const queryParam = new URLSearchParams(options).toString()
    return `/api/exporters/${id}/file?${queryParam}`
  }

  async _generateExport() {
    const op = {}
    this._exportOp = op
    this._downloadUrl = ''
    this._messages = []
    const prog = this.renderRoot.querySelector('#indicator-export')
    prog.reset()
    prog.open = true
    const res = await this.appState.apiPost(this._getQueryUrl())
    if (this._exportOp !== op) {
      return
    }
    const {data} = await awaitTaskResponse(this.appState, res, {
      prog,
      label: 'Export',
      taskName: 'exportFile',
    })
    if (data && this._exportOp === op) {
      this._messages = data.messages || []
      this._downloadUrl = data.url || ''
    }
  }

  async _generateMediaArchive() {
    const op = {}
    this._mediaOp = op
    this._mediaDownloadUrl = ''
    const prog = this.renderRoot.querySelector('#indicator-media')
    prog.reset()
    prog.open = true
    const res = await this.appState.apiPost('/api/media/archive/')
    if (this._mediaOp !== op) {
      return
    }
    const {data} = await awaitTaskResponse(this.appState, res, {
      prog,
      label: 'Export media',
      taskName: 'exportMedia',
    })
    if (data && this._mediaOp === op) {
      this._mediaDownloadUrl = data.url || ''
    }
  }

  async _fetchData() {
    this.loading = true
    const data = await this.appState.apiGet('/api/exporters/')
    this.loading = false
    if ('data' in data) {
      this.error = false
      this.data = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  firstUpdated() {
    super.firstUpdated()
    const permissions = getPermissions()
    this._viewPrivate = permissions.includes('ViewPrivate')
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('_downloadUrl') && this._downloadUrl) {
      this._startDownload()
    }
    if (changed.has('_mediaDownloadUrl') && this._mediaDownloadUrl) {
      this._startMediaDownload()
    }
  }

  _onLangChanged() {
    this._fetchData()
  }
}

window.customElements.define('grampsjs-view-export', GrampsjsViewExport)
