import {html} from 'lit-element'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {getName} from '../util.js'


function capitalize(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`
}

export class GrampsjsReferences extends GrampsjsTableBase {
  render() {
    if (this.data.length === 0 || Object.keys(this.data[0]).length === 0) {
      return html``
    }
    return html`
      <table class="linked">
        <tr>
          <th>${this._('Type')}</th>
          <th>${this._('Description')}</th>
        </tr>
      ${Object.keys(this.data[0]).map((type) => this.data[0][type].map((obj) => html`
        <tr @click=${() => this._handleClick(type, obj.gramps_id)}>
          <td>${this._(capitalize(type))}</td>
          <td>${getName(obj, type) || ''}</td>
        </tr>
        `, this),
  this)}
      </table>
      `
  }

  _handleClick(type, grampsId) {
    // only for media, page is not = type
    const page = type === 'media' ? 'mediaobject' : type
    this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {
      path: this._getItemPath(page, grampsId)
    }}))
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(type, grampsId) {
    return `${type}/${grampsId}`
  }

}


window.customElements.define('grampsjs-references', GrampsjsReferences)


