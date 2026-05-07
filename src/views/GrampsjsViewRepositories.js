/*
Repositories list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp} from '../util.js'
import '../components/GrampsjsFilterTags.js'
import '../components/GrampsjsFilterPrivate.js'
import '../components/GrampsjsFilterText.js'

export class GrampsjsViewRepositories extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      name: {title: 'Name', sort: 'name'},
      type: {title: 'Type', sort: 'type'},
      change: {title: 'Last changed', sort: 'change'},
    }
  }

  // eslint-disable-next-line class-methods-use-this
  get _fetchUrl() {
    return '/api/repositories/?keys=gramps_id,name,type,change'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `repository/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_repository'
  }

  renderFilters() {
    return html`
      <grampsjs-filter-text
        .appState="${this.appState}"
        label="Name"
        rule="MatchesNameSubstringOf"
        .valueIndex=${0}
        .numArgs=${1}
      ></grampsjs-filter-text>

      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>

      <grampsjs-filter-private
        .appState="${this.appState}"
        rule="RepoPrivate"
      ></grampsjs-filter-private>
    `
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
