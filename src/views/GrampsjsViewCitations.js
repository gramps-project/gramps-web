/*
Citations list view
*/


import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewCitations extends GrampsjsViewObjectsBase {

  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      sourceTitle: {title: 'Source: Title', sort: ''},
      change: {title: 'Last changed', sort: 'change'},

    }
    this._fetchUrl = '/api/citations/?extend=source_handle&keys=gramps_id,extended,change'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `citation/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      sourceTitle: row.extended.source?.title,
      change: row.change
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-citations', GrampsjsViewCitations)
