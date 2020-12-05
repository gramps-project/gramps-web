/*
Places list view
*/


import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import { GrampsjsViewObjectsBase } from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewPlaces extends GrampsjsViewObjectsBase {

  constructor() {
    super();
    this._columns = {
      grampsId: "Gramps ID",
      title: "Title",
    }
    this._fetchUrl = '/api/places/?keys=gramps_id,title'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `place/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      title: row.title
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-places', GrampsjsViewPlaces);
