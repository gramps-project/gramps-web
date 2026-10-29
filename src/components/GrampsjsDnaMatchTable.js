import {css, html, LitElement} from 'lit'

import './GrampsjsTable.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'

const columnsByLocale = new Map()

// The table columns, with numbers formatted for `locale`. The same locale
// gets the same columns, so the table only updates when the locale changes.
function matchColumns(locale) {
  if (!columnsByLocale.has(locale)) {
    const formatCm = new Intl.NumberFormat(locale, {maximumFractionDigits: 1})
    const formatCount = new Intl.NumberFormat(locale)
    columnsByLocale.set(locale, [
      {name: 'Chromosome'},
      {name: 'Start Position', format: value => formatCount.format(value)},
      {name: 'End Position', format: value => formatCount.format(value)},
      {name: 'Side'},
      {name: 'Length', unit: 'cM', format: value => formatCm.format(value)},
      {name: 'Number of SNPs', format: value => formatCount.format(value)},
    ])
  }
  return columnsByLocale.get(locale)
}

function formatSide(side) {
  if (side === 'P' || side === 'F') {
    return 'Paternal'
  }
  if (side === 'M') {
    return 'Maternal'
  }
  return 'Unknown'
}

export class GrampsjsDnaMatchTable extends GrampsjsAppStateMixin(LitElement) {
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
    if (!this.segments?.length) {
      return html`
        <p>${this._('No DNA matches detected in the data provided.')}</p>
      `
    }
    return html`
      <div class="container">
        <grampsjs-table
          sortable
          .data="${this._formatData(this.segments)}"
          .columns="${matchColumns(
            (this.appState?.i18n?.lang || 'en').replace('_', '-')
          )}"
          .appState="${this.appState}"
        ></grampsjs-table>
      </div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _formatData(data) {
    if (!data?.length) {
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
