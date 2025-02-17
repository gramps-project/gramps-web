import {css, html, LitElement} from 'lit'

import './GrampsjsTable.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'

const matchColumns = [
  {name: 'Chromosome'},
  {name: 'Start Position', format: value => value.toLocaleString()},
  {name: 'End Position', format: value => value.toLocaleString()},
  {name: 'Side'},
  {name: 'Length', unit: 'cM'},
  {name: 'Number of SNPs', format: value => value.toLocaleString()},
]

function formatSide(side) {
  if (side === 'P' || side === 'F') {
    return 'Paternal'
  }
  if (side === 'M') {
    return 'Maternal'
  }
  return 'Unknown'
}

class GrampsjsDnaMatchTable extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
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

  static get properties() {
    return {
      segments: {type: Array},
    }
  }

  constructor() {
    super()
    this.segments = []
  }

  render() {
    if (!this.segments.length > 0) {
      return html`
        <p>${this._('No DNA matches detected in the data provided.')}</p>
      `
    }
    return html`
      <div class="container">
        <grampsjs-table
          sortable
          .data="${this._formatData(this.segments)}"
          .columns="${matchColumns}"
          .appState="${this.appState}"
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
      this._(formatSide(row.side)),
      row.cM,
      row.SNPs,
    ])
  }
}

window.customElements.define('grampsjs-dna-match-table', GrampsjsDnaMatchTable)
