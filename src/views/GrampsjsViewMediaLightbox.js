
import {html, css} from 'lit-element'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsLightbox.js'
import '../components/GrampsjsRectContainer.js'
import '../components/GrampsjsRect.js'
import {apiGet} from '../api.js'


export class GrampsjsViewMediaLightbox extends GrampsjsView {
  static get styles() {
    return [
      sharedStyles,
      css`

      :host {
        margin: 0px;
      }
      `
    ]
  }

  static get properties() {
    return {
      handle: {type: String},
      _data: {type: Object},
    }
  }

  constructor() {
    super()
    this._data = {}
  }

  renderContent() {
    return html`
    <grampsjs-lightbox id="gallery-lightbox">
      <div slot="image">
        <grampsjs-rect-container>
          ${this._renderImage()}
          ${this._getRectangles().map(obj => html`
          <grampsjs-rect
            .rect="${obj.rect}"
            label="..."
            target="${obj.type}/${obj.grampsId}"
          >
          </grampsjs-rect>
          `)}
        <grampsjs-rect-container>
      </div>
      <span slot="description">${this._data?.desc || ''}</span>
      <span slot="button">
        <mwc-button unelevated label="${this._('Show Details')}"
         @click="${this._handleButtonClick}">
        </mwc-button>
      </span>
      <span slot="details"></span>
    </grampsjs-lightbox>
    `
  }


  _renderImage() {
    if (Object.keys(this._data).length === 0) {
      return html``
    }
    const {handle, mime} = this._data
    return html`
    <grampsjs-img
      handle="${handle}"
      size="0"
      mime="${mime}"
    ></grampsjs-img>
    `
  }

  _handleButtonClick() {
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
    return `/api/media/${this.handle}?profile=all&backlinks=true&extend=all`
  }

  _updateData() {
    if (this.handle !== undefined && this.handle) {
      this._data = {}
      apiGet(this.getUrl()).then(data => {
        if ('data' in data) {
          this._data = data.data
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getRectangles() {
    const backlinks = this._data?.extended?.backlinks || {}
    if (Object.keys(backlinks).length === 0) {
      return []
    }
    return Object.keys(backlinks).map(key => backlinks[key].map(obj => {
      return {
        rect: obj.media_list.find(mobj => mobj.ref === this._data.handle)?.rect,
        type: key,
        grampsId: obj.gramps_id
      }
    })
    ).flat().filter(obj => obj.rect.length > 0)
  }

}

window.customElements.define('grampsjs-view-media-lightbox', GrampsjsViewMediaLightbox)
