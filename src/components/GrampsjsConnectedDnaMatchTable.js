import {html} from 'lit'

import '@material/mwc-circular-progress'

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
        .strings="${this.strings}"
        .segments="${this._data.data}"
      ></grampsjs-dna-match-table>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return html`<mwc-circular-progress
      indeterminate
      density="-7"
      open
    ></mwc-circular-progress>`
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
