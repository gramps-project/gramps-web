/*
Medias list view
*/

import {html, css, nothing} from 'lit'
import {
  mdiViewList,
  mdiViewGrid,
  mdiSortAscending,
  mdiSortDescending,
  mdiCheckboxMultipleOutline,
} from '@mdi/js'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {
  fireEvent,
  prettyTimeDiffTimestamp,
  filterCounts,
  clickKeyHandler,
} from '../util.js'
import {tagColorToCss} from '../color.js'
import {
  associationsFilter,
  mimeFilter,
  objectTypeFilter,
  privacyFilter,
  tagFilter,
  textFilter,
  yearsFilter,
} from '../filterDefinitions.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsTooltip.js'
import './GrampsjsViewMediaLightbox.js'
import '@material/web/select/filled-select'
import '@material/web/select/select-option'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/checkbox/checkbox.js'

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
          position: relative;
          cursor: pointer;
          border-radius: 6px;
          overflow: hidden;
          aspect-ratio: 1;
        }

        .tile:focus-visible {
          outline: 2px solid var(--mdc-theme-primary);
          outline-offset: 2px;
        }

        .tile grampsjs-img {
          display: block;
          width: 100%;
          height: 100%;
          transition: transform 0.1s ease-in-out;
        }

        .tile.selected {
          background-color: var(
            --md-sys-color-secondary-container,
            var(--grampsjs-color-shade-240)
          );
        }

        .tile.selected grampsjs-img {
          transform: scale(0.88);
          border-radius: 4px;
          overflow: hidden;
        }

        .tile-check {
          position: absolute;
          top: 6px;
          left: 6px;
          display: flex;
          border-radius: 4px;
          background-color: var(--grampsjs-color-shade-255);
          pointer-events: none;
        }

        .select-page {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 4px 4px 8px;
          margin-top: 16px;
          font-size: 14px;
          color: var(--grampsjs-body-font-color-70);
        }

        .tile-check md-checkbox,
        .select-page md-checkbox,
        .media-list-item md-checkbox {
          --md-checkbox-outline-color: var(--grampsjs-body-font-color-30);
          --md-checkbox-hover-outline-color: var(--grampsjs-body-font-color-50);
        }

        .media-list-item md-checkbox {
          flex-shrink: 0;
          pointer-events: none;
        }

        .media-list-item.selected {
          background-color: var(
            --md-sys-color-secondary-container,
            var(--grampsjs-color-shade-240)
          );
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

  static get properties() {
    return {
      _lightboxIndex: {type: Number},
    }
  }

  constructor() {
    super()
    // position on the current page of the media shown in the lightbox
    this._lightboxIndex = 0
    // 'first' or 'last' while the lightbox waits for the adjacent page
    this._lightboxPending = null
    this._columns = [
      {name: 'Gramps ID', key: 'grampsId', sortKey: 'gramps_id'},
      {name: 'Type', key: 'mime', sortKey: 'mime'},
      {name: 'Description', key: 'desc', sortKey: 'title'},
      {name: 'Date', key: 'date', sortKey: 'date'},
      {name: 'Last changed', key: 'change', sortKey: 'change'},
    ]
    this._objectsName = 'media'
  }

  get _fetchUrl() {
    return `/api/media/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=self&keys=gramps_id,mime,desc,change,handle,checksum,profile,extended&extend=tag_list`
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
      ${this._selectionMode
        ? html`${this._renderBatchToolbar()}${this._renderSelectPage()}`
        : ''}
      ${this._galleryView ? this.renderAltView() : this._renderMediaList()}
      <grampsjs-pagination
        page="${this._page}"
        pages="${this._pages}"
        total="${this._totalCount}"
        pageSize="${this._pageSize}"
        @page:changed="${this._handlePageChanged}"
        .appState="${this.appState}"
      ></grampsjs-pagination>
      ${this.canAdd ? this.renderFab() : ''}
      <grampsjs-view-media-lightbox
        active
        @lightbox:left="${this._handleLightboxLeft}"
        @lightbox:right="${this._handleLightboxRight}"
        @rect:clicked="${this._handleRectClick}"
        handle="${this._rawData[this._lightboxIndex]?.handle}"
        ?hideLeftArrow="${this._lightboxIndex === 0 && this._page <= 1}"
        ?hideRightArrow="${this._lightboxIndex >= this._rawData.length - 1 &&
        this._page >= this._pages}"
        .appState="${this.appState}"
      ></grampsjs-view-media-lightbox>
    `
  }

  _renderFilter() {
    return html`
      <div class="controls-row">
        <div class="view-switcher">${this._renderViewButton()}</div>
        <div class="sort-control">${this._renderSortControl()}</div>
        ${this.appState.permissions.canEdit ? this._renderSelectButton() : ''}
      </div>
      <grampsjs-filters
        @filters:changed="${this._handleFiltersChanged}"
        .appState="${this.appState}"
        .definitions="${this.filterDefinitions}"
        namespace="${this.filterNamespace}"
        ?errorGql="${this.error}"
      >
      </grampsjs-filters>
    `
  }

  get filterDefinitions() {
    const _ = s => this._(s)
    return [
      textFilter(_, {label: 'Title', rule: 'HasMedia', numArgs: 4}),
      yearsFilter(_, {
        label: 'Date',
        rule: 'HasMedia',
        index: 3,
        numArgs: 4,
      }),
      mimeFilter(_),
      associationsFilter(_, filterCounts.media),
      tagFilter(_),
      objectTypeFilter(_),
      privacyFilter(_, {rule: 'MediaPrivate'}),
    ]
  }

  _renderSelectButton() {
    const icon = color => html`<grampsjs-icon
      slot="icon"
      .path="${mdiCheckboxMultipleOutline}"
      height="20"
      color="${color}"
    ></grampsjs-icon>`
    return this._selectionMode
      ? html`<md-filled-button @click="${this._toggleSelectionMode}">
          ${icon(
            'var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))'
          )}
          ${this._('Select')}
        </md-filled-button>`
      : html`<md-outlined-button @click="${this._toggleSelectionMode}">
          ${icon('var(--mdc-theme-primary)')} ${this._('Select')}
        </md-outlined-button>`
  }

  _renderSelectPage() {
    const selected = this._rawData.filter(row =>
      this._isSelected(row.handle)
    ).length
    return html`
      <div class="select-page">
        <md-checkbox
          ?checked="${selected === this._rawData.length && selected > 0}"
          ?indeterminate="${selected > 0 && selected < this._rawData.length}"
          @change="${this._handleSelectPage}"
          aria-label="${this._('_Select All')}"
        ></md-checkbox>
        <span>${this._('_Select All')}</span>
      </div>
    `
  }

  _isSelected(handle) {
    return this._selectedHandles.includes(handle)
  }

  _selectedIndices() {
    return this._rawData
      .map((row, i) => (this._isSelected(row.handle) ? i : -1))
      .filter(i => i >= 0)
  }

  _toggleSelected(index) {
    const indices = this._selectedIndices()
    this._handleSelectionChanged({
      detail: {
        indices: indices.includes(index)
          ? indices.filter(i => i !== index)
          : [...indices, index],
      },
    })
  }

  _handleSelectPage() {
    const allSelected = this._selectedIndices().length === this._rawData.length
    this._handleSelectionChanged({
      detail: {indices: allSelected ? [] : this._rawData.map((_, i) => i)},
    })
  }

  renderAltView() {
    return html`
      <div class="gallery">
        ${this._rawData.map((row, i) => this._renderTile(row, i))}
      </div>
    `
  }

  _renderMediaList() {
    return html`
      <div class="media-list">
        ${this._rawData.map((row, i) => this._renderMediaListItem(row, i))}
      </div>
    `
  }

  _renderMediaListItem(row, index) {
    if (!row) {
      return ''
    }
    const selected = this._selectionMode && this._isSelected(row.handle)
    return html`
      <div
        class="media-list-item${selected ? ' selected' : ''}"
        role="${this._selectionMode ? 'checkbox' : 'button'}"
        aria-checked="${this._selectionMode ? String(selected) : nothing}"
        tabindex="0"
        @click="${() =>
          this._selectionMode
            ? this._toggleSelected(index)
            : fireEvent(this, 'nav', {path: `media/${row.gramps_id}`})}"
        @keydown="${clickKeyHandler}"
      >
        ${this._selectionMode
          ? html`<md-checkbox
              ?checked="${selected}"
              tabindex="-1"
              aria-hidden="true"
            ></md-checkbox>`
          : ''}
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
          ${row.profile?.date
            ? html`<div class="media-list-meta">${row.profile.date}</div>`
            : ''}
          <div class="media-list-meta">${row.gramps_id}</div>
          <div class="media-list-meta">
            ${this._('Last changed')}:
            ${prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang)}
          </div>
          ${row.extended?.tags?.length
            ? html`<div class="tags-row">
                ${row.extended.tags.map(
                  tag => html`<span
                    class="tag-chip"
                    style="--tag-color:${tagColorToCss(
                      tag.color
                    )};--tag-color-bg:${tagColorToCss(tag.color, 0.1)}"
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
        ${this._columns
          .filter(col => col.sortKey)
          .map(
            col => html`
              <md-select-option
                value="${col.sortKey}"
                ?selected="${sortKey === col.sortKey}"
              >
                ${this._(col.name)}
              </md-select-option>
            `
          )}
      </md-filled-select>
      <md-icon-button
        id="btn-sort-direction"
        aria-label="${isAscending ? this._('Ascending') : this._('Descending')}"
        @click="${this._toggleSortDirection}"
      >
        <grampsjs-icon
          path="${isAscending ? mdiSortAscending : mdiSortDescending}"
          height="24"
          color="${iconColor}"
        ></grampsjs-icon>
      </md-icon-button>
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

  _renderTile(row, index) {
    if (!row) {
      return ''
    }
    const selected = this._selectionMode && this._isSelected(row.handle)
    return html`
      <div
        class="tile${selected ? ' selected' : ''}"
        role="${this._selectionMode ? 'checkbox' : 'button'}"
        aria-checked="${this._selectionMode ? String(selected) : nothing}"
        aria-label="${row.desc || row.gramps_id}"
        tabindex="0"
        @click="${() => this._handleTileClick(index)}"
        @keydown="${clickKeyHandler}"
      >
        <grampsjs-img
          handle="${row.handle}"
          size="300"
          square
          mime="${row.mime}"
          checksum="${row.checksum}"
        ></grampsjs-img>
        ${this._selectionMode
          ? html`<div class="tile-check">
              <md-checkbox
                ?checked="${selected}"
                tabindex="-1"
                aria-hidden="true"
              ></md-checkbox>
            </div>`
          : ''}
      </div>
    `
  }

  _handleTileClick(index) {
    if (this._selectionMode) {
      this._toggleSelected(index)
      return
    }
    this._lightboxIndex = index
    this.renderRoot.querySelector('grampsjs-view-media-lightbox')?.open()
  }

  // At either end of the page, the lightbox moves on to the adjacent page
  _handleLightboxLeft(e) {
    if (e.detail?.id !== 'gallery-lightbox' || this._lightboxPending) return
    if (this._lightboxIndex > 0) {
      this._lightboxIndex -= 1
    } else if (this._page > 1) {
      this._lightboxPending = 'last'
      this._page -= 1
    }
  }

  _handleLightboxRight(e) {
    if (e.detail?.id !== 'gallery-lightbox' || this._lightboxPending) return
    if (this._lightboxIndex < this._rawData.length - 1) {
      this._lightboxIndex += 1
    } else if (this._page < this._pages) {
      this._lightboxPending = 'first'
      this._page += 1
    }
  }

  // Picks the media on a newly loaded page before it renders, so the
  // lightbox never receives the handle at the previous index
  willUpdate(changed) {
    super.willUpdate(changed)
    // the adjacent page has loaded, or failed to load
    if (this._lightboxPending && changed.has('loading') && !this.loading) {
      this._lightboxIndex =
        this._lightboxPending === 'first' ? 0 : this._rawData.length - 1
      this._lightboxPending = null
    }
  }

  _handleRectClick(e) {
    fireEvent(this, 'nav', {path: e.detail.target})
  }

  // the view mode is a setting of the browser, shared by all trees
  get _galleryView() {
    return this.appState?.settings?.mediaView !== 'list'
  }

  _setGalleryView(gallery) {
    this.appState.updateSettings({mediaView: gallery ? 'gallery' : 'list'})
  }

  _renderViewButton() {
    const activeColor = 'var(--grampsjs-color-icon-selected)'
    const inactiveColor = 'var(--grampsjs-color-icon-default)'
    return html`
      <md-icon-button
        id="btn-view-grid"
        aria-label="${this._('Gallery view')}"
        @click="${() => this._setGalleryView(true)}"
      >
        <grampsjs-icon
          path="${mdiViewGrid}"
          height="28"
          color="${this._galleryView ? activeColor : inactiveColor}"
        ></grampsjs-icon>
      </md-icon-button>
      <grampsjs-tooltip for="btn-view-grid" .appState="${this.appState}">
        ${this._('Gallery view')}
      </grampsjs-tooltip>
      <md-icon-button
        id="btn-view-list"
        aria-label="${this._('List view')}"
        @click="${() => this._setGalleryView(false)}"
      >
        <grampsjs-icon
          path="${mdiViewList}"
          height="28"
          color="${!this._galleryView ? activeColor : inactiveColor}"
        ></grampsjs-icon>
      </md-icon-button>
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
