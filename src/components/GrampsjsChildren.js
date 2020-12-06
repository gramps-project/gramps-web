import { css, html } from 'lit-element';

import { GrampsjsTableBase } from './GrampsjsTableBase.js';
import { mdiGenderFemale, mdiGenderMale } from '@mdi/js';
import { renderIcon } from '../icons.js'


function genderIcon(gender) {
  if (gender === 'M') {
    return renderIcon(mdiGenderMale, 'var(--color-boy)')
  }
  if (gender === 'F') {
    return renderIcon(mdiGenderFemale, 'var(--color-girl)')
  }
  return ''
}


export class GrampsjsChildren extends GrampsjsTableBase {
  static get styles() {
    return [
      super.styles,
      css`
      tr:hover td {
        background-color: #f0f0f0;
        cursor: pointer;
      }
    `];
  }

  static get properties() {
    return {
      data: { type: Array },
      profile: { type: Array },
      strings : {type: Object}
    };
  }

  constructor() {
    super();
    this.data = [];
    this.profile = [];
    this.strings = {};
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return html`hae`
    }
    return html`
    <table>
      <tr>
        <th></th>
       <th>${this._("Given name")}</th>
        <th>${this._("Birth")}</th>
        <th>${this._("Death")}</th>
        <th>${this._("Age at death")}</th>
      </tr>
    ${this.data.map((obj, i) => html`
      <tr @click=${() => this._handleClick(obj.gramps_id)}>
        <td>${genderIcon(this.profile[i]?.sex)}</td>
        <td>${this.profile[i]?.name_given || ''}</td>
        <td>${this.profile[i]?.birth?.date || ' '}</td>
        <td>${this.profile[i]?.death?.date || ''}</td>
        <td>${this.profile[i]?.death?.age || ''}</td>
      </tr>
    `)}
    </table>
    `
  }

  _handleClick(grampsId) {
    this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: this._getItemPath(grampsId)}}));
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `person/${grampsId}`
  }

}

window.customElements.define('grampsjs-children', GrampsjsChildren);
