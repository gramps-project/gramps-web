import {css, html} from 'lit'

import '@material/web/select/filled-select'
import '@material/web/select/select-option'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsUsers.js'
import '../components/GrampsjsShareUrl.js'
import '../components/GrampsjsChatPermissions.js'
import {apiPost, apiPut, apiGet, getTreeId} from '../api.js'

export class GrampsjsViewUserManagement extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0 15px;
        }

        grampsjs-share-url {
          --mdc-icon-size: 18px;
          --mdc-icon-button-size: 32px;
          position: relative;
          top: -5px;
          color: rgba(0, 0, 0, 0.4);
        }

        span.url {
          border-radius: 5px;
          border: 1px solid #ddd;
          font-size: 13px;
          padding: 6px 6px;
          color: #444;
        }
      `,
    ]
  }

  static get properties() {
    return {
      userData: {type: Array},
      dbInfo: {type: Object},
    }
  }

  constructor() {
    super()
    this.userData = []
    this.dbInfo = {}
  }

  // eslint-disable-next-line class-methods-use-this
  get _registerUrl() {
    const url = new URL(document.URL)
    const tree = getTreeId()
    return `${url.origin}/register/${tree}`
  }

  renderContent() {
    return html`
      ${this.dbInfo?.server?.chat
        ? html`<grampsjs-chat-permissions
            .strings=${this.strings}
          ></grampsjs-chat-permissions>`
        : ''}
      ${this.dbInfo?.server?.multi_tree
        ? html` <p>
            ${this._('Registration link')}:
            <span class="url">${this._registerUrl}</span>
            <grampsjs-share-url
              href="${this._registerUrl}"
            ></grampsjs-share-url>
          </p>`
        : ''}

      <grampsjs-users
        .strings="${this.strings}"
        .data="${this.userData}"
        ?ismulti="${!!this.dbInfo?.server?.multi_tree}"
        @user:updated="${this._handleUserChanged}"
        @user:added="${this._handleUserAdded}"
        @user:added-multiple="${this._handleUsersAdded}"
      >
      </grampsjs-users>
    `
  }

  firstUpdated() {
    this._fetchUserData()
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

  async _handleUsersAdded(e) {
    const res = await apiPost('/api/users/', e.detail)
    if ('error' in res) {
      this.error = true
      this._errorMessage = res.error
    } else {
      this.error = false
      this._fetchUserData()
    }
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
}

window.customElements.define(
  'grampsjs-view-user-management',
  GrampsjsViewUserManagement
)
