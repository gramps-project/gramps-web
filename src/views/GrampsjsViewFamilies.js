/*
Families list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import '../components/GrampsjsFilterProperties.js'
import '../components/GrampsjsFilterTags.js'

export class GrampsjsViewFamilies extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      father: {title: 'Father', sort: 'surname'},
      mother: {title: 'Mother', sort: ''},
      change: {title: 'Last changed', sort: 'change'},
    }
    this._objectsName = 'families'
  }

  get _fetchUrl() {
    return `/api/families/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=self&keys=gramps_id,profile,change`
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `family/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_family'
  }

  renderFilters() {
    return html`
      <grampsjs-filter-type
        .appState="${this.appState}"
        label="${this._('Relationship type:').replace(':', '')}"
        typeName="family_relation_types"
        rule="HasRelType"
      ></grampsjs-filter-type>

      <grampsjs-filter-properties
        hasCount
        .appState="${this.appState}"
        .props="${filterCounts.families}"
        label="${this._('Associations')}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>
    `
  }

  get canAdd() {
    // to add a family, permissions to edit people is needed too
    return this.appState.permissions.canAdd && this.appState.permissions.canEdit
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      father:
        row?.profile?.father?.name_display ??
        `${row?.profile?.father?.name_surname || '…'}, ${
          row?.profile?.father?.name_given || '…'
        }`,
      mother:
        row?.profile?.mother?.name_display ??
        `${row?.profile?.mother?.name_surname || '…'}, ${
          row?.profile?.mother?.name_given || '…'
        }`,
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
    return formattedRow
  }
}

window.customElements.define('grampsjs-view-families', GrampsjsViewFamilies)
