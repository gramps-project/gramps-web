import {css, html} from 'lit'

import {mdiGenderFemale, mdiGenderMale} from '@mdi/js'
import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {renderIcon} from '../icons.js'


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

  static get properties() {
    return {
      profile: {type: Array},
      strings: {type: Object},
      highlightId: {type: String}
    }
  }

  constructor() {
    super()
    this.data = []
    this.profile = []
    this.strings = {}
    this.highlightId = ''
  }

  render() {
    if (Object.keys(this.profile).length === 0) {
      return html``
    }
    return html`
    <table class="linked">
      <tr>
        <th></th>
       <th>${this._('Given name')}</th>
        <th>${this._('Birth')}</th>
        <th>${this._('Death')}</th>
        <th>${this._('Age at death')}</th>
      </tr>
    ${this.profile.map((obj, i) => html`
      <tr
      @click=${() => this._handleClick(obj.gramps_id)}
      class="${obj.gramps_id === this.highlightId ? 'highlight' : ''}"
      >
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
    if (grampsId !== this.grampsId) {
      this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: this._getItemPath(grampsId)}}))
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `person/${grampsId}`
  }

}

window.customElements.define('grampsjs-children', GrampsjsChildren)
