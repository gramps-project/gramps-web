import {html, css} from 'lit'

import '@material/web/button/outlined-button'
import '@material/web/select/filled-select'
import '@material/web/select/select-option'
import '@material/web/textfield/filled-text-field'

import '../components/GrampsjsCollapsibleSection.js'
import '../components/GrampsjsFormSelectObjectList.js'
import {userRoles} from '../components/GrampsjsFormUser.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsShareUrl.js'
import '../components/GrampsjsSysinfo.js'
import '../components/GrampsjsTaskProgressIndicator.js'
import '../components/GrampsjsTreeQuotas.js'
import '../components/GrampsjsUsers.js'
import {GrampsjsView} from './GrampsjsView.js'

import {mdiCheck, mdiContentCopy} from '@mdi/js'
import {
  __APIHOST__,
  TREE_CONFIG_PRIMARY_COLOR,
  TREE_CONFIG_SECONDARY_COLOR,
} from '../api.js'
import {fireEvent} from '../util.js'
import {applyScheme, DEFAULT_PRIMARY, DEFAULT_SECONDARY} from '../theme.js'
import {DEFAULT_TREE_VIEW, TREE_VIEWS} from '../treeDefaults.js'

export class GrampsjsViewSettingsUser extends GrampsjsView {
  static get styles() {
    return [
      ...super.styles,
      css`
        .token-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        h3 {
          font-size: 1.1em;
          font-weight: 500;
          margin: 1.5em 0 0.5em;
        }

        .tree-preferences {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 12px 24px;
          align-items: start;
        }

        .tree-preferences md-filled-select {
          width: 100%;
        }

        .profile-fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }

        .profile-fields md-filled-text-field {
          width: 100%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _userInfo: {type: Object},
      _translations: {type: Array},
      _langLoading: {type: Boolean},
      _tokenCopied: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._userInfo = {}
    this._translations = []
    this._langLoading = false
    this._tokenCopied = false
  }

  renderContent() {
    return html`
      <p style="margin-top: 2.5em;">
        ${this._('Changes here only affect your account.')}
      </p>

      <grampsjs-collapsible-section
        title="${this._('Account')}"
        description="${this._(
          'Profile info, credentials, and account security'
        )}"
      >
        <dl>
          <div>
            <dt><span>${this._('Username: ').replace(':', '')}</span></dt>
            <dd>${this._userInfo?.name}</dd>
          </div>
          <div>
            <dt><span>${this._('Full Name')}</span></dt>
            <dd>${this._userInfo?.full_name}</dd>
          </div>
          <div>
            <dt><span>${this._('User group')}</span></dt>
            <dd>${this._(userRoles[this._userInfo?.role])}</dd>
          </div>
        </dl>
        <div style="clear: both;"></div>

        <h3>${this._('Change profile')}</h3>
        ${this.renderChangeProfile()}

        <h3>${this._('Change E-mail')}</h3>
        ${this.renderChangeEmail()}

        <h3>${this._('Change password')}</h3>
        ${this.renderChangePw()}
      </grampsjs-collapsible-section>

      <grampsjs-collapsible-section
        title="${this._('Appearance')}"
        description="${this._('Display preferences saved on this device')}"
      >
        <h3>${this._('Select language')}</h3>
        ${this.renderLangSelect()}
        <h3>${this._('Select theme')}</h3>
        ${this.renderThemeSelect()}
        <h3>${this._('Family tree preferences')}</h3>
        ${this.renderTreePreferences()}
      </grampsjs-collapsible-section>

      <grampsjs-collapsible-section
        title="${this._('Developer Tools')}"
        description="${this._('Access the interactive API documentation')}"
      >
        ${this.renderApiToken()}
      </grampsjs-collapsible-section>
    `
  }

  renderLangSelect() {
    return html`
      <md-filled-select
        id="select-language"
        label="${this._langLoading
          ? this._('Loading items...')
          : this._('Language')}"
        @change="${this._handleLangSelected}"
        ?disabled="${this._langLoading}"
      >
        ${this._translations.map(
          langObj => html`
            <md-select-option
              value="${langObj.language}"
              ?selected="${langObj.language === this.appState.settings.lang}"
              >${langObj.native}</md-select-option
            >
          `,
          this
        )}
      </md-filled-select>
    `
  }

  _handleLangSelected(event) {
    const key = event.target.value
    if (key) {
      this.appState.updateSettings({lang: key})
    }
  }

  firstUpdated() {
    if (this.active) {
      this._fetchOwnUserDetails()
    }
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active') && this.active) {
      if (!this._langLoading && this._translations.length === 0) {
        this._fetchDataLang()
      }
    }
  }

  async _fetchDataLang() {
    this.loading = true
    this._langLoading = true
    const dataTrans = await this.appState.apiGet('/api/translations/')
    if ('data' in dataTrans) {
      this.error = false
      this._translations = dataTrans.data
    } else if ('error' in dataTrans) {
      this.error = true
      this._errorMessage = dataTrans.error
      return
    }
    this._langLoading = false
    this.loading = false
  }

  renderThemeSelect() {
    const theme = this.appState.settings.theme ?? 'system'
    return html`
      <md-filled-select
        id="select-theme"
        label="${this._('Theme')}"
        @change="${this._handleThemeSelected}"
      >
        <md-select-option value="system" ?selected="${theme === 'system'}"
          >${this._('System')}</md-select-option
        >
        <md-select-option value="light" ?selected="${theme === 'light'}"
          >${this._('Light')}</md-select-option
        >
        <md-select-option value="dark" ?selected="${theme === 'dark'}"
          >${this._('Dark')}</md-select-option
        >
      </md-filled-select>
    `
  }

  _handleThemeSelected(event) {
    const theme = event.target.value
    this.appState.updateSettings({theme})
    try {
      applyScheme(
        this.appState.treeConfig?.[TREE_CONFIG_PRIMARY_COLOR] ||
          DEFAULT_PRIMARY,
        this.appState.treeConfig?.[TREE_CONFIG_SECONDARY_COLOR] ||
          DEFAULT_SECONDARY,
        theme
      )
    } catch {
      applyScheme(DEFAULT_PRIMARY, DEFAULT_SECONDARY, theme)
    }
  }

  renderTreePreferences() {
    const defaultView =
      this.appState.settings.treeDefaultView ?? DEFAULT_TREE_VIEW
    return html`
      <div class="tree-preferences">
        <md-filled-select
          id="tree-default-view"
          label="${this._('Default family tree view')}"
          @change=${this._handleDefaultTreeViewChange}
        >
          ${TREE_VIEWS.map(
            view => html`
              <md-select-option
                value="${view}"
                ?selected=${view === defaultView}
              >
                ${this._(this._treeViewLabel(view))}
              </md-select-option>
            `
          )}
        </md-filled-select>
      </div>
    `
  }

  _treeViewLabel(view) {
    switch (view) {
      case 'descendant':
        return 'Descendant Tree'
      case 'hourglass':
        return 'Hourglass Graph'
      case 'relationship':
        return 'Relationship Graph'
      case 'fan':
        return 'Fan Chart'
      default:
        return 'Ancestor Tree'
    }
  }

  _handleDefaultTreeViewChange(event) {
    const candidate = event.target.value || DEFAULT_TREE_VIEW
    const view = TREE_VIEWS.includes(candidate) ? candidate : DEFAULT_TREE_VIEW
    this.appState.updateSettings({treeDefaultView: view})
  }

  renderChangeProfile() {
    return html`
      <p class="profile-fields">
        <md-filled-text-field
          id="change-username"
          label="${this._('Username: ').replace(':', '')}"
          value="${this._userInfo?.name || ''}"
        ></md-filled-text-field>
        <md-filled-text-field
          id="change-full-name"
          label="${this._('Full Name')}"
          value="${this._userInfo?.full_name || ''}"
        ></md-filled-text-field>
      </p>
      <p>
        <md-outlined-button @click="${this._changeProfile}">
          ${this._('Submit')}
        </md-outlined-button>
      </p>
    `
  }

  renderChangeEmail() {
    return html`
      <p>
        <md-filled-text-field
          id="change-email"
          label="${this._('New E-mail')}"
          value="${this._userInfo?.email ? this._userInfo.email : ''}"
        ></md-filled-text-field>
      </p>
      <p>
        <md-outlined-button @click="${this._changeEmail}">
          ${this._('Submit')}
        </md-outlined-button>
      </p>
    `
  }

  renderChangePw() {
    return html`
      <p>
        <md-filled-text-field
          id="old-pw"
          label="${this._('Old password')}"
          type="password"
        ></md-filled-text-field>
        <md-filled-text-field
          id="new-pw"
          label="${this._('New password')}"
          type="password"
        ></md-filled-text-field>
      </p>
      <p>
        <md-outlined-button @click="${this._changePw}">
          ${this._('Submit')}
        </md-outlined-button>
      </p>
    `
  }

  renderApiToken() {
    return html`
      <p>
        ${this._(
          'Copy your session token to use in Swagger UI, the interactive API testing tool.'
        )}
      </p>
      <p class="token-row">
        <md-outlined-button @click="${this._copyToken}">
          <grampsjs-icon
            slot="icon"
            path="${this._tokenCopied ? mdiCheck : mdiContentCopy}"
            color="var(--mdc-theme-primary)"
          ></grampsjs-icon>
          ${this._('_Copy')}
        </md-outlined-button>
        <md-outlined-button
          href="${__APIHOST__}/api/swagger-ui"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${this._('Launch Swagger')}
        </md-outlined-button>
      </p>
    `
  }

  async _copyToken() {
    const token = await this.appState.refreshTokenIfNeeded()
    if (!token) {
      fireEvent(this, 'grampsjs:error', {
        message: 'No valid session token available',
      })
      return
    }
    try {
      await navigator.clipboard.writeText(token)
      this._tokenCopied = true
      setTimeout(() => {
        this._tokenCopied = false
      }, 2000)
    } catch {
      fireEvent(this, 'grampsjs:error', {
        message: 'Failed to copy token to clipboard',
      })
    }
  }

  async _changeProfile() {
    const usernameField = this.shadowRoot.getElementById('change-username')
    const fullNameField = this.shadowRoot.getElementById('change-full-name')
    const username = usernameField.value.trim()
    if (!username) {
      fireEvent(this, 'grampsjs:error', {
        message: 'Username cannot be empty',
      })
      return
    }

    const payload = {
      full_name: fullNameField.value,
    }
    if (username !== this._userInfo?.name) {
      payload.name_new = username
    }

    this.loading = true
    const data = await this.appState.apiPut('/api/users/-/', payload)

    this.loading = false
    if ('error' in data) {
      this.error = false
      this.error = true
      this._errorMessage = data.error
      return
    }
    this.error = false
    fireEvent(this, 'grampsjs:notification', {
      message: 'User details successfully updated',
    })

    await this._fetchOwnUserDetails()
  }

  async _changeEmail() {
    const form = this.shadowRoot.getElementById('change-email')
    if (!form.value) {
      return
    }
    this.loading = true
    const payload = {email: form.value}
    const data = await this.appState.apiPut('/api/users/-/', payload)

    this.loading = false
    if ('error' in data) {
      this.error = false
      this.error = true
      this._errorMessage = data.error
      return
    }
    fireEvent(this, 'grampsjs:notification', {
      message: 'E-mail successfully updated',
    })

    form.value = ''

    await this._fetchOwnUserDetails()
    form.value = this._userInfo.email
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
    this.appState
      .apiPost('/api/users/-/password/change', payload)
      .then(data => {
        this.loading = false
        if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        } else {
          this.error = false
          fireEvent(this, 'grampsjs:notification', {
            message: 'Password successfully updated',
          })
          formOldPw.value = ''
          formNewPw.value = ''
        }
      })
  }

  async _fetchOwnUserDetails() {
    const data = await this.appState.apiGet('/api/users/-/')
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    } else {
      this.error = false
      this._userInfo = data.data
    }
  }
}

window.customElements.define(
  'grampsjs-view-settings-user',
  GrampsjsViewSettingsUser
)
