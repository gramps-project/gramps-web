/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-textfield'
import '@material/mwc-icon-button'
import '@material/mwc-icon'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsFormString.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

export const userRoles = {
  '-2': 'unconfirmed',
  '-1': 'disabled',
  0: 'Guest',
  1: 'Member',
  2: 'Contributor',
  3: 'Editor',
  4: 'Owner',
  5: 'Administrator',
}

class GrampsjsFormUser extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-textfield.fullwidth {
          width: 100%;
        }

        .hide {
          display: none;
        }

        mwc-icon-button {
          color: rgba(0, 0, 0, 0.5);
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      ismulti: {type: Boolean},
      isFormValid: {type: Boolean},
      newUser: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.ismulti = false
    this.isFormValid = false
    this.newUser = false
  }

  render() {
    return html`
      <p>
        <grampsjs-form-string
          required
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="name"
          ?hidden="${!this.newUser}"
          label="${this._('Username: ').replace(':', '')}"
          value="${this.data.name || ''}"
        ></grampsjs-form-string>
      </p>
      ${this.newUser
        ? html`
            <p>
              <grampsjs-form-string
                required
                @formdata:changed="${this._handleFormData}"
                fullwidth
                id="password"
                type="password"
                label="${this._('Password: ').replace(':', '')}"
                value="${this.data.password || ''}"
              ></grampsjs-form-string>
            </p>
          `
        : ''}
      <p>
        <grampsjs-form-string
          required
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="full_name"
          label="${this._('Full Name')}"
          value="${this.data.full_name || ''}"
        ></grampsjs-form-string>
      </p>
      <p>
        <grampsjs-form-string
          required
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="email"
          label="${this._('E-mail')}"
          type="email"
          value="${this.data.email || ''}"
        ></grampsjs-form-string>
      </p>
      <p>
        <mwc-select
          fixedMenuPosition
          @selected="${this._handleRoleChange}"
          id="role"
          style="width: 100%;"
        >
          ${Object.keys(userRoles)
            .map(Number)
            .sort((a, b) => a - b)
            .filter(x => x <= 4 || this.ismulti)
            .map(
              role => html`
                <mwc-list-item
                  value="${role}"
                  ?selected="${this.data.role === undefined
                    ? role === 0
                    : role === this.data.role}"
                  >${this._(userRoles[role])}
                </mwc-list-item>
              `
            )}
        </mwc-select>
      </p>
    `
  }

  reset() {
    this.shadowRoot
      .querySelectorAll('grampsjs-form-string')
      .forEach(element => element.reset())
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    this.data = {...this.data, [originalTarget.id]: e.detail.data}
    e.stopPropagation()
    this._checkFormValid()
  }

  _handleRoleChange(e) {
    const i = e.detail.index
    const roleKeys = Object.keys(userRoles)
      .map(Number)
      .sort((a, b) => a - b)
    const role = roleKeys[i]
    this.data = {...this.data, role}
    this._checkFormValid()
  }

  _checkFormValid() {
    const fields = Array.from(
      this.shadowRoot.querySelectorAll('grampsjs-form-string')
    )
    this.isFormValid = fields.every(el => el.isValid())
  }
}

window.customElements.define('grampsjs-form-user', GrampsjsFormUser)
