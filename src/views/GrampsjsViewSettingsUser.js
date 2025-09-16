import {html} from 'lit'

import '@material/mwc-button'
import '@material/mwc-menu'
import '@material/mwc-select'
import '@material/mwc-textfield'

import '../components/GrampsjsFormSelectObjectList.js'
import {userRoles} from '../components/GrampsjsFormUser.js'
import '../components/GrampsjsShareUrl.js'
import '../components/GrampsjsSysinfo.js'
import '../components/GrampsjsTaskProgressIndicator.js'
import '../components/GrampsjsTreeQuotas.js'
import '../components/GrampsjsUsers.js'
import {GrampsjsView} from './GrampsjsView.js'

import {fireEvent} from '../util.js'

export class GrampsjsViewSettingsUser extends GrampsjsView {
  static get properties() {
    return {
      _userInfo: {type: Object},
      _translations: {type: Array},
      _langLoading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._userInfo = {}
    this._translations = []
    this._langLoading = false
  }

  renderContent() {
    return html`
      <h3>${this._('User Information')}</h3>
      <dl>
        <div>
          <dt><span>${this._('Username: ').replace(':', '')}</span></dt>
          <dd>${this._userInfo?.name}</dd>
        </div>
        <div>
          <dt><span>${this._('User group')}</span></dt>
          <dd>${this._(userRoles[this._userInfo?.role])}</dd>
        </div>
      </dl>
      <div style="clear: both;"></div>

      <h3>${this._('Select language')}</h3>

      ${this.renderLangSelect()}

      <h3>${this._('Select theme')}</h3>

      ${this.renderThemeSelect()}

      <h3>${this._('Change E-mail')}</h3>

      ${this.renderChangeEmail()}

      <h3>${this._('Change password')}</h3>

      ${this.renderChangePw()}
    `
  }

  renderLangSelect() {
    return html`
      <mwc-select
        id="select-language"
        label="${this._langLoading
          ? this._('Loading items...')
          : this._('Language')}"
        @selected="${this._handleLangSelected}"
        ?disabled="${this._langLoading}"
      >
        ${this._translations.map(
          langObj => html`
            <mwc-list-item
              value="${langObj.language}"
              ?selected="${langObj.language === this.appState.settings.lang}"
              >${langObj.native}</mwc-list-item
            >
          `,
          this
        )}
      </mwc-select>
    `
  }

  _handleLangSelected(event) {
    const i = event.detail.index
    if (i !== null && i !== undefined && i < this._translations.length) {
      const key = this._translations[i].language
      this.appState.updateSettings({lang: key})
    }
  }

  firstUpdated() {
    if (this.active) {
      this._fetchDataLang()
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
      <mwc-select
        id="select-theme"
        label="${this._('Theme')}"
        @selected="${this._handleThemeSelected}"
      >
        <mwc-list-item value="system" ?selected="${theme === 'system'}"
          >${this._('System')}</mwc-list-item
        >
        <mwc-list-item value="light" ?selected="${theme === 'light'}"
          >${this._('Light')}</mwc-list-item
        >
        <mwc-list-item value="dark" ?selected="${theme === 'dark'}"
          >${this._('Dark')}</mwc-list-item
        >
      </mwc-select>
    `
  }

  _handleThemeSelected(event) {
    const theme = event.target.value
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'

    this.appState.updateSettings({theme})

    document.documentElement.setAttribute(
      'data-theme',
      theme === 'system' ? systemTheme : theme
    )
  }

  renderChangeEmail() {
    return html`
      <p>
        <mwc-textfield
          id="change-email"
          label="${this._('New E-mail')}"
          value="${this._userInfo?.email ? this._userInfo.email : ''}"
        >
        </mwc-textfield>
      </p>
      <p>
        <mwc-button
          outlined
          label="${this._('Submit')}"
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
          label="${this._('Submit')}"
          @click="${this._changePw}"
        ></mwc-button>
      </p>
    `
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

  connectedCallback() {
    super.connectedCallback()
    this._fetchOwnUserDetails()
  }
}

window.customElements.define(
  'grampsjs-view-settings-user',
  GrampsjsViewSettingsUser
)
