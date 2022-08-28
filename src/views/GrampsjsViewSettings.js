import {html} from 'lit'

import {GrampsjsViewSettingsOnboarding} from './GrampsjsViewSettingsOnboarding.js'
import '../components/GrampsjsUsers.js'
import {doLogout, apiPost, apiPut, apiGet} from '../api.js'
import '@material/mwc-textfield'
import '@material/mwc-button'
import '@material/mwc-select'

function renderLogoutButton() {
  return html`
    <mwc-button
      outlined
      class="red"
      label="logout"
      icon="exit_to_app"
      @click=${() => doLogout()}
    ></mwc-button>
  `
}

export class GrampsjsViewSettings extends GrampsjsViewSettingsOnboarding {
  static get properties() {
    return {
      users: {type: Boolean},
      userData: {type: Array},
    }
  }

  constructor() {
    super()
    this.users = false
    this.userData = []
  }

  renderContent() {
    return html`
      <h2>${this._('User settings')}</h2>

      ${renderLogoutButton()}

      <h3>${this._('Select language')}</h3>

      ${this.renderLangSelect()}

      <h3>${this._('Set _Home Person')}</h3>

      ${this.renderPersonSelect()}

      <h3>${this._('Change E-mail')}</h3>

      ${this.renderChangeEmail()}

      <h3>${this._('Change password')}</h3>

      ${this.renderChangePw()}
      ${this.users
        ? html`
            <h2>${this._('Manage users')}</h2>

            <grampsjs-users
              .strings="${this.strings}"
              .data="${this.userData}"
              @user:updated="${this._handleUserChanged}"
              @user:added="${this._handleUserAdded}"
            >
            </grampsjs-users>
          `
        : ''}
    `
  }

  renderChangeEmail() {
    return html`
      <p>
        <mwc-textfield id="change-email" label="${this._('New E-mail')}">
        </mwc-textfield>
      </p>
      <p>
        <mwc-button
          outlined
          label="submit"
          @click="${this._changeEmail}"
        ></mwc-button>
      </p>
    `
  }

  renderChangePw() {
    return html`
      <p>
        <mwc-textfield
          id="old-pw"
          label="${this._('Old password')}"
          type="password"
        >
        </mwc-textfield>
        <mwc-textfield
          id="new-pw"
          label="${this._('New password')}"
          type="password"
        >
        </mwc-textfield>
      </p>
      <p>
        <mwc-button
          outlined
          label="submit"
          @click="${this._changePw}"
        ></mwc-button>
      </p>
    `
  }

  firstUpdated() {
    if (this.users) {
      this._fetchUserData()
    }
  }

  _handleUserChanged(e) {
    const data = e.detail
    this._updateUser(e.detail.name, {
      role: data.role,
      email: data.email,
      full_name: data.full_name,
    })
  }

  _handleUserAdded(e) {
    const data = e.detail
    this._addUser(e.detail.name, {
      role: data.role,
      email: data.email,
      full_name: data.full_name,
      password: data.password,
    })
  }

  _updateUser(username, payload) {
    apiPut(`/api/users/${username}/`, payload).then(data => {
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      } else {
        this.error = false
        this._fetchUserData()
      }
    })
  }

  _addUser(username, payload) {
    apiPost(`/api/users/${username}/`, payload).then(data => {
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      } else {
        this.error = false
        this._fetchUserData()
      }
    })
  }

  _fetchUserData() {
    this.loading = true
    apiGet('/api/users/').then(data => {
      if ('data' in data) {
        this.error = false
        this.userData = data.data
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
      this.loading = false
    })
  }

  _changeEmail() {
    const form = this.shadowRoot.getElementById('change-email')
    if (!form.value) {
      return
    }
    this.loading = true
    const payload = {email: form.value}
    apiPut('/api/users/-/', payload).then(data => {
      this.loading = false
      if ('error' in data) {
        this.error = false
        this.error = true
        this._errorMessage = data.error
      } else {
        this.dispatchEvent(
          new CustomEvent('grampsjs:notification', {
            bubbles: true,
            composed: true,
            detail: {message: 'E-mail successfully updated'},
          })
        )
        form.value = ''
      }
    })
  }

  _changePw() {
    const formOldPw = this.shadowRoot.getElementById('old-pw')
    const formNewPw = this.shadowRoot.getElementById('new-pw')
    if (!formOldPw.value || !formNewPw.value) {
      return
    }
    this.loading = true
    const payload = {
      old_password: formOldPw.value,
      new_password: formNewPw.value,
    }
    apiPost('/api/users/-/password/change', payload).then(data => {
      this.loading = false
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      } else {
        this.error = false
        this.dispatchEvent(
          new CustomEvent('grampsjs:notification', {
            bubbles: true,
            composed: true,
            detail: {message: 'Password successfully updated'},
          })
        )
        formOldPw.value = ''
        formNewPw.value = ''
      }
    })
  }
}

window.customElements.define('grampsjs-view-settings', GrampsjsViewSettings)
