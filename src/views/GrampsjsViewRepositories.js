/*
Repositories list view
*/


import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import { GrampsjsViewObjectsBase } from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewRepositories extends GrampsjsViewObjectsBase {

  constructor() {
    super();
    this._columns = {
      grampsId: "Gramps ID",
      name: "Name",
      type: "Type"
    }
    this._fetchUrl = '/api/repositories/?keys=gramps_id,name,type'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `repository/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      name: row.name,
      type: this._(row.type)
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-repositories', GrampsjsViewRepositories);
