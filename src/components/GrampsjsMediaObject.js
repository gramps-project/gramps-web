/* eslint-disable no-nested-ternary */
import {html, css} from 'lit'

import {
  mdiClose,
  mdiDelete,
  mdiPencil,
  mdiSelectDrag,
  mdiSelectOff,
  mdiTextRecognition,
} from '@mdi/js'
import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsImg.js'
import './GrampsjsFormEditDate.js'
import './GrampsjsFormEditTitle.js'
import './GrampsjsFormEditMapLayer.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFaces.js'
import './GrampsjsTextRecognition.js'
import {
  emptyDate,
  fireEvent,
  getMediaRegions,
  mediaRegionObjectTypes,
  objectIconPath,
  rectEqual,
} from '../util.js'
import {renderIconSvg} from '../icons.js'
import {iconButtonColorStyles} from '../SharedStyles.js'
import './GrampsjsIcon.js'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'

export class GrampsjsMediaObject extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      iconButtonColorStyles,
      css`
        :host {
        }

        /* .edit sets color, which does not reach the slotted icon */
        md-icon-button.edit {
          --grampsjs-icon-button-color: var(--mdc-theme-secondary);
        }

        grampsjs-img {
          margin: 30px 0;
        }

        grampsjs-rect-container {
          display: block;
          margin: 30px 0;
        }

        grampsjs-rect-container grampsjs-img {
          margin: 0;
        }

        dl::after {
          content: '';
          display: block;
          clear: both;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 1em;
        }

        .controls grampsjs-form-select-object {
          margin-right: 8px;
        }

        .hidden {
          visibility: hidden;
        }

        .ocr {
          padding: 1em 1em;
          border-radius: 16px;
          background-color: var(--grampsjs-color-shade-230);
        }

        .close-icon {
          float: right;
          size: 12px;
          margin-right: -0.5em;
          margin-top: -0.5em;
          --grampsjs-icon-button-color: var(--mdc-theme-primary);
        }
      `,
    ]
  }

  static get properties() {
    return {
      selectedRect: {type: Object},
      deletedRects: {type: Array},
      bbox: {type: Object},
      dbInfo: {type: Object},
      _drawing: {type: Boolean},
      _ocr: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._objectsName = 'Media Objects'
    this._objectEndpoint = 'media'
    this._objectIcon = objectIconPath.media
    this.selectedRect = {}
    this.deletedRects = []
    this.bbox = {}
    this.dbInfo = {}
    this._drawing = false
    this._ocr = false
    this._handleKeyDown = this._handleKeyDown.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this._handleKeyDown)
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._handleKeyDown)
    super.disconnectedCallback()
  }

  // Escape clears the selection and leaves draw mode. An Escape handled
  // elsewhere, e.g. by a dialog or by cancelling a drag, is ignored.
  _handleKeyDown(e) {
    if (e.key !== 'Escape' || e.defaultPrevented) return
    if (!this.edit || (!this.selectedRect.rect && !this._drawing)) return
    if (e.composedPath().some(el => el.localName === 'md-dialog')) return
    this.selectedRect = {}
    this._drawing = false
  }

  renderProfile() {
    return html`
      <h2>
        ${this.data.desc || this._('Media Object')}
        ${this.edit
          ? html`
              <md-icon-button
                class="edit"
                aria-label="${this._('Edit')}"
                @click="${this._handleEditTitle}"
              >
                <grampsjs-icon
                  path="${mdiPencil}"
                  color="currentColor"
                ></grampsjs-icon>
              </md-icon-button>
            `
          : ''}
      </h2>

      <dl>
        ${this.data?.profile?.date || this.edit
          ? html`
              <div>
                <dt>${this._('Date')}</dt>
                <dd>${this.data.profile.date}</dd>
              </div>
              ${this.edit
                ? html`
                    <md-icon-button
                      class="edit"
                      aria-label="${this._('Edit')}"
                      @click="${this._handleEditDate}"
                    >
                      <grampsjs-icon
                        path="${mdiPencil}"
                        color="currentColor"
                      ></grampsjs-icon>
                    </md-icon-button>
                  `
                : ''}
            `
          : ''}
      </dl>

      ${!this.data?.mime?.startsWith('image')
        ? this._renderNoImage()
        : this.edit
        ? this._renderImageEdit()
        : this._renderImageNoEdit()}
      ${this._ocr ? this._renderOcr() : ''}
      ${this.preview
        ? ''
        : html`<grampsjs-view-media-lightbox
            id="obj-lightbox-view"
            @rect:clicked="${this._handleRectClick}"
            handle="${this.data.handle}"
            hideLeftArrow
            hideRightArrow
            active
            .appState="${this.appState}"
          >
          </grampsjs-view-media-lightbox>`}
    `
  }

  _renderImageEdit() {
    const selected = this.selectedRect
    const noSelection = !selected.rect
    const regions = this._getRectangles()
    return html`
      <div class="controls">
        <grampsjs-form-select-object
          fixedMenuPosition
          objectType="${mediaRegionObjectTypes.join(',')}"
          .appState="${this.appState}"
          id="region-select"
          label="${this._('Link')}"
          ?disabled="${noSelection}"
          class="edit"
          @select-object:changed="${this._handleRegionLink}"
        ></grampsjs-form-select-object>
        <md-icon-button
          class="edit"
          aria-label="${this._('Delete')}"
          ?disabled="${noSelection}"
          @click="${this._handleRegionDelete}"
        >
          <grampsjs-icon
            path="${mdiDelete}"
            color="currentColor"
          ></grampsjs-icon>
        </md-icon-button>
        <md-icon-button
          class="edit"
          aria-label="${this._('Clear selection')}"
          ?disabled="${noSelection && !this._drawing}"
          @click="${this._handleRegionDeselect}"
        >
          <grampsjs-icon
            path="${mdiSelectOff}"
            color="currentColor"
          ></grampsjs-icon>
        </md-icon-button>
        <md-icon-button
          class="edit"
          aria-label="${this._('Draw a selection')}"
          ?disabled="${this._drawing}"
          @click="${this._handleEnableDraw}"
        >
          <grampsjs-icon
            path="${mdiSelectDrag}"
            color="currentColor"
          ></grampsjs-icon>
        </md-icon-button>
      </div>

      <grampsjs-rect-container
        .appState="${this.appState}"
        ?draw="${this._drawing}"
        @rect:draw="${this._handleDrawRect}"
        @rect:modify="${this._handleModifyRect}"
        @rect:modify-end="${this._handleModifyRectEnd}"
      >
        <grampsjs-img
          slot="image"
          handle="${this.data.handle}"
          size="1000"
          border
          mime="${this.data.mime}"
          checksum="${this.data.checksum}"
        ></grampsjs-img>
        <grampsjs-faces
          handle="${this.data.handle}"
          ?rectHidden="${this._drawing}"
          .hiddenRects="${[
            ...this.deletedRects,
            ...regions.map(obj => obj.rect),
            ...(selected.rect ? [selected.rect] : []),
          ]}"
          .appState="${this.appState}"
          @rect:selected="${this._handleRectSelected}"
        ></grampsjs-faces>
        ${this._drawing
          ? ''
          : regions
              .filter(obj => !this._isSelectedRegion(obj))
              .map(
                obj => html`
                  <grampsjs-rect
                    .rect="${obj.rect}"
                    label="${obj.label}"
                    type="${obj.type}"
                    target="${obj.type}/${obj.grampsId}"
                    @rect:clicked="${e => this._handleRegionClicked(e, obj)}"
                  >
                  </grampsjs-rect>
                `
              )}
        ${selected.rect
          ? html`<grampsjs-rect
              selected
              editable
              .rect="${selected.rect}"
              label="${selected.label ?? ''}"
              type="${selected.type ?? ''}"
              target=""
              @rect:clicked="${e => e.stopPropagation()}"
            >
            </grampsjs-rect>`
          : ''}
      </grampsjs-rect-container>

      ${this._renderReplaceFile()}
    `
  }

  _renderReplaceFile() {
    return html`
      <p>
        <grampsjs-form-upload
          @formdata:changed="${this._handleFormData}"
          preview
          id="upload"
          label="${this._('Replace file')}"
          class="edit"
          .appState="${this.appState}"
        ></grampsjs-form-upload>
      </p>
    `
  }

  _handleFormData(e) {
    fireEvent(this, 'file:replace', {...e.detail, handle: this.data.handle})
    e.stopPropagation()
    e.preventDefault()
    const upload = this.renderRoot.getElementById('upload')
    if (upload) {
      upload.reset()
    }
  }

  _renderNoImage() {
    return html`
      <grampsjs-img
        handle="${this.data.handle}"
        size="1000"
        class="link"
        border
        mime="${this.data.mime}"
        checksum="${this.data.checksum}"
        @click=${this._handleClick}
      ></grampsjs-img>

      ${this.edit ? this._renderReplaceFile() : ''}
    `
  }

  _renderImageNoEdit() {
    return html`
      <grampsjs-rect-container
        .appState="${this.appState}"
        @rect:clicked="${this._handleRectClick}"
      >
        <grampsjs-img
          handle="${this.data.handle}"
          size="1000"
          class="link"
          border
          mime="${this.data.mime}"
          checksum="${this.data.checksum}"
          @click=${this._handleClick}
        ></grampsjs-img>

        ${this._getRectangles().map(
          obj => html`
            <grampsjs-rect
              .rect="${obj.rect}"
              label="${obj.label}"
              type="${obj.type}"
              target="${obj.type}/${obj.grampsId}"
            >
            </grampsjs-rect>
          `
        )}
      </grampsjs-rect-container>

      ${this.dbInfo?.server?.ocr
        ? html`
            <p>
              <mwc-button raised @click="${this._handleOcrClick}"
                >${renderIconSvg(
                  mdiTextRecognition,
                  'var(--mdc-theme-on-primary)',
                  0,
                  'icon'
                )}
                ${this._('Text Recognition')}</mwc-button
              >
            </p>
          `
        : ''}
    `
  }

  _handleOcrClick() {
    this._ocr = true
  }

  _handleCloseOcrClick() {
    this._ocr = false
  }

  _renderOcr() {
    return html` <div class="ocr">
      <span class="close-icon">
        <md-icon-button
          aria-label="${this._('Close')}"
          @click="${this._handleCloseOcrClick}"
        >
          <grampsjs-icon
            path="${mdiClose}"
            color="currentColor"
          ></grampsjs-icon>
        </md-icon-button>
      </span>
      <grampsjs-text-recognition
        ?canEdit="${this.appState.permissions.canEdit}"
        .languages="${this.dbInfo?.server?.ocr_languages ?? []}"
        handle="${this.data.handle ?? ''}"
        .appState="${this.appState}"
      ></grampsjs-text-recognition>
    </div>`
  }

  _handleRegionDeselect(e) {
    this.selectedRect = {}
    this._drawing = false
    e.stopPropagation()
  }

  _handleEnableDraw(e) {
    this.selectedRect = {}
    this._drawing = true
    e.stopPropagation()
  }

  _handleDrawRect(e) {
    e.stopPropagation()
    this.selectedRect = e.detail.rect ? {rect: e.detail.rect} : {}
  }

  _handleModifyRect(e) {
    e.stopPropagation()
    this.selectedRect = {...this.selectedRect, rect: e.detail.rect}
  }

  // A linked region is saved as soon as it is moved or resized
  _handleModifyRectEnd(e) {
    e.stopPropagation()
    const {rect, original} = e.detail
    const selected = this.selectedRect
    this.selectedRect = {...selected, rect}
    if (!selected.handle || rectEqual(rect, original)) {
      return
    }
    fireEvent(this, 'region:update', {
      objHandle: selected.handle,
      objType: selected.type,
      mediaHandle: this.data.handle,
      oldRect: selected.origRect,
      rect,
    })
    this.selectedRect = {...this.selectedRect, origRect: rect}
  }

  _handleRegionDelete(e) {
    e.stopPropagation()
    const selected = this.selectedRect
    if (!selected.handle) {
      // only hide the suggested or drawn region
      this.deletedRects = [...this.deletedRects, selected.rect]
      this.selectedRect = {}
      return
    }
    this.dialogContent = html`
      <md-dialog open @cancel="${this._handleCancelDialog}">
        <span slot="headline">${this._('Are you sure?')}</span>
        <div slot="content">${this._('This action cannot be undone.')}</div>
        <div slot="actions">
          <md-text-button @click="${this._handleCancelDialog}">
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button
            @click="${() => this._handleRegionDeleteConfirm(selected)}"
          >
            ${this._('Yes')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _handleRegionDeleteConfirm(selected) {
    this.dialogContent = ''
    fireEvent(this, 'rect:delete', {
      objHandle: selected.handle,
      objType: selected.type,
      mediaHandle: this.data.handle,
      rect: selected.origRect,
    })
    this.selectedRect = {}
  }

  _handleRectSelected(e) {
    this.selectedRect = {rect: e.detail}
    e.stopPropagation()
  }

  _handleRegionClicked(e, obj) {
    this.selectedRect = {...obj, origRect: obj.rect}
    e.stopPropagation()
  }

  _isSelectedRegion(obj) {
    const selected = this.selectedRect
    return (
      !!selected.handle &&
      obj.handle === selected.handle &&
      obj.type === selected.type &&
      rectEqual(obj.rect, selected.origRect)
    )
  }

  async _handleRegionLink(e) {
    this._drawing = false
    const [obj] = e.detail.objects
    e.stopPropagation()
    const data = {
      objHandle: obj.handle,
      objType: obj.object_type,
      mediaHandle: this.data.handle,
      rect: this.selectedRect.rect,
      oldHandle: this.selectedRect.handle,
      oldType: this.selectedRect.type,
      oldRect: this.selectedRect.origRect,
    }
    fireEvent(this, 'region:link', data)
    this.selectedRect = {}
  }

  _handleEditTitle() {
    this.dialogContent = html`
      <grampsjs-form-edit-title
        @object:save="${this._handleSaveTitle}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${{desc: this.data?.desc || ''}}
        prop="desc"
      >
      </grampsjs-form-edit-title>
    `
  }

  _handleEditDate() {
    this.dialogContent = html`
    <grampsjs-form-edit-date
      @object:save="${this._handleSaveDate}"
      @object:cancel="${this._handleCancelDialog}"
      .appState="${this.appState}"
      .data=${{date: this.data.date ?? emptyDate}}
    >
    </grampsjs-form-edit-title>
    `
  }

  _handleSaveTitle(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleSaveDate(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEditGeo() {
    this.dialogContent = html`
      <grampsjs-form-edit-map-layer
        @object:save="${this._handleSaveMap}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data="${this.data}"
      ></grampsjs-form-edit-map-layer>
    `
  }

  _getRectangles() {
    return getMediaRegions(this.data)
  }

  _handleSaveMap(e) {
    const attrs = e.detail?.data?.attribute_list || []
    if (attrs.length > 0) {
      fireEvent(this, 'edit:action', {
        action: 'updateProp',
        data: {attribute_list: attrs},
      })
    }
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleClick() {
    const lightBoxView = this.shadowRoot.getElementById('obj-lightbox-view')
    lightBoxView.open()
  }

  _handleRectClick(event) {
    this.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {path: event.detail.target},
      })
    )
  }

  reloadImage() {
    this.renderRoot
      .querySelectorAll(`grampsjs-img`)
      .forEach(img => img.reload())
  }

  updated(changed) {
    if (changed.has('edit')) {
      this.selectedRect = {}
      this.deletedRects = []
      this._drawing = false
    } else if (
      changed.has('data') &&
      this.selectedRect.handle &&
      !this._getRectangles().some(obj => this._isSelectedRegion(obj))
    ) {
      // the selected region was changed or removed
      this.selectedRect = {}
    }
  }
}

window.customElements.define('grampsjs-media-object', GrampsjsMediaObject)
