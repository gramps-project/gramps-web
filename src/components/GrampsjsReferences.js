import {html} from 'lit-element'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {getName, getNameFromProfile} from '../util.js'


function capitalize(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`
}

export class GrampsjsReferences extends GrampsjsTableBase {

  static get properties() {
    return {
      profile: {type: Object}
    }
  }

  constructor() {
    super()
    this.profile = {}
  }

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
      ${Object.keys(this.data[0]).map((type) => this.data[0][type].map((obj, index) => html`
        <tr @click=${() => this._handleClick(type, obj.gramps_id)}>
          <td>${this._(capitalize(type))}</td>
          <td>${type in this.profile ? getNameFromProfile(this.profile[type][index] || {}, type, this.strings) || '' : getName(obj, type)}</td>
        </tr>
        `, this),
  this)}
      </table>
      `
  }

  _handleClick(type, grampsId) {
    this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {
      path: this._getItemPath(type, grampsId)
    }}))
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(type, grampsId) {
    return `${type}/${grampsId}`
  }

}


window.customElements.define('grampsjs-references', GrampsjsReferences)


