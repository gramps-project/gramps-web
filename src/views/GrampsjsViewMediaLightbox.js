
import {html, css} from 'lit-element'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsLightbox.js'
import '../components/GrampsjsRectContainer.js'
import '../components/GrampsjsRect.js'
import {apiGet, getMediaUrl} from '../api.js'
import {getNameFromProfile} from '../util.js'

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
        font-family: Roboto;
        color: rgba(0, 0, 0, 0.8);
        padding-left: 0.8em;
      }

      `
    ]
  }

  static get properties() {
    return {
      handle: {type: String},
      _data: {type: Object},
      hideLeftArrow: {type: Boolean},
      hideRightArrow: {type: Boolean}
    }
  }

  constructor() {
    super()
    this._data = {}
    this.hideLeftArrow = false
    this.hideRightArrow = false
  }

  renderContent() {
    return html`
    <grampsjs-lightbox id="gallery-lightbox"
      ?hideLeftArrow=${this.hideLeftArrow}
      ?hideRightArrow=${this.hideRightArrow}
      >
      <div slot="image">
        ${this._innerContainerContent()}
      </div>
      <span slot="description">${this._data?.desc || ''} ${this._data?.profile?.date ? html`<span class="date">${this._data?.profile?.date}</span>` : ''}</span>
      <span slot="button">
        <mwc-button unelevated label="${this._('Show Details')}"
         @click="${this._handleButtonClick}">
        </mwc-button>
      </span>
      <span slot="details"></span>
    </grampsjs-lightbox>
    `
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
    return html`
    <object
      data="${getMediaUrl(this._data.handle)}"
      type="application/pdf"
      style="width: 80vw; height: 90vh;"
      @error=${this._pdfErrorHandler}
    >
      ${this._innerContainerContentFile('application/pdf')}
    </object>`
  }


  _pdfErrorHandler() {
    this.dispatchEvent(new CustomEvent('grampsjs:error',
      {bubbles: true, composed: true, detail: {message: 'Failed loading PDF file'}}))
  }

  _innerContainerContentFile() {
    return this._renderImage()
  }

  _innerContainerContentImage() {
    return html`<grampsjs-rect-container>
    ${this._renderImage()}
    ${this._getRectangles().map((obj) => html`
    <grampsjs-rect
      .rect="${obj.rect}"
      label="${obj.label}"
      target="${obj.type}/${obj.grampsId}"
    >
    </grampsjs-rect>
    `)}
  <grampsjs-rect-container>`

  }

  _renderImage() {
    const {handle, mime} = this._data
    return html`
    <grampsjs-img
      handle="${handle}"
      size="2000"
      mime="${mime}"
    ></grampsjs-img>
    `
  }

  _handleButtonClick() {
    const lightBox = this.shadowRoot.getElementById('gallery-lightbox')
    lightBox.open = false
    this.dispatchEvent(new CustomEvent('nav', {
      bubbles: true, composed: true, detail: {
        path: `media/${this._data?.gramps_id}`
      }
    }))
  }


  update(changed) {
    super.update(changed)
    if (changed.has('handle')) {
      this._updateData()
    }
  }

  getUrl() {
    return `/api/media/${this.handle}?locale=${this.strings?.__lang__ || 'en'}&profile=all&backlinks=true&extend=all`
  }

  _updateData() {
    if (this.handle !== undefined && this.handle) {
      this._data = {}
      apiGet(this.getUrl()).then(data => {
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
    return Object.keys(backlinks).map(key => backlinks[key].map((obj, index) => {
      const refs = key in references ? references[key] : []
      const label = refs.length >= index ? getNameFromProfile(refs[index] || {}, key, this.strings) : '...'
      return {
        rect: obj.media_list.find(mobj => mobj.ref === this._data.handle)?.rect,
        type: key,
        label,
        grampsId: obj.gramps_id
      }
    })
    ).flat().filter(obj => obj.rect.length > 0)
  }

}

window.customElements.define('grampsjs-view-media-lightbox', GrampsjsViewMediaLightbox)
