import {css, html} from 'lit'

import '@material/mwc-circular-progress'

import './GrampsjsTable.js'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'

const matchColumns = ['Chromosome', 'Start', 'Stop', 'Side', 'cM', 'SNPs']

class GrampsjsDnaMatch extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          font-size: 16px;
          font-weight: 400;
        }

        .container {
          padding: 10px;
        }
      `,
    ]
  }

  constructor() {
    super()
    this.method = 'POST'
  }

  renderContent() {
    if (!this._data.data.length > 0) {
      return html`
        <p>${this._('No DNA matches detected in the data provided.')}</p>
      `
    }
    return html`
      <div class="container">
        <grampsjs-table
          .strings="${this.strings}"
          .data="${this._formatData(this._data.data)}"
          .columns="${matchColumns}"
        ></grampsjs-table>
      </div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _formatData(data) {
    if (!data || !data.length > 0) {
      return []
    }
    return data.map(row => [
      row.chromosome,
      row.start,
      row.stop,
      row.side,
      row.cM,
      row.SNPs,
    ])
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

window.customElements.define('grampsjs-dna-match', GrampsjsDnaMatch)
