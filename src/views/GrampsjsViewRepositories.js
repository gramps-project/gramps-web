/*
Repositories list view
*/

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp} from '../util.js'
import {privacyFilter, tagFilter, textFilter} from '../filterDefinitions.js'

export class GrampsjsViewRepositories extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = [
      {name: 'Gramps ID', key: 'grampsId', sortKey: 'gramps_id'},
      {name: 'Name', key: 'name', sortKey: 'name'},
      {name: 'Type', key: 'type', sortKey: 'type'},
      {name: 'Last changed', key: 'change', sortKey: 'change'},
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  get _fetchUrl() {
    return '/api/repositories/?keys=gramps_id,name,type,change,handle'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `repository/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_repository'
  }

  get filterDefinitions() {
    const _ = s => this._(s)
    return [
      textFilter(_, {label: 'Name', rule: 'MatchesNameSubstringOf'}),
      tagFilter(_),
      privacyFilter(_, {rule: 'RepoPrivate'}),
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      name: row.name,
      type: this._(row.type),
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
    return formattedRow
  }
}

window.customElements.define(
  'grampsjs-view-repositories',
  GrampsjsViewRepositories
)
