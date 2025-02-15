/*
Places list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'

export class GrampsjsViewPlaces extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      title: {title: 'Name', sort: 'title'},
      change: {title: 'Last changed', sort: 'change'},
    }
    this._objectsName = 'places'
  }

  // eslint-disable-next-line class-methods-use-this
  get _fetchUrl() {
    return '/api/places/?keys=gramps_id,name,change'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `place/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_place'
  }

  renderFilters() {
    return html`
      <grampsjs-filter-properties
        hasCount
        .appState="${this.appState}"
        .props="${filterCounts.places}"
        label="${this._('Associations')}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      title: row.name.value,
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
    return formattedRow
  }
}

window.customElements.define('grampsjs-view-places', GrampsjsViewPlaces)
