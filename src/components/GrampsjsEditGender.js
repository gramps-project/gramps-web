import {LitElement, html} from 'lit'

import '@material/web/iconbutton/icon-button.js'
import {
  mdiGenderFemale,
  mdiGenderMale,
  mdiGenderNonBinary,
  mdiHelp,
} from '@mdi/js'

import './GrampsjsIcon.js'
import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'

const icons = {
  0: mdiGenderFemale,
  1: mdiGenderMale,
  2: mdiHelp,
  3: mdiGenderNonBinary,
}

export class GrampsjsEditGender extends LitElement {
  static get styles() {
    return [sharedStyles]
  }

  static get properties() {
    return {
      gender: {type: Number},
      edit: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.gender = 2 // unknown
    this.edit = false
  }

  render() {
    if (!this.edit) {
      return ''
    }
    return html`
      <md-icon-button @click="${this._handleClick}" class="edit">
        <grampsjs-icon path="${icons[this.gender]}"></grampsjs-icon>
      </md-icon-button>
    `
  }

  _handleClick() {
    const cycle = {0: 1, 1: 2, 2: 3, 3: 0}
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {gender: cycle[this.gender] ?? 0},
    })
  }
}

window.customElements.define('grampsjs-edit-gender', GrampsjsEditGender)
