import { LitElement, css, html } from 'lit';

import { sharedStyles } from '../SharedStyles.js';
import { GrampsjsTableBase } from './GrampsjsTableBase.js';


export class GrampsjsAddresses extends GrampsjsTableBase {

  render() {
    if (Object.keys(this.data).length === 0) {
      return html`hae`
    }
    return html`
    <table>
      <tr>
        <th>${this._("Date")}</th>
        <th>${this._("Street")}</th>
        <th>${this._("Locality")}</th>
        <th>${this._("City")}</th>
        <th>${this._("County")}</th>
        <th>${this._("State")}</th>
        <th>${this._("Country")}</th>
      </tr>
    ${this.data.map(obj => html`
      <tr>
        <td>${this._toDate(obj?.date?.dateval)}</td>
        <td>${obj.street}</td>
        <td>${obj.locality}</td>
        <td>${obj.city}</td>
        <td>${obj.county}</td>
        <td>${obj.state}</td>
        <td>${obj.country}</td>
      </tr>
    </table>
    `)}
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _toDate(dateVal) {
    try {
      return `${dateVal[2]}-${dateVal[1]}-${dateVal[0]}`
    } catch {
      return ''
    }
  }
}


window.customElements.define('grampsjs-addresses', GrampsjsAddresses);


