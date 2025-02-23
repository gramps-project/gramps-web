/*
Sources list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import '../components/GrampsjsFilterProperties.js'
import '../components/GrampsjsFilterTags.js'

export class GrampsjsViewSources extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      title: {title: 'Title', sort: 'title'},
      author: {title: 'Author', sort: 'author'},
      pubinfo: {title: 'Publication info', sort: 'pubinfo'},
      change: {title: 'Last changed', sort: 'change'},
    }
    this._objectsName = 'sources'
  }

  // eslint-disable-next-line class-methods-use-this
  get _fetchUrl() {
    return '/api/sources/?keys=gramps_id,title,author,pubinfo,change'
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
      <grampsjs-filter-properties
        hasCount
        .appState="${this.appState}"
        .props="${filterCounts.sources}"
        label="${this._('Associations')}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>
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
