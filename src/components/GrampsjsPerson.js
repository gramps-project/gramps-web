import { html, css } from 'lit-element';

import '@material/mwc-icon'

import { GrampsjsObject } from './GrampsjsObject.js'
import { asteriskIcon, crossIcon } from '../icons.js'
import './GrampsJsImage.js'


export class GrampsjsPerson extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
      .event {
        margin-right: 1.5em;
      }
    `];
  }

  renderProfile() {
    return html`
    <h2>${this._displayName()}</h2>
    ${this._renderBirth()}
    ${this._renderDeath()}
    `;
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
    const obj = this.data.profile.birth
    if (Object.keys(obj).length === 0) {
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
    const obj = this.data.profile.death
    if (Object.keys(obj).length === 0) {
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

}


window.customElements.define('grampsjs-person', GrampsjsPerson);
