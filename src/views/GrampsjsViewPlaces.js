/*
Places list view
*/



import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp} from '../util.js'


export class GrampsjsViewPlaces extends GrampsjsViewObjectsBase {

  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      title: {tite: 'Title', sort: 'title'},
      change: {title: 'Last changed', sort: 'change'},
    }
  }

  get _fetchUrl() {
    return '/api/places/?keys=gramps_id,title,change'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `place/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      title: row.title,
      change: prettyTimeDiffTimestamp(row.change, this.strings.__lang__)
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-places', GrampsjsViewPlaces)
