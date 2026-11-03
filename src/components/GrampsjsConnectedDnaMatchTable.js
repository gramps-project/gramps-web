import {html} from 'lit'

import '@material/web/progress/circular-progress.js'

import './GrampsjsDnaMatchTable.js'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'

class GrampsjsConnectedDnaMatchTable extends GrampsjsConnectedComponent {
  constructor() {
    super()
    this.method = 'POST'
  }

  renderContent() {
    return html`
      <grampsjs-dna-match-table
        .appState="${this.appState}"
        .segments="${this._data.data}"
      ></grampsjs-dna-match-table>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return html`<md-circular-progress
      indeterminate
      style="--md-circular-progress-size: 24px;
        --md-circular-progress-active-indicator-width: 15; margin: -2px;"
    ></md-circular-progress>`
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    return `/api/parsers/dna-match`
  }
}

window.customElements.define(
  'grampsjs-connected-dna-match-table',
  GrampsjsConnectedDnaMatchTable
)
