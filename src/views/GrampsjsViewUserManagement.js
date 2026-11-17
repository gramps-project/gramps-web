import {css, html} from 'lit'

import '@material/web/select/filled-select'
import '@material/web/select/select-option'

import {GrampsjsView} from './GrampsjsView.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {apiVersionAtLeast, fireEvent} from '../util.js'
import '../components/GrampsjsUsers.js'
import '../components/GrampsjsShareUrl.js'
import '../components/GrampsjsChatPermissions.js'
import '../components/GrampsjsRelogin.js'

export class GrampsjsViewUserManagement extends GrampsjsStaleDataMixin(
  GrampsjsView
) {
  static get styles() {
    return [
      super.styles,
      css`
        grampsjs-share-url {
          --md-icon-button-icon-size: 18px;
          --md-icon-button-state-layer-width: 32px;
          --md-icon-button-state-layer-height: 32px;
          position: relative;
          top: -5px;
          color: var(--grampsjs-body-font-color-40);
        }

        span.url {
          border-radius: 5px;
          border: 1px solid var(--grampsjs-body-font-color-15);
          font-size: 13px;
          padding: 6px 6px;
          color: var(--grampsjs-text-secondary-color);
        }
      `,
    ]
  }

  static get properties() {
    return {
      userData: {type: Array},
      dbInfo: {type: Object},
      _ownName: {type: String},
    }
  }

  constructor() {
    super()
    this.userData = []
    this.dbInfo = {}
    this._ownName = ''
    // retried after signing in again
    this._pendingMerge = null
  }

  // The merge endpoint is new in API 3.26.0.
  get _canMerge() {
    return (
      !!this.appState?.permissions?.canMergeUsers &&
      apiVersionAtLeast(this.dbInfo, 3, 26)
    )
  }

  // eslint-disable-next-line class-methods-use-this
  get _registerUrl() {
    const url = new URL(document.URL)
    const {tree} = this.appState.auth.claims
    return `${url.origin}/register/${tree}`
  }

  renderContent() {
    return html`
      ${this.dbInfo?.server?.chat
        ? html`<grampsjs-chat-permissions
            .appState="${this.appState}"
          ></grampsjs-chat-permissions>`
        : ''}
      ${this.dbInfo?.server?.multi_tree
        ? html` <p>
            ${this._('Registration link')}:
            <span class="url">${this._registerUrl}</span>
            <grampsjs-share-url
              href="${this._registerUrl}"
              .appState="${this.appState}"
            ></grampsjs-share-url>
          </p>`
        : ''}

      <grampsjs-users
        .appState="${this.appState}"
        .data="${this.userData}"
        ?ismulti="${!!this.dbInfo?.server?.multi_tree}"
        ?canmerge="${this._canMerge}"
        ownName="${this._ownName}"
        @user:updated="${this._handleUserChanged}"
        @user:added="${this._handleUserAdded}"
        @user:deleted="${this._handleUserDeleted}"
        @user:added-multiple="${this._handleUsersAdded}"
        @user:merge="${this._handleUserMerge}"
      >
      </grampsjs-users>
      <grampsjs-relogin
        .appState="${this.appState}"
        username="${this._ownName}"
        @relogin="${this._handleRelogin}"
      ></grampsjs-relogin>
    `
  }

  firstUpdated() {
    this._fetchUserData()
    this._fetchOwnName()
  }

  async _fetchOwnName() {
    const res = await this.appState.apiGet('/api/users/-/')
    this._ownName = res?.data?.name ?? ''
  }

  // Merging needs a fresh token.
  _handleUserMerge(e) {
    const {source, target} = e.detail
    if (this.appState.auth.isTokenFresh()) {
      this._mergeUser(source, target)
      return
    }
    this._pendingMerge = {source, target}
    this.renderRoot.querySelector('grampsjs-relogin').show()
  }

  _handleRelogin() {
    const merge = this._pendingMerge
    this._pendingMerge = null
    if (merge) {
      this._mergeUser(merge.source, merge.target)
    }
  }

  async _mergeUser(source, target) {
    const res = await this.appState.apiPost(
      `/api/users/${encodeURIComponent(target)}/merge/`,
      {source},
      {dbChanged: false, requireFresh: true}
    )
    if ('error' in res) {
      fireEvent(this, 'grampsjs:error', {message: res.error})
    } else {
      fireEvent(this, 'grampsjs:notification', {
        message: this._('Users merged'),
      })
    }
    // the list may be out of date, e.g. if a user was deleted meanwhile
    this._fetchUserData()
  }

  // users can be added elsewhere, e.g. by restoring a backup
  handleUpdateStaleData() {
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

  _handleUserDeleted(e) {
    this._deleteUser(e.detail)
  }

  async _handleUsersAdded(e) {
    const res = await this.appState.apiPost('/api/users/', e.detail)
    if ('error' in res) {
      this.error = true
      this._errorMessage = res.error
    } else {
      this.error = false
      this._fetchUserData()
    }
  }

  _updateUser(username, payload) {
    this.appState.apiPut(`/api/users/${username}/`, payload).then(data => {
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
    this.appState.apiPost(`/api/users/${username}/`, payload).then(data => {
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      } else {
        this.error = false
        this._fetchUserData()
      }
    })
  }

  _deleteUser(username) {
    this.appState.apiDelete(`/api/users/${username}/`).then(data => {
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
    this.appState.apiGet('/api/users/').then(data => {
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
