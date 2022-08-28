import {html} from 'lit'

import '@material/mwc-icon'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'

export class GrampsjsSourceCitations extends GrampsjsEditableTable {
  constructor() {
    super()
    this.objType = 'Citation'
    this._columns = ['Page', 'Source: Title', 'Source: Author', '']
  }

  row(obj, i, arr) {
    return html`
      <tr @click=${() => this._handleClick(obj.gramps_id)}>
        <td>${obj.profile?.page || ''}</td>
        <td>${obj.profile?.source?.title || ''}</td>
        <td>${obj.profile?.source?.author || ''}</td>
        <td>
          ${this.edit
            ? this._renderActionBtns(obj.handle, i === 0, i === arr.length - 1)
            : html`
        ${
          obj?.media_list?.length > 0 || obj?.extended?.source?.media_list > 0
            ? html` <mwc-icon class="inline">photo</mwc-icon>`
            : ''
        }
      ${
        obj?.note_list?.length > 0 || obj?.extended?.source?.note_list > 0
          ? html` <mwc-icon class="inline">sticky_note_2</mwc-icon>`
          : ''
      }</td>
      </tr>`}
        </td>
      </tr>
    `
  }

  _handleClick(grampsId) {
    if (grampsId !== this.grampsId) {
      this.dispatchEvent(
        new CustomEvent('nav', {
          bubbles: true,
          composed: true,
          detail: {path: this._getItemPath(grampsId)},
        })
      )
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `citation/${grampsId}`
  }
}

window.customElements.define(
  'grampsjs-source-citations',
  GrampsjsSourceCitations
)
