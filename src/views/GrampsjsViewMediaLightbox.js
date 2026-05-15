import {html, css} from 'lit'
import {
  mdiAccount,
  mdiAccountOff,
  mdiDownload,
  mdiMagnifyMinus,
  mdiMagnifyPlus,
} from '@mdi/js'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/filled-button.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsLightbox.js'
import '../components/GrampsjsRectContainer.js'
import '../components/GrampsjsRect.js'
import '../components/GrampsjsTooltip.js'
import '../components/GrampsjsIcon.js'
import {getMediaUrl} from '../api.js'
import {fireEvent, getNameFromProfile} from '../util.js'

export class GrampsjsViewMediaLightbox extends GrampsjsView {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          margin: 0px;
        }

        .date {
          font-size: 0.85em;
          font-weight: 300;
          font-family: var(--grampsjs-body-font-family);
          color: var(--grampsjs-body-font-color);
          padding-left: 0.8em;
        }

        .zoom-wrapper {
          position: relative;
          touch-action: none;
          will-change: transform;
        }

        .pan-overlay {
          position: absolute;
          inset: 0;
          z-index: 10;
          cursor: grab;
        }

        .pan-overlay:active {
          cursor: grabbing;
        }

        object > p {
          margin-left: 2em;
          margin-right: 2em;
          text-align: center;
        }
      `,
    ]
  }

  static get properties() {
    return {
      handle: {type: String},
      _data: {type: Object},
      hideLeftArrow: {type: Boolean},
      hideRightArrow: {type: Boolean},
      editRect: {type: Boolean},
      rectHidden: {type: Boolean},
      _zoom: {type: Number},
    }
  }

  constructor() {
    super()
    this._data = {}
    this.hideLeftArrow = false
    this.hideRightArrow = false
    this.editRect = false
    this.rectHidden = false
    this._zoom = 1
    this._panX = 0
    this._panY = 0
    this._pinchStartDist = null
    this._pinchStartZoom = 1
    this._isDragging = false
    this._dragStartX = 0
    this._dragStartY = 0
    this._dragStartPanX = 0
    this._dragStartPanY = 0
    this._touchPanStartX = 0
    this._touchPanStartY = 0
    this._touchPanStartPanX = 0
    this._touchPanStartPanY = 0
    this._handleDbChanged = this._updateData.bind(this)
  }

  renderContent() {
    return html`
      <grampsjs-lightbox
        id="gallery-lightbox"
        ?hideLeftArrow=${this.hideLeftArrow}
        ?hideRightArrow=${this.hideRightArrow}
      >
        <div slot="image">${this._innerContainerContent()}</div>
        <span slot="description"
          >${this._data?.desc || ''}
          ${this._data?.profile?.date
            ? html`<span class="date">${this._data?.profile?.date}</span>`
            : ''}</span
        >
        <span slot="button">
          <md-icon-button
            id="btn-toggle-rect"
            @click="${this._handleToggleRectButtonClick}"
          >
            <grampsjs-icon
              path="${this.rectHidden ? mdiAccount : mdiAccountOff}"
              color="var(--mdc-theme-primary)"
            ></grampsjs-icon>
          </md-icon-button>
          <grampsjs-tooltip for="btn-toggle-rect"
            >${this._('Toggle person outlines')}</grampsjs-tooltip
          >
          <md-icon-button @click="${this._handleZoomIn}">
            <grampsjs-icon
              path="${mdiMagnifyPlus}"
              color="var(--mdc-theme-primary)"
            ></grampsjs-icon>
          </md-icon-button>
          <md-icon-button
            ?disabled="${this._zoom <= 1}"
            @click="${this._handleZoomOut}"
          >
            <grampsjs-icon
              path="${mdiMagnifyMinus}"
              color="var(--mdc-theme-primary)"
            ></grampsjs-icon>
          </md-icon-button>
          <md-icon-button @click="${this._handleDownload}">
            <grampsjs-icon
              path="${mdiDownload}"
              color="var(--mdc-theme-primary)"
            ></grampsjs-icon>
          </md-icon-button>
          <md-filled-button @click="${this._handleButtonClick}">
            ${this._('Show Details')}
          </md-filled-button>
        </span>
        <span slot="details"></span>
      </grampsjs-lightbox>
    `
  }

  open() {
    const lightBox = this.shadowRoot.getElementById('gallery-lightbox')
    if (lightBox) {
      lightBox.open = true
    }
  }

  _innerContainerContent() {
    if (Object.keys(this._data).length === 0) {
      return html``
    }
    const {mime} = this._data
    if (mime.startsWith('image/')) {
      return this._innerContainerContentImage()
    }
    if (mime === 'application/pdf') {
      return this._innerContainerContentPdf()
    }
    return this._innerContainerContentFile()
  }

  _innerContainerContentPdf() {
    return html` <object
      data="${getMediaUrl(this._data.handle)}"
      type="application/pdf"
      title="PDF"
      style="width: 80vw; height: 90vh;"
      @error=${this._pdfErrorHandler}
    >
      <p>
        ${this._(
          'Unfortunately, your browser does not support the display of PDF files. To view the file anyway, you can download it using the button below.'
        )}
      </p>
    </object>`
  }

  _pdfErrorHandler() {
    fireEvent(this, 'grampsjs:error', {message: 'Failed loading PDF file'})
  }

  _innerContainerContentFile() {
    return this._renderImage()
  }

  _innerContainerContentImage() {
    return html`
      <div
        class="zoom-wrapper"
        @wheel="${this._handleWheel}"
        @touchstart="${this._handleTouchStart}"
        @touchmove="${this._handleTouchMove}"
        @touchend="${this._handleTouchEnd}"
      >
        ${this._zoom > 1
          ? html`<div
              class="pan-overlay"
              @pointerdown="${this._handlePointerDown}"
              @pointermove="${this._handlePointerMove}"
              @pointerup="${this._handlePointerUp}"
              @pointerleave="${this._handlePointerUp}"
            ></div>`
          : ''}
        <grampsjs-rect-container
          ?edit="${this.editRect}"
          .appState="${this.appState}"
          @rect:save="${this._handleSaveRect}"
        >
          ${this._renderImage()}
          ${this._getRectangles().map(
            obj => html`
              <grampsjs-rect
                .rect="${obj.rect}"
                .hidden="${this.rectHidden}"
                label="${obj.label}"
                target="${obj.type}/${obj.grampsId}"
              >
              </grampsjs-rect>
            `
          )}
        </grampsjs-rect-container>
      </div>
    `
  }

  _renderImage() {
    const {handle, mime} = this._data
    return html`
      <grampsjs-img
        handle="${handle}"
        size="2000"
        mime="${mime}"
        checksum="${this._data.checksum}"
        slot="image"
      ></grampsjs-img>
    `
  }

  // --- zoom ---

  updated() {
    this._applyTransform()
  }

  _applyTransform() {
    const wrapper = this.shadowRoot?.querySelector('.zoom-wrapper')
    if (wrapper) {
      wrapper.style.transform = `translate(${this._panX}px, ${this._panY}px) scale(${this._zoom})`
    }
  }

  _setZoom(newZoom) {
    this._zoom = Math.max(1, Math.min(10, newZoom))
    if (this._zoom === 1) {
      this._panX = 0
      this._panY = 0
    } else {
      this._clampPan()
    }
    this._applyTransform()
  }

  _clampPan() {
    const maxPanX = ((this._zoom - 1) * window.innerWidth) / 2
    const maxPanY = ((this._zoom - 1) * (window.innerHeight - 70)) / 2
    this._panX = Math.max(-maxPanX, Math.min(maxPanX, this._panX))
    this._panY = Math.max(-maxPanY, Math.min(maxPanY, this._panY))
  }

  _resetZoom() {
    this._zoom = 1
    this._panX = 0
    this._panY = 0
  }

  _handleZoomIn() {
    this._setZoom(this._zoom * 1.5)
  }

  _handleZoomOut() {
    this._setZoom(this._zoom / 1.5)
  }

  _handleWheel(e) {
    e.preventDefault()
    e.stopPropagation()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    this._setZoom(this._zoom * factor)
  }

  _handleTouchStart(e) {
    if (e.touches.length === 2) {
      e.stopPropagation()
      this._pinchStartDist = this._getPinchDist(e)
      this._pinchStartZoom = this._zoom
    } else if (e.touches.length === 1 && this._zoom > 1) {
      e.stopPropagation()
      this._touchPanStartX = e.touches[0].clientX
      this._touchPanStartY = e.touches[0].clientY
      this._touchPanStartPanX = this._panX
      this._touchPanStartPanY = this._panY
    }
  }

  _handleTouchMove(e) {
    if (e.touches.length === 2) {
      e.stopPropagation()
      e.preventDefault()
      if (this._pinchStartDist) {
        const dist = this._getPinchDist(e)
        this._setZoom((this._pinchStartZoom * dist) / this._pinchStartDist)
      }
    } else if (e.touches.length === 1 && this._zoom > 1) {
      e.stopPropagation()
      this._panX =
        this._touchPanStartPanX + (e.touches[0].clientX - this._touchPanStartX)
      this._panY =
        this._touchPanStartPanY + (e.touches[0].clientY - this._touchPanStartY)
      this._clampPan()
      this._applyTransform()
    }
  }

  _handleTouchEnd(e) {
    if (e.touches.length < 2) {
      this._pinchStartDist = null
    }
    if (this._zoom > 1) {
      e.stopPropagation()
    }
  }

  _getPinchDist(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  _handlePointerDown(e) {
    this._isDragging = true
    this._dragStartX = e.clientX
    this._dragStartY = e.clientY
    this._dragStartPanX = this._panX
    this._dragStartPanY = this._panY
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  _handlePointerMove(e) {
    if (!this._isDragging) return
    this._panX = this._dragStartPanX + (e.clientX - this._dragStartX)
    this._panY = this._dragStartPanY + (e.clientY - this._dragStartY)
    this._clampPan()
    this._applyTransform()
  }

  _handlePointerUp() {
    this._isDragging = false
  }

  // --- existing handlers ---

  _handleDownload() {
    window.location.assign(getMediaUrl(this._data.handle, true))
  }

  _handleButtonClick() {
    const lightBox = this.shadowRoot.getElementById('gallery-lightbox')
    lightBox.open = false
    fireEvent(this, 'nav', {path: `media/${this._data?.gramps_id}`})
  }

  _handleToggleRectButtonClick() {
    this.rectHidden = !this.rectHidden
  }

  _handleSaveRect(e) {
    const img = this.shadowRoot.querySelector('grampsjs-img')
    if (img === null) {
      return
    }
    const imgBBox = img.getBBox()
    const refBBox = e.detail.bbox
    const left = Math.max(0, (refBBox.left - imgBBox.left) / imgBBox.width)
    const right = Math.min(1, (refBBox.right - imgBBox.left) / imgBBox.width)
    const top = Math.max(0, (refBBox.top - imgBBox.top) / imgBBox.height)
    const bottom = Math.min(1, (refBBox.bottom - imgBBox.top) / imgBBox.height)
    const rect = [
      Math.round(100 * left),
      Math.round(100 * top),
      Math.round(100 * right),
      Math.round(100 * bottom),
    ]
    if ((rect[2] - rect[0]) * (rect[3] - rect[1]) > 0) {
      const data = {ref: this.handle, rect}
      fireEvent(this, 'edit:action', {action: 'updateMediaRef', data})
    }
  }

  update(changed) {
    super.update(changed)
    if (changed.has('handle')) {
      this._updateData()
      this._resetZoom()
    }
  }

  getUrl() {
    return `/api/media/${this.handle}?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&backlinks=true&extend=all`
  }

  _updateData() {
    if (this.handle !== undefined && this.handle) {
      this._data = {}
      this.appState.apiGet(this.getUrl()).then(data => {
        if ('data' in data) {
          this.error = false
          this._data = data.data
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }

  _getRectangles() {
    const backlinks = this._data?.extended?.backlinks || {}
    const references = this._data?.profile?.references || {}
    if (Object.keys(backlinks).length === 0) {
      return []
    }
    return Object.keys(backlinks)
      .map(key =>
        backlinks[key].map((obj, index) => {
          const refs = key in references ? references[key] : []
          const label =
            refs.length >= index
              ? getNameFromProfile(refs[index] || {}, key)
              : '...'
          return {
            rect: obj?.media_list?.find(mobj => mobj.ref === this._data.handle)
              ?.rect,
            type: key,
            label,
            grampsId: obj.gramps_id,
          }
        })
      )
      .flat()
      .filter(obj => obj.rect?.length > 0)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('db:changed', this._handleDbChanged)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('db:changed', this._handleDbChanged)
  }
}

window.customElements.define(
  'grampsjs-view-media-lightbox',
  GrampsjsViewMediaLightbox
)
