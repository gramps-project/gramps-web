import {css, html} from 'lit'
import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/divider/divider'

import {
  mdiFileDocument,
  mdiChartPie,
  mdiFileTree,
  mdiBookOpenVariant,
} from '@mdi/js'

import {GrampsjsView} from './GrampsjsView.js'
import {fireEvent} from '../util.js'
import '../components/GrampsjsIcon.js'

const categoryIconPath = {
  0: mdiFileDocument,
  1: mdiChartPie,
  5: mdiFileTree,
}

export class GrampsjsViewReports extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .hidden {
          display: none;
        }

        md-divider {
          --md-divider-thickness: 1px;
          --md-divider-color: rgba(0, 0, 0, 0.12);
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
      <h2>${this._('_Reports').replace('_', '')}</h2>
      <md-list> ${this.data.map(item => this._selectListItem(item))} </md-list>
    `
  }

  _selectListItem(report) {
    const iconPath = categoryIconPath[report.category] || mdiBookOpenVariant
    return html`
      <md-divider inset></md-divider>
      <md-list-item
        type="button"
        @click="${() => this._handleItemClick(report.id)}"
      >
        <grampsjs-icon slot="start" path="${iconPath}"></grampsjs-icon>
        ${this._(report.name)}
        <span slot="supporting-text">${this._(report.description)}</span>
      </md-list-item>
    `
  }

  _handleItemClick(reportId) {
    fireEvent(this, 'nav', {path: `report/${reportId}`})
  }

  async _fetchData() {
    this.loading = true
    const data = await this.appState.apiGet('/api/reports/')
    this.loading = false
    if ('data' in data) {
      this.error = false
      this.data = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _onLangChanged() {
    this._fetchData()
  }
}

window.customElements.define('grampsjs-view-reports', GrampsjsViewReports)
