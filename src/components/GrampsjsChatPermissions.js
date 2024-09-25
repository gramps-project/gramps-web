import {css, html} from 'lit'
import '@material/mwc-checkbox'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import {fireEvent} from '../util.js'
import {apiPut} from '../api.js'

// options for min_role_ai
const roleAiOptions = {
  4: 'Owners and administrators',
  3: 'Editor and above',
  2: 'Contributor and above',
  1: 'Member and above',
  0: 'Everybody',
  99: 'Nobody',
}

export class GrampsjsChatPermissions extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      sharedStyles,
      css`
        p {
          padding-bottom: 15px;
        }

        .margin-left {
          margin-left: 1em;
        }

        .hidden {
          visibility: hidden;
        }
      `,
    ]
  }

  renderContent() {
    let minRoleAi = this._data?.data?.min_role_ai ?? 99
    minRoleAi = minRoleAi > 5 ? 99 : minRoleAi
    return html`<p>
      ${this._('User groups allowed to use AI chat:')}
      <md-filled-select
        id="select-role-ai"
        class="margin-left"
        @change="${this._handleChange}"
      >
        ${Object.keys(roleAiOptions).map(
          key => html`
            <md-select-option
              value="${key}"
              ?selected="${`${key}` === `${minRoleAi}`}"
            >
              <div slot="headline">${this._(roleAiOptions[key])}</div>
            </md-select-option>
          `
        )}
      </md-filled-select>
    </p> `
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return html`
      <p>
        ${this._('User groups allowed to use AI chat:')}
        <span class="skeleton margin-left">
          <md-filled-select class="hidden"> </md-filled-select>
        </span>
      </p>
    `
  }

  async _handleChange(event) {
    const minRoleAi = parseInt(event.target.value, 10)
    const payload = {min_role_ai: minRoleAi}
    const data = await apiPut('/api/trees/-', payload)
    if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
    } else {
      fireEvent(this, 'token:refresh', {})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    return '/api/trees/-'
  }
}

window.customElements.define(
  'grampsjs-chat-permissions',
  GrampsjsChatPermissions
)
