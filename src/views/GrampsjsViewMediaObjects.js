/*
Medias list view
*/

import {html, css} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {fireEvent, prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import '../components/GrampsjsFilterProperties.js'
import '../components/GrampsjsFilterMime.js'
import '../components/GrampsjsFilterTags.js'

export class GrampsjsViewMediaObjects extends GrampsjsViewObjectsBase {
  static get styles() {
    return [
      super.styles,
      css`
        .tile {
          margin: 15px 5px;
          float: left;
          cursor: pointer;
          padding: 5px;
          width: 200px;
          height: 230px;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          position: relative;
        }

        .clear {
          clear: both;
          padding-bottom: 2em;
        }

        .tile span {
          color: var(--grampsjs-body-font-color-60);
          font-size: 15px;
          position: absolute;
          bottom: 0px;
          width: 200px;
          text-overflow: ellipsis;
          overflow: hidden;
        }
      `,
    ]
  }

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
    return '/api/media/?keys=gramps_id,mime,desc,change,handle'
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
      <grampsjs-filter-mime .appState="${this.appState}"></grampsjs-filter-mime>

      <grampsjs-filter-properties
        hasCount
        .appState="${this.appState}"
        .props="${filterCounts.media}"
        label="${this._('Associations')}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>
    `
  }

  renderAltView() {
    return html`
      <div class="clear"></div>
      ${this._rawData.map(row => this._renderTile(row))}
      <div class="clear"></div>
    `
  }

  _renderTile(row) {
    if (!row) {
      return ''
    }
    return html`<div class="tile">
      <grampsjs-img
        handle="${row.handle}"
        size="200"
        displayHeight="200"
        square
        mime="${row.mime}"
        @click="${() => this._handleImageClick(row)}"
      ></grampsjs-img
      ><br /><span>${row.desc}</span>
    </div>`
  }

  _handleImageClick(row) {
    fireEvent(this, 'nav', {path: `media/${row.gramps_id}`})
  }

  _renderViewButton() {
    return html`
      <mwc-icon-button
        icon="${this.altView ? 'list' : 'grid_view'}"
        @click="${this._handleViewBtn}"
      ></mwc-icon-button>
    `
  }

  get canAdd() {
    // to add a media object, we need edit permissions since we first upload a file,
    // then add metadata
    return this.appState.permissions.canAdd && this.appState.permissions.canEdit
  }

  _handleViewBtn() {
    this.altView = !this.altView
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      mime: row.mime,
      desc: row.desc,
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
    return formattedRow
  }
}

window.customElements.define(
  'grampsjs-view-media-objects',
  GrampsjsViewMediaObjects
)
