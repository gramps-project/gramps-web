import {css, html} from 'lit'
import '@material/mwc-select'
import '@material/mwc-button'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet, apiPost, getExporterDownloadUrl} from '../api.js'

export class GrampsjsViewExport extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .hidden {
          display: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      _formData: {type: Object},
      _downloadUrl: {type: String},
    }
  }

  constructor() {
    super()
    this.data = []
    this._formData = {exporter: 'gramps', options: {}}
    this._downloadUrl = ''
  }

  renderContent() {
    return html`
      <h2>${this._('Export')}</h2>

      <mwc-select @change=${this._handleSelect} style="min-width:30em;">
        ${this.data.map(
          obj => html`
            <mwc-list-item
              value="${obj.extension}"
              ?selected="${obj.extension === 'gramps'}"
              >${obj.name.replace('_', '')}</mwc-list-item
            >
          `
        )}
      </mwc-select>
      ${this._getDescription()}
      <p>
        <mwc-button
          raised
          @click="${this._generateExport}"
          ?disabled="${!this._formData.exporter}"
          >${this._('_Generate')}</mwc-button
        >
        <grampsjs-task-progress-indicator
          class="button"
          size="20"
          @task:complete="${this._handleTaskComplete}"
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
    return html`<p>${exporter.description}</p>`
  }

  _handleSelect(e) {
    this._formData = {...this._formData, exporter: e.target.value}
  }

  _startDownload() {
    this.shadowRoot.querySelector('#downloadanchor').click()
  }

  _getQueryUrl() {
    const id = this._formData.exporter
    const options = this._formData.options || {}
    const queryParam = new URLSearchParams(options).toString()
    return `/api/exporters/${id}/file?${queryParam}`
  }

  async _generateExport() {
    this._downloadUrl = ''
    const prog = this.renderRoot.querySelector(
      'grampsjs-task-progress-indicator'
    )
    prog.reset()
    prog.open = true
    const url = this._getQueryUrl()
    const data = await apiPost(url)
    if ('error' in data) {
      prog.setError()
      prog._errorMessage = data.error
    } else if ('task' in data) {
      // queued task
      prog.taskId = data.task?.id || ''
    } else {
      // eagerly executed task
      this._downloadUrl = data?.data?.url || ''
      prog.setComplete()
    }
  }

  _handleTaskComplete(e) {
    const {status} = e.detail
    const result = JSON.parse(status.result || {})
    this._downloadUrl = result?.url || ''
  }

  async _fetchData() {
    this.loading = true
    const data = await apiGet('/api/exporters/')
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
    if ('__lang__' in this.strings) {
      // don't load before we have strings
      this._fetchData(this.strings.__lang__)
    }
  }

  updated(changed) {
    if (changed.has('_downloadUrl') && this._downloadUrl) {
      this._startDownload()
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('language:changed', e =>
      this._handleLanguageChanged(e)
    )
  }

  _handleLanguageChanged(e) {
    if (this._hasFirstUpdated) {
      this._fetchData(e.detail.lang)
    }
  }
}

window.customElements.define('grampsjs-view-export', GrampsjsViewExport)
