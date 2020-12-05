/*
Medias list view
*/


import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import { GrampsjsViewObjectsBase } from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewMediaObjects extends GrampsjsViewObjectsBase {

  constructor() {
    super();
    this._columns = {
      grampsId: "Gramps ID",
      mime: "Type",
      desc: "Description"
    }
    this._fetchUrl = '/api/media/?keys=gramps_id,mime,desc'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `mediaobject/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      mime: row.mime,
      desc: row.desc
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-media-objects', GrampsjsViewMediaObjects);
