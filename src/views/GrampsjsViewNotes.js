/*
Notes list view
*/



import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp} from '../util.js'


export class GrampsjsViewNotes extends GrampsjsViewObjectsBase {

  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      type: {title: 'Type', sort: 'type'},
      text: {title: 'Text', sort: 'text'},
      change: {title: 'Last changed', sort: 'change'}

    }
  }

  get _fetchUrl() {
    return '/api/notes/?keys=gramps_id,type,text,change'
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
      change: prettyTimeDiffTimestamp(row.change, this.strings.__lang__)
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-notes', GrampsjsViewNotes)
