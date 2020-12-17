/*
Places list view
*/


import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewPlaces extends GrampsjsViewObjectsBase {

  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      title: {tite: 'Title', sort: 'title'},
      change: {title: 'Last changed', sort: 'change'},
    }
    this._fetchUrl = '/api/places/?keys=gramps_id,title,change'
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
      change: row.change
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-places', GrampsjsViewPlaces)
