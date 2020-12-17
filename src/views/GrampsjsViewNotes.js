/*
Notes list view
*/


import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewNotes extends GrampsjsViewObjectsBase {

  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      type: {title: 'Type', sort: 'type'},
      text: {title: 'Text', sort: 'text'},
      change: {title: 'Last changed', sort: 'change'}

    }
    this._fetchUrl = '/api/notes/?keys=gramps_id,type,text,change'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `note/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      type: obj._(row.type),
      text: row?.text?.string,
      change: row.change
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-notes', GrampsjsViewNotes)
