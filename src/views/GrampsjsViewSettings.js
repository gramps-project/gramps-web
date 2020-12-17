import {html} from 'lit-element'

import {GrampsjsViewSettingsOnboarding} from './GrampsjsViewSettingsOnboarding.js'
import {doLogout} from '../api.js'
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

    `
  }
}


window.customElements.define('grampsjs-view-settings', GrampsjsViewSettings)
