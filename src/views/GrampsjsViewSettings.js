import {html} from 'lit-element'

import {GrampsjsViewSettingsOnboarding} from './GrampsjsViewSettingsOnboarding.js'
import {doLogout, changeOwnDetails, changeOwnPassword} from '../api.js'
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

    `
  }

  renderChangeEmail() {
    return html`
    <p>
      <mwc-textfield
        id="change-email"
        label="${this._('New E-mail')}"
        >
      </mwc-textfield>
    </p>
    <p>
      <mwc-button outlined label="submit" @click="${this._changeEmail}"></mwc-button>
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
      <mwc-button outlined label="submit" @click="${this._changePw}"></mwc-button>
    </p>
    `
  }

  _changeEmail() {
    const form = this.shadowRoot.getElementById('change-email')
    if (!form.value) {
      return
    }
    this.loading = true
    changeOwnDetails({email: form.value}).then(data => {
      this.loading = false
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
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
    changeOwnPassword(formOldPw.value, formNewPw.value).then(data => {
      this.loading = false
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

}

window.customElements.define('grampsjs-view-settings', GrampsjsViewSettings)
