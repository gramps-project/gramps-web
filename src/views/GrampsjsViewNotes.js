/*
Notes list view
*/

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp} from '../util.js'
import {
  privacyFilter,
  tagFilter,
  textFilter,
  typeFilter,
} from '../filterDefinitions.js'

export class GrampsjsViewNotes extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._objectsName = 'notes'
    this._columns = [
      {name: 'Gramps ID', key: 'grampsId', sortKey: 'gramps_id'},
      {name: 'Type', key: 'type', sortKey: 'type'},
      {name: 'Text', key: 'text', sortKey: 'text'},
      {name: 'Last changed', key: 'change', sortKey: 'change'},
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  get _fetchUrl() {
    return '/api/notes/?keys=gramps_id,type,text,change,handle'
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

  get filterDefinitions() {
    const _ = s => this._(s)
    return [
      textFilter(_, {label: 'Text', rule: 'MatchesRegexpOf'}),
      typeFilter(_, {label: 'Note type:', typeName: 'note_types'}),
      tagFilter(_),
      privacyFilter(_, {rule: 'NotePrivate'}),
    ]
  }
}

window.customElements.define('grampsjs-view-notes', GrampsjsViewNotes)
