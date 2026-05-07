/*
Medias list view
*/

import {html, css} from 'lit'
import {
  mdiViewList,
  mdiViewGrid,
  mdiSortAscending,
  mdiSortDescending,
} from '@mdi/js'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {
  fireEvent,
  prettyTimeDiffTimestamp,
  filterCounts,
  clickKeyHandler,
} from '../util.js'
import {colorToCss} from '../color.js'
import '../components/GrampsjsFilterProperties.js'
import '../components/GrampsjsFilterMime.js'
import '../components/GrampsjsFilterTags.js'
import '../components/GrampsjsFilterYears.js'
import '../components/GrampsjsFilterPrivate.js'
import '../components/GrampsjsFilterText.js'
import '../components/GrampsjsFilterObjectType.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsTooltip.js'
import '@material/web/select/filled-select'
import '@material/web/select/select-option'

export class GrampsjsViewMediaObjects extends GrampsjsViewObjectsBase {
  static get styles() {
    return [
      super.styles,
      css`
        .controls-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          column-gap: 16px;
          row-gap: 12px;
          padding: 12px 0 4px;
          margin-bottom: 16px;
        }

        .view-switcher {
          display: flex;
          align-items: center;
        }

        .view-switcher mwc-icon-button {
          --mdc-icon-button-size: 40px;
        }

        .sort-control {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sort-control md-filled-select {
          min-width: 180px;
          --md-filled-select-text-field-container-color: transparent;
        }

        grampsjs-filters {
          display: block;
          margin: 28px 0;
        }

        /* Gallery (grid) view */

        .gallery {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(max(100px, 15%), 1fr)
          );
          gap: 4px;
          margin-top: 24px;
        }

        .tile {
          cursor: pointer;
          border-radius: 6px;
          overflow: hidden;
          aspect-ratio: 1;
        }

        .tile grampsjs-img {
          display: block;
          width: 100%;
          height: 100%;
        }

        /* List view */

        .media-list {
          margin-top: 8px;
        }

        .media-list-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 4px;
          border-bottom: 1px solid var(--grampsjs-body-font-color-10);
          cursor: pointer;
        }

        .media-list-item:hover {
          background-color: var(--grampsjs-color-shade-240);
        }

        .media-list-item:focus-visible {
          outline: 2px solid var(--mdc-theme-primary);
          outline-offset: -2px;
          background-color: var(--grampsjs-color-shade-240);
        }

        .media-list-thumb {
          flex-shrink: 0;
          width: 88px;
          height: 88px;
          border-radius: 4px;
          overflow: hidden;
        }

        .media-list-thumb grampsjs-img {
          display: block;
          width: 100%;
          height: 100%;
        }

        .media-list-content {
          flex: 1;
          min-width: 0;
        }

        .media-list-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }

        .media-list-meta {
          color: var(--grampsjs-body-font-color-60);
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }

        .tag-chip {
          display: inline-block;
          border-radius: var(--md-sys-shape-corner-small, 8px);
          padding: 1px 8px;
          font-size: 12px;
          border: 1px solid var(--tag-color);
          color: var(--tag-color);
          background-color: var(--tag-color-bg);
        }
      `,
    ]
  }

  constructor() {
    super()
    this.altView = true
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
    return '/api/media/?keys=gramps_id,mime,desc,change,handle,checksum,extended&extend=tag_list'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `media/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_media'
  }

  renderContent() {
    return html`
      <h2>${this._('Media')}</h2>
      ${this._renderFilter()}
      ${this.altView ? this.renderAltView() : this._renderMediaList()}
      <grampsjs-pagination
        page="${this._page}"
        pages="${this._pages}"
        @page:changed="${this._handlePageChanged}"
        .appState="${this.appState}"
      ></grampsjs-pagination>
      ${this.canAdd ? this.renderFab() : ''}
    `
  }

  _renderFilter() {
    return html`
      <div class="controls-row">
        <div class="view-switcher">${this._renderViewButton()}</div>
        <div class="sort-control">${this._renderSortControl()}</div>
      </div>
      <grampsjs-filters
        @filters:changed="${this._handleFiltersChanged}"
        .appState="${this.appState}"
        objectType="${this._objectsName}"
        ?errorGql="${this.error}"
      >
        ${this.renderFilters()}
      </grampsjs-filters>
    `
  }

  renderFilters() {
    return html`
      <grampsjs-filter-text
        .appState="${this.appState}"
        label="Title"
        rule="HasMedia"
        .valueIndex=${0}
        .numArgs=${4}
      ></grampsjs-filter-text>

      <grampsjs-filter-years
        .appState="${this.appState}"
        dateIndex="3"
        numArgs="4"
        label="${this._('Date')}"
        rule="HasMedia"
      ></grampsjs-filter-years>

      <grampsjs-filter-mime .appState="${this.appState}"></grampsjs-filter-mime>

      <grampsjs-filter-properties
        hasCount
        .appState="${this.appState}"
        .props="${filterCounts.media}"
        label="${this._('Associations')}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>

      <grampsjs-filter-object-type
        .appState="${this.appState}"
      ></grampsjs-filter-object-type>

      <grampsjs-filter-private
        .appState="${this.appState}"
        rule="MediaPrivate"
      ></grampsjs-filter-private>
    `
  }

  renderAltView() {
    return html`
      <div class="gallery">
        ${this._rawData.map(row => this._renderTile(row))}
      </div>
    `
  }

  _renderMediaList() {
    return html`
      <div class="media-list">
        ${this._rawData.map(row => this._renderMediaListItem(row))}
      </div>
    `
  }

  _renderMediaListItem(row) {
    if (!row) {
      return ''
    }
    return html`
      <div
        class="media-list-item"
        role="button"
        tabindex="0"
        @click="${() =>
          fireEvent(this, 'nav', {path: `media/${row.gramps_id}`})}"
        @keydown="${clickKeyHandler}"
      >
        <div class="media-list-thumb">
          <grampsjs-img
            handle="${row.handle}"
            size="100"
            square
            mime="${row.mime}"
            checksum="${row.checksum}"
          ></grampsjs-img>
        </div>
        <div class="media-list-content">
          <div class="media-list-title">${row.desc || row.gramps_id}</div>
          <div class="media-list-meta">${row.mime}</div>
          <div class="media-list-meta">${row.gramps_id}</div>
          <div class="media-list-meta">
            ${prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang)}
          </div>
          ${row.extended?.tags?.length
            ? html`<div class="tags-row">
                ${row.extended.tags.map(
                  tag => html`<span
                    class="tag-chip"
                    style="--tag-color:${colorToCss(
                      tag.color
                    )};--tag-color-bg:${colorToCss(tag.color, 0.1)}"
                    >${tag.name}</span
                  >`
                )}
              </div>`
            : ''}
        </div>
      </div>
    `
  }

  _renderSortControl() {
    const sortKey = this._sort ? this._sort.substring(1) : 'change'
    const isAscending = this._sort.startsWith('+')
    const iconColor = 'var(--grampsjs-color-icon-selected)'
    return html`
      <md-filled-select
        label="${this._('Sort by')}"
        @change="${this._handleSortKeyChange}"
      >
        ${Object.entries(this._columns)
          .filter(([, col]) => col.sort)
          .map(
            ([, col]) => html`
              <md-select-option
                value="${col.sort}"
                ?selected="${sortKey === col.sort}"
              >
                ${this._(col.title)}
              </md-select-option>
            `
          )}
      </md-filled-select>
      <mwc-icon-button
        id="btn-sort-direction"
        aria-label="${isAscending ? this._('Ascending') : this._('Descending')}"
        @click="${this._toggleSortDirection}"
      >
        <grampsjs-icon
          path="${isAscending ? mdiSortAscending : mdiSortDescending}"
          height="24"
          color="${iconColor}"
        ></grampsjs-icon>
      </mwc-icon-button>
      <grampsjs-tooltip for="btn-sort-direction" .appState="${this.appState}">
        ${isAscending ? this._('Ascending') : this._('Descending')}
      </grampsjs-tooltip>
    `
  }

  _handleSortKeyChange(e) {
    this._page = 1
    const direction = this._sort.startsWith('-') ? '-' : '+'
    this._sort = `${direction}${e.target.value}`
  }

  _toggleSortDirection() {
    this._page = 1
    const direction = this._sort.startsWith('+') ? '-' : '+'
    this._sort = `${direction}${this._sort.substring(1)}`
  }

  _renderTile(row) {
    if (!row) {
      return ''
    }
    return html`
      <div class="tile">
        <grampsjs-img
          handle="${row.handle}"
          size="300"
          square
          mime="${row.mime}"
          checksum="${row.checksum}"
          @click="${() => this._handleImageClick(row)}"
        ></grampsjs-img>
      </div>
    `
  }

  _handleImageClick(row) {
    fireEvent(this, 'nav', {path: `media/${row.gramps_id}`})
  }

  _renderViewButton() {
    const activeColor = 'var(--grampsjs-color-icon-selected)'
    const inactiveColor = 'var(--grampsjs-color-icon-default)'
    return html`
      <mwc-icon-button
        id="btn-view-grid"
        aria-label="${this._('Gallery view')}"
        @click="${() => {
          this.altView = true
        }}"
      >
        <grampsjs-icon
          path="${mdiViewGrid}"
          height="28"
          color="${this.altView ? activeColor : inactiveColor}"
        ></grampsjs-icon>
      </mwc-icon-button>
      <grampsjs-tooltip for="btn-view-grid" .appState="${this.appState}">
        ${this._('Gallery view')}
      </grampsjs-tooltip>
      <mwc-icon-button
        id="btn-view-list"
        aria-label="${this._('List view')}"
        @click="${() => {
          this.altView = false
        }}"
      >
        <grampsjs-icon
          path="${mdiViewList}"
          height="28"
          color="${!this.altView ? activeColor : inactiveColor}"
        ></grampsjs-icon>
      </mwc-icon-button>
      <grampsjs-tooltip for="btn-view-list" .appState="${this.appState}">
        ${this._('List view')}
      </grampsjs-tooltip>
    `
  }

  get canAdd() {
    // to add a media object, we need edit permissions since we first upload a file,
    // then add metadata
    return this.appState.permissions.canAdd && this.appState.permissions.canEdit
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    return {
      grampsId: row.gramps_id,
      mime: row.mime,
      desc: row.desc,
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
  }
}

window.customElements.define(
  'grampsjs-view-media-objects',
  GrampsjsViewMediaObjects
)
