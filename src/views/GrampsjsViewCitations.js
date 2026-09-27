/*
Citations list view
*/

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import {
  associationsFilter,
  privacyFilter,
  tagFilter,
  textFilter,
} from '../filterDefinitions.js'

export class GrampsjsViewCitations extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = [
      {name: 'Gramps ID', key: 'grampsId', sortKey: 'gramps_id'},
      {name: 'Source: Title', key: 'sourceTitle'},
      {name: 'Page', key: 'page'},
      {name: 'Last changed', key: 'change', sortKey: 'change'},
    ]
    this._objectsName = 'citations'
  }

  // eslint-disable-next-line class-methods-use-this
  get _supportsMerge() {
    return true
  }

  get _fetchUrl() {
    return '/api/citations/?extend=source_handle&keys=gramps_id,extended,page,change,handle'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `citation/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_citation'
  }

  get filterDefinitions() {
    const _ = s => this._(s)
    return [
      textFilter(_, {label: 'Page', rule: 'MatchesPageSubstringOf'}),
      textFilter(_, {
        label: 'Source: Title',
        rule: 'HasSource',
        numArgs: 4,
      }),
      associationsFilter(_, filterCounts.citations),
      tagFilter(_),
      privacyFilter(_, {rule: 'CitationPrivate'}),
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      sourceTitle: row.extended.source?.title,
      page: row.page,
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
    return formattedRow
  }
}

window.customElements.define('grampsjs-view-citations', GrampsjsViewCitations)
