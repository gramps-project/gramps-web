import {css, html} from 'lit'
import '@material/mwc-select'
import '@material/mwc-checkbox'
import '@material/mwc-button'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet, getExporterUrl} from '../api.js'

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
      _queryUrl: {type: String},
    }
  }

  constructor() {
    super()
    this.data = []
    this._formData = {exporter: 'gramps', options: {compress: true}}
    this._queryUrl = ''
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
        <mwc-formfield label="${this._('Use Compression')}">
          <mwc-checkbox @change=${this._handleCompress} checked></mwc-checkbox>
        </mwc-formfield>
      </p>
      <p>
        <mwc-button
          raised
          @click="${this._handleSubmit}"
          ?disabled="${!this._formData.exporter}"
          >${this._('Download')}</mwc-button
        >
        <a
          download="gramps.${this._formData.exporter || ''}"
          href="${this._queryUrl}"
          id="submitanchor"
          >&nbsp;</a
        >
      </p>
    `
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
    this._updateQueryUrl()
  }

  _updateQueryUrl() {
    const id = this._formData.exporter
    this._queryUrl = getExporterUrl(id, this._formData.options || {})
  }

  _handleSubmit() {
    this.shadowRoot.querySelector('#submitanchor').click()
  }

  _handleCompress(e) {
    this._formData = {
      ...this._formData,
      options: {
        ...this._formData.options,
        compress: e.target.checked,
      },
    }
    this._updateQueryUrl()
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
