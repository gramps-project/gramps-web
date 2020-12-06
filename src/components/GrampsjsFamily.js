import { html, css } from 'lit-element';
import { GrampsjsObject } from './GrampsjsObject.js'
import { asteriskIcon, crossIcon, ringsIcon } from '../icons.js'


function _renderPerson(obj) {
  return html`
  <span class="event">
  ${obj.name_given || '…'}
  ${obj.name_surname || '…'}
  </span>
  ${obj?.birth?.date ? html`<span class="event"><i>${asteriskIcon}</i> ${obj.birth.date}` : ''}
  ${obj?.death?.date ? html`<span class="event"><i>${crossIcon}</i> ${obj.death.date}` : ''}
  `
}


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
    <h2>${this._renderTitle()}</h2>
    ${this._renderFather()}
    ${this._renderMother()}</p>
    ${this._renderRelType()}
    ${this._renderMarriage()}
    ${this._renderDivorce()}
    `
  }

  _renderTitle() {
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
    <span class="md">${this._("Relationship type:")}</span>
    ${this.data.profile.relationship}
    </p>
    `
  }


  _renderFather() {
    return html`
    <p><span class="md">${this._("Father")}:</span>
    ${_renderPerson(this.data?.profile?.father || {})}
    </p>
    `
  }

  _renderMother() {
    return html`
    <p><span class="md">${this._("Mother")}:</span>
    ${_renderPerson(this.data?.profile?.mother || {})}
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
