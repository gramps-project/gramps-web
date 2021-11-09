import {LitElement, html} from 'lit'

import '@material/mwc-icon-button'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'

export class GrampsjsPrivacy extends LitElement {
  static get styles () {
    return [
      sharedStyles
    ]
  }

  static get properties () {
    return {
      private: {type: Boolean},
      edit: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.private = false
    this.edit = false
  }

  render () {
    return html`
    <mwc-icon-button
      icon="${this.private ? 'lock' : 'lock_open'}"
      ?disabled="${!this.edit}"
      @click="${this._handleClick}"
      class="edit"
    ></mwc-icon-button>
    `
  }

  _handleClick (e) {
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {private: !this.private}
    })
  }
}

window.customElements.define('grampsjs-privacy', GrampsjsPrivacy)
