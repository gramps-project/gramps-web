/*
Citations list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import '../components/GrampsjsFilterProperties.js'
import '../components/GrampsjsFilterTags.js'

export class GrampsjsViewCitations extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      sourceTitle: {title: 'Source: Title', sort: ''},
      change: {title: 'Last changed', sort: 'change'},
    }
    this._objectsName = 'citations'
  }

  // eslint-disable-next-line class-methods-use-this
  get _fetchUrl() {
    return '/api/citations/?extend=source_handle&keys=gramps_id,extended,change'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `citation/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_citation'
  }

  renderFilters() {
    return html`
      <grampsjs-filter-properties
        hasCount
        .strings="${this.strings}"
        .filters="${this.filters}"
        .props="${filterCounts.citations}"
        label="${this._('Associations')}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags
        .strings="${this.strings}"
        .filters="${this.filters}"
      ></grampsjs-filter-tags>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      sourceTitle: row.extended.source?.title,
      change: prettyTimeDiffTimestamp(row.change, this.strings.__lang__),
    }
    return formattedRow
  }
}

window.customElements.define('grampsjs-view-citations', GrampsjsViewCitations)
