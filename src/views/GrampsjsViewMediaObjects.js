/*
Medias list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import '../components/GrampsjsFilterProperties.js'
import '../components/GrampsjsFilterTags.js'

export class GrampsjsViewMediaObjects extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      mime: {title: 'Type', sort: 'mime'},
      desc: {title: 'Description', sort: 'title'},
      change: {title: 'Last changed', sort: 'change'},
    }
    this._objectsName = 'media'
  }

  // eslint-disable-next-line class-methods-use-this
  get _fetchUrl() {
    return '/api/media/?keys=gramps_id,mime,desc,change'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `media/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_media'
  }

  renderFilters() {
    return html`
      <grampsjs-filter-properties
        hasCount
        .strings="${this.strings}"
        .filters="${this.filters}"
        .props="${filterCounts.media}"
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
      mime: row.mime,
      desc: row.desc,
      change: prettyTimeDiffTimestamp(row.change, this.strings.__lang__),
    }
    return formattedRow
  }
}

window.customElements.define(
  'grampsjs-view-media-objects',
  GrampsjsViewMediaObjects
)
