import {html, css, LitElement} from 'lit'

import '@material/mwc-icon-button'
import '@material/mwc-dialog'

import {resizedrag} from '../resizedrag.js'
import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsFormSelectObjectList.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent} from '../util.js'

class GrampsjsRectContainer extends GrampsjsTranslateMixin(LitElement) {
  static get styles () {
    return [
      sharedStyles,
      css`
      #rect-container {
        display: inline-block;
        position: relative;
      }

      #btn {
        position:absolute;
        bottom: 48px;
        right: 10px;
        border-radius:50%;
        background-color: rgba(255, 255, 255, 0.1);
        height:48px;
        width: 48px;
      }

      #box {
        position: fixed;
        left: 45%;
        top: 40%;
        width: 10%;
        height: 20%;
        border-radius: 3px;
        box-shadow: inset 0px 0px 1px 2px white, 0px 0px 1px 2px var(--mdc-theme-secondary);
      }

      `
    ]
  }

  static get properties () {
    return {
      draw: {type: Boolean},
      edit: {type: Boolean},
      bbox: {type: Object}
    }
  }

  constructor () {
    super()
    this.draw = false
    this.edit = false
    this.bbox = {}
  }

  render () {
    return html`
    <div id="rect-container">
      <slot name="image"></slot>
      ${this.edit && this.draw ? '' : html`<slot></slot>`}
      ${this.edit
    ? html`<div id="btn">
      ${this.draw
    ? html`
        <mwc-icon-button icon="save" class="edit" @click="${this._saveHandler}"></mwc-icon>
    `
    : html`
        <mwc-icon-button icon="tag_faces" class="edit" @click="${this._clickHandler}"></mwc-icon>
        `}
        </div>`
    : ''}
      ${this.edit
    ? html`
      <div id="box" style="display:${this.draw ? 'block' : 'none'};">
      </div>
      `
    : ''
}
    </div>
    `
  }

  _clickHandler () {
    this.draw = true
    fireEvent(this, 'rect:draw-start')
    const box = this.shadowRoot.querySelector('#box')
    if (box) {
      resizedrag(box, box, null, (target, x, y) => this._endBox(target, x, y))
    }
  }

  _handleFormData (e) {
    const [handle] = e.detail.data
    if (handle) {
      this._person = handle
    }
  }

  _saveHandler () {
    this.draw = false
    fireEvent(this, 'rect:draw-end')
    fireEvent(this, 'rect:save', {bbox: this.bbox})
  }

  _endBox (target, x, y) {
    this.bbox = target.getBoundingClientRect()
  }
}

window.customElements.define('grampsjs-rect-container', GrampsjsRectContainer)
