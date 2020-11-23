import { html } from 'lit-element';

import { GrampsjsTableBase } from './GrampsjsTableBase.js';


export class GrampsjsAttributes extends GrampsjsTableBase {
  render() {
    if (Object.keys(this.data).length === 0) {
      return html`hae`
    }
    return html`
    <table>
      <tr>
        <th>${this._("Type")}</th>
        <th>${this._("Value")}</th>
      </tr>
    ${this.data.map(obj => html`
      <tr>
        <td>${obj.type}</td>
        <td>${obj.value}</td>
      </tr>
    </table>
    `)}
    `
  }
}


window.customElements.define('grampsjs-attributes', GrampsjsAttributes);


