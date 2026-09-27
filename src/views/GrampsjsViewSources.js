/*
Sources list view
*/

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import {
  associationsFilter,
  privacyFilter,
  tagFilter,
  textFilter,
} from '../filterDefinitions.js'

export class GrampsjsViewSources extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = [
      {name: 'Gramps ID', key: 'grampsId', sortKey: 'gramps_id'},
      {name: 'Title', key: 'title', sortKey: 'title'},
      {name: 'Author', key: 'author', sortKey: 'author'},
      {name: 'Publication info', key: 'pubinfo', sortKey: 'pubinfo'},
      {name: 'Last changed', key: 'change', sortKey: 'change'},
    ]
    this._objectsName = 'sources'
  }

  // eslint-disable-next-line class-methods-use-this
  get _supportsMerge() {
    return true
  }

  get _fetchUrl() {
    return '/api/sources/?keys=gramps_id,title,author,pubinfo,change,handle'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `source/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_source'
  }

  get filterDefinitions() {
    const _ = s => this._(s)
    return [
      textFilter(_, {label: 'Title', rule: 'MatchesTitleSubstringOf'}),
      associationsFilter(_, filterCounts.sources),
      tagFilter(_),
      privacyFilter(_, {rule: 'SourcePrivate'}),
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      title: row.title,
      author: row.author,
      pubinfo: row.pubinfo,
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
    return formattedRow
  }
}

window.customElements.define('grampsjs-view-sources', GrampsjsViewSources)
