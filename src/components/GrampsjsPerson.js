import {html, css} from 'lit-element'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'
import {asteriskIcon, crossIcon} from '../icons.js'
import './GrampsJsImage.js'


export class GrampsjsPerson extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
    `]
  }

  constructor() {
    super()
    this._showReferences = false
  }

  renderProfile() {
    return html`
    <h2><mwc-icon class="inline ${this.data.gender === 1 ? 'male' : 'female'}">person</mwc-icon> ${this._displayName()}</h2>
    ${this._renderBirth()}
    ${this._renderDeath()}
    ${this._renderTreeBtn()}
    `
  }

  _displayName() {
    if (!this.data.profile) {
      return ''
    }
    const surname = this.data.profile.name_surname || html`&hellip;`
    const given = this.data.profile.name_given || html`&hellip;`
    return html`${given} ${surname}`
  }

  _renderBirth() {
    const obj = this.data?.profile?.birth
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    return html`
    <span class="event">
      <i>${asteriskIcon}</i>
      ${obj.date || ''}
      ${obj.place ? this._('in') : ''}
      ${obj.place || ''}
    </span>
    `
  }

  _renderDeath() {
    const obj = this.data?.profile?.death
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    return html`
    <span class="event">
    <i>${crossIcon}</i>
    ${obj.date || ''}
      ${obj.place ? this._('in') : ''}
      ${obj.place || ''}
    </event>
    `
  }

  _renderTreeBtn() {
    return html`
    <p>
    <mwc-button
      outlined
      label="${this._('Show in tree')}"
      @click="${this._handleButtonClick}">
    </mwc-button>
    </p>`
  }

  _handleButtonClick() {
    this.dispatchEvent(new CustomEvent('pedigree:person-selected', {bubbles: true, composed: true, detail: {grampsId: this.data.gramps_id}}))
    this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: 'tree'}}))
  }


}


window.customElements.define('grampsjs-person', GrampsjsPerson)
