/*
Families list view
*/


import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import { GrampsjsViewObjectsBase } from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewFamilies extends GrampsjsViewObjectsBase {

  constructor() {
    super();
    this._columns = {
      grampsId: "Gramps ID",
      father: "Father",
      mother: "Mother",
    }
    this._fetchUrl = '/api/families/?profile=self&keys=gramps_id,profile'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `family/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      father: `${row?.profile?.father?.name_surname || '…'}, ${row?.profile?.father?.name_given || '&hellip;'}`,
      mother: `${row?.profile?.mother?.name_surname || '…'}, ${row?.profile?.mother?.name_given || '&hellip;'}`
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-families', GrampsjsViewFamilies);
