import {html} from 'lit'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {getName, personTitleFromProfile, familyTitleFromProfile} from '../util.js'


export class GrampsjsParticipants extends GrampsjsTableBase {
  render() {
    if (this.data.length === 0 || Object.keys(this.data[0]).length === 0) {
      return html``
    }
    return html`
      <table class="linked">
        <tr>
          <th>${this._('Role')}</th>
          <th>${this._('Name')}</th>
        </tr>
        ${this.data[0].families.map((obj) =>  html`
        <tr @click=${() => this._handleClick('family', obj.family.gramps_id)}>
          <td>${this._(obj.role)}</td>
          <td>${familyTitleFromProfile(obj.family) || ''}</td>
        </tr>
        `,
  this)}
        ${this.data[0].people.map((obj) =>  html`
        <tr @click=${() => this._handleClick('person', obj.person.gramps_id)}>
          <td>${this._(obj.role)}</td>
          <td>${personTitleFromProfile(obj.person) || ''}</td>
        </tr>
        `,
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


window.customElements.define('grampsjs-participants', GrampsjsParticipants)


