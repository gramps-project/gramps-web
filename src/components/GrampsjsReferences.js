import { html } from 'lit-element';

import { GrampsjsTableBase } from './GrampsjsTableBase.js';


export class GrampsjsReferences extends GrampsjsTableBase {
  render() {
    if (Object.keys(this.data).length === 0) {
      return html`hae`
    }
    return html`
    <table>
      <tr>
        <th>${this._("Gramps ID")}</th>
      </tr>
    ${this.data.map(obj => html`
      <tr>
        <td>${obj.gramps_id}</td>
      </tr>
    `)}
    </table>
    <pre>${JSON.stringify(this.data, null, 2)}</pre>
    `
  }
}


window.customElements.define('grampsjs-references', GrampsjsReferences);


