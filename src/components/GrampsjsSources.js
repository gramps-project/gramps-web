import { html } from 'lit';

import { GrampsjsEditableTable } from './GrampsjsEditableTable.js';
import { fireEvent } from '../util.js';

export class GrampsjsSources extends GrampsjsEditableTable {
  constructor() {
    super();
    this.objType = 'Source';
    this._columns = ['Title', 'Author', 'Abbreviation'];
  }

  row(obj, i, arr) {
    return html`
      <tr @click=${() => this._handleClick(obj.gramps_id)}>
        <td>${obj.title}</td>
        <td>${obj.author}</td>
        <td>${obj.abbrev}</td>
      </tr>
    `;
  }

  _handleClick(grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', { path: this._getItemPath(grampsId) });
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `source/${grampsId}`;
  }
}

window.customElements.define('grampsjs-sources', GrampsjsSources);
