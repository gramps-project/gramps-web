import {html, css} from 'lit'
import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsJsImage.js'
import './GrampsjsFormEditDate.js'
import './GrampsjsFormEditTitle.js'
import {fireEvent} from '../util.js'

import '@material/mwc-dialog'
import '@material/mwc-icon'
import '@material/mwc-icon-button'

export class GrampsjsMediaObject extends GrampsjsObject {
  static get styles () {
    return [
      super.styles,
      css`
      :host {
      }

      grampsjs-img {
        margin: 30px 0;
      }

      dl::after {
        content: "";
        display: block;
        clear: both;
      }
    `]
  }

  renderProfile () {
    return html`
    <h2><mwc-icon>photo</mwc-icon>
    ${this.data.desc || this._('Media Object')}
    ${this.edit
    ? html`
    <mwc-icon-button icon="edit" class="edit" @click="${this._handleEditTitle}"></mwc-icon-button>
    `
    : ''}
    </h2>

    <dl>
    ${this.data?.profile?.date || this.edit
    ? html`
    <div>
      <dt>
        ${this._('Date')}
      </dt>
      <dd>
      ${this.data.profile.date}
      </dd>
    </div>
    ${this.edit
    ? html`
      <mwc-icon-button icon="edit" class="edit" @click="${this._handleEditDate}"></mwc-icon-button>
      `
    : ''}

    `
    : ''}
    </dl>

    <grampsjs-img
      handle="${this.data.handle}"
      size="1000"
      class="link"
      border
      mime="${this.data.mime}"
      @click=${this._handleClick}
    ></grampsjs-img>


    <grampsjs-view-media-lightbox
      id="obj-lightbox-view"
      @rect:clicked="${this._handleRectClick}"
      handle="${this.data.handle}"
      hideLeftArrow
      hideRightArrow
      active
      >
    </grampsjs-view-media-lightbox>

    `
  }

  _handleEditTitle () {
    this.dialogContent = html`
    <grampsjs-form-edit-title
      @object:save="${this._handleSaveTitle}"
      @object:cancel="${this._handleCancelDialog}"
      .strings=${this.strings}
      .data=${{desc: this.data?.desc || ''}}
      prop="desc"
    >
    </grampsjs-form-edit-title>
    `
  }

  _handleEditDate () {
    this.dialogContent = html`
    <grampsjs-form-edit-date
      @object:save="${this._handleSaveDate}"
      @object:cancel="${this._handleCancelDialog}"
      .strings=${this.strings}
      .data=${{date: this.data.date}}
    >
    </grampsjs-form-edit-title>
    `
  }

  _handleSaveTitle (e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleSaveDate (e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleClick () {
    const lightBoxView = this.shadowRoot.getElementById('obj-lightbox-view')
    lightBoxView.open()
  }

  _handleRectClick (event) {
    this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: event.detail.target}}))
  }
}

window.customElements.define('grampsjs-media-object', GrampsjsMediaObject)
