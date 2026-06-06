/*
Places list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import '../components/GrampsjsFilterProperties.js'
import '../components/GrampsjsFilterTags.js'
import '../components/GrampsjsFilterPrivate.js'
import '../components/GrampsjsFilterText.js'

export class GrampsjsViewPlaces extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = [
      {name: 'Gramps ID', key: 'grampsId', sortKey: 'gramps_id'},
      {name: 'Name', key: 'title', sortKey: 'title'},
      {name: 'Place type:', key: 'type'},
      {name: 'Last changed', key: 'change', sortKey: 'change'},
    ]
    this._objectsName = 'places'
  }

  // eslint-disable-next-line class-methods-use-this
  get _supportsMerge() {
    return true
  }

  get _fetchUrl() {
    return '/api/places/?keys=gramps_id,name,place_type,change,handle'
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
      <grampsjs-filter-text
        .appState="${this.appState}"
        label="Name"
        rule="HasData"
        .valueIndex=${0}
        .numArgs=${3}
      ></grampsjs-filter-text>

      <grampsjs-filter-properties
        hasCount
        .appState="${this.appState}"
        .props="${filterCounts.places}"
        label="${this._('Associations')}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>

      <grampsjs-filter-private
        .appState="${this.appState}"
        rule="PlacePrivate"
      ></grampsjs-filter-private>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    return {
      grampsId: row.gramps_id,
      title: row.name.value,
      type: row?.place_type?.string || row?.place_type || '',
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
  }
}

window.customElements.define('grampsjs-view-places', GrampsjsViewPlaces)
