/*
Sources list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import '../components/GrampsjsFilterText.js'
import '../components/GrampsjsFilterProperties.js'
import '../components/GrampsjsFilterTags.js'
import '../components/GrampsjsFilterPrivate.js'

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

  renderFilters() {
    return html`
      <grampsjs-filter-text
        .appState="${this.appState}"
        label="Title"
        rule="MatchesTitleSubstringOf"
        .valueIndex=${0}
        .numArgs=${1}
      ></grampsjs-filter-text>

      <grampsjs-filter-properties
        hasCount
        .appState="${this.appState}"
        .props="${filterCounts.sources}"
        label="${this._('Associations')}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>

      <grampsjs-filter-private
        .appState="${this.appState}"
        rule="SourcePrivate"
      ></grampsjs-filter-private>
    `
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
