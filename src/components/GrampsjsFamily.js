import {html, css} from 'lit'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'
import {ringsIcon} from '../icons.js'
import {renderPerson} from '../util.js'

export class GrampsjsFamily extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }
      `,
    ]
  }

  constructor() {
    super()
    this._showReferences = false
  }

  renderProfile() {
    return html`
      <h2><mwc-icon class="person">people</mwc-icon> ${this._renderTitle()}</h2>
      ${this._renderFather()} ${this._renderMother()}
      <p>
        ${this._renderRelType()} ${this._renderMarriage()}
        ${this._renderDivorce()}
      </p>
    `
  }

  _renderTitle() {
    return html`
      ${this.data?.profile?.father?.name_given || '…'}
      ${this.data?.profile?.father?.name_surname || '…'} &amp;
      ${this.data?.profile?.mother?.name_given || '…'}
      ${this.data?.profile?.mother?.name_surname || '…'}
    `
  }

  _renderRelType() {
    if (!this.data?.type || !this.data?.profile?.relationship) {
      return ''
    }
    return html`
      <span class="event">
        ${this._('Relationship type:')} ${this.data.profile.relationship}
      </span>
    `
  }

  _renderFather() {
    return html` <p>${renderPerson(this.data?.profile?.father || {})}</p> `
  }

  _renderMother() {
    return html` <p>${renderPerson(this.data?.profile?.mother || {})}</p> `
  }

  _renderMarriage() {
    const obj = this.data?.profile?.marriage
    if (!obj?.date && !obj?.place) {
      return ''
    }
    return html`
      <span class="event">
        <i>${ringsIcon}</i>
        ${obj.date || ''} ${obj.place ? this._('in') : ''} ${obj.place || ''}
      </span>
    `
  }

  _renderDivorce() {
    const obj = this.data?.profile?.divorce
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    return html`
      <span class="event">
        <i>oo</i>
        ${obj.date || ''} ${obj.place ? this._('in') : ''} ${obj.place || ''}
      </span>
    `
  }
}

window.customElements.define('grampsjs-family', GrampsjsFamily)
