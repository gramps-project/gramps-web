import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsReportOptions.js'
import {getReportUrl} from '../api.js'
import {fireEvent} from '../util.js'

export class GrampsjsViewReport extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          padding-bottom: 2em;
        }

        h2 mwc-icon-button {
          color: var(--mdc-theme-primary);
        }
      `,
    ]
  }

  static get properties() {
    return {
      reportId: {type: String},
      data: {type: Object},
      _queryUrl: {type: String},
      _options: {type: Object},
    }
  }

  constructor() {
    super()
    this.reportId = ''
    this.data = {}
    this._queryUrl = ''
    this._options = {}
  }

  renderContent() {
    if (!('id' in this.data)) {
      return ''
    }
    return html`
      <h2>
        <mwc-icon-button
          icon="arrow_back"
          @click="${this._handleBack}"
        ></mwc-icon-button>
        ${this._(this.data.name)}
      </h2>
      <dl style="clear:left;">
        <div>
          <dt>${this._('Description')}</dt>
          <dd>${this._(this.data.description)}</dd>
        </div>
        <div>
          <dt>${this._('Author')}</dt>
          <dd>${this.data.authors.join('')}</dd>
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

      <mwc-button unelevated @click="${this._handleSubmit}"
        >${this._('_Generate').replace('_', '')}</mwc-button
      >
      <a download href="${this._queryUrl}" id="submitanchor" target="_blank"
        >&nbsp;</a
      >
    `
  }

  async _fetchData() {
    this.loading = true
    const data = await this.appState.apiGet(`/api/reports/${this.reportId}`)
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
    if (this.appState.i18n.lang) {
      // don't load before we have strings
      this._fetchData(this.appState.i18n.lang)
    }
    this._updateQueryUrl()
  }

  update(changed) {
    super.update(changed)
    if (changed.has('reportId')) {
      this.data = {}
      this._fetchData()
    }
  }

  _updateQueryUrl() {
    const options = Object.keys(this._options).reduce((r, e) => {
      if (this._options[e] !== '') {
        // eslint-disable-next-line no-param-reassign
        r[e] = `${this._options[e]}`
      }
      return r
    }, {})
    this._queryUrl = getReportUrl(this.reportId, options)
  }

  _handleSubmit() {
    this.shadowRoot.querySelector('#submitanchor').click()
  }

  _handleOptionsChanged(e) {
    this._options = {...e.detail}
    this._updateQueryUrl()
  }

  _handleBack() {
    fireEvent(this, 'nav', {path: 'reports'})
  }
}

window.customElements.define('grampsjs-view-report', GrampsjsViewReport)
