/*
Places list view
*/

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {
  prettyTimeDiffTimestamp,
  filterCounts,
  getEnclosingPlaces,
} from '../util.js'
import {
  associationsFilter,
  privacyFilter,
  tagFilter,
  textFilter,
} from '../filterDefinitions.js'

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

  async _deleteBlocked(handles) {
    const enclosing = await getEnclosingPlaces(this.appState, handles)
    if (enclosing.length === 0) {
      return null
    }
    return {
      title: this._('Cannot delete place.'),
      message: this._(
        'This place is currently referenced by another place. First remove the places it contains.'
      ),
    }
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

  get filterDefinitions() {
    const _ = s => this._(s)
    return [
      textFilter(_, {label: 'Name', rule: 'HasData', numArgs: 3}),
      associationsFilter(_, filterCounts.places),
      tagFilter(_),
      privacyFilter(_, {rule: 'PlacePrivate'}),
    ]
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
