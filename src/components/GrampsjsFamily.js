import { html, css } from 'lit-element';
import { GrampsjsObject } from './GrampsjsObject.js'
import { ringsIcon } from '../icons.js'


export class GrampsjsFamily extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }
    `];
  }

  renderProfile() {
    return html`
    <h2>${this._displayName()}</h2>
    ${this._renderRelType()}
    ${this._renderMarriage()}
    ${this._renderDivorce()}
    `
  }

  _displayName() {
    return html`
    ${this.data?.profile?.father?.name_given || '…'}
    ${this.data?.profile?.father?.name_surname || '…'}
    &amp;
    ${this.data?.profile?.mother?.name_given || '…'}
    ${this.data?.profile?.mother?.name_surname || '…'}
    `
  }

  _renderRelType() {
    if (!this.data?.type || !this.data?.profile?.relationship) {
      return ''
    }
    return html`
    <p>
    ${this._("Relationship type:")} ${this.data.profile.relationship}
    </p>
    `
  }

  _renderMarriage() {
    const obj = this.data?.profile?.marriage
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    return html`
    <span class="event">
      <i>${ringsIcon}</i>
      ${obj.date || ''}
      ${obj.place ? this._('in') : ''}
      ${obj.place || ''}
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
      ${obj.date || ''}
      ${obj.place ? this._('in') : ''}
      ${obj.place || ''}
    </span>
    `
  }

}


window.customElements.define('grampsjs-family', GrampsjsFamily);
