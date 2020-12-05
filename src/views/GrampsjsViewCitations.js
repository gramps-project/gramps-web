/*
Citations list view
*/


import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import { GrampsjsViewObjectsBase } from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewCitations extends GrampsjsViewObjectsBase {

  constructor() {
    super();
    this._columns = {
      grampsId: "Gramps ID",
      sourceTitle: "Source: Title",
    }
    this._fetchUrl = '/api/citations/?extend=source_handle&keys=gramps_id,extended'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `citation/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      sourceTitle: row.extended.source?.title
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-citations', GrampsjsViewCitations);
