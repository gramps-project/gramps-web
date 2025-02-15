/*
Notes list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp} from '../util.js'
import '../components/GrampsjsFilterType.js'

export class GrampsjsViewNotes extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      type: {title: 'Type', sort: 'type'},
      text: {title: 'Text', sort: 'text'},
      change: {title: 'Last changed', sort: 'change'},
    }
  }

  // eslint-disable-next-line class-methods-use-this
  get _fetchUrl() {
    return '/api/notes/?keys=gramps_id,type,text,change'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `note/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_note'
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      type: obj._(row.type),
      text: row?.text?.string,
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
    return formattedRow
  }

  renderFilters() {
    return html`
      <grampsjs-filter-type
        .appState="${this.appState}"
        label="${this._('Note type:').replace(':', '')}"
        typeName="note_types"
      ></grampsjs-filter-type>
    `
  }
}

window.customElements.define('grampsjs-view-notes', GrampsjsViewNotes)
