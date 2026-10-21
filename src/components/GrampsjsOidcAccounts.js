import {LitElement, html, css} from 'lit'

import '@material/web/button/outlined-button'
import '@material/web/button/text-button'
import '@material/web/dialog/dialog'
import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/textfield/filled-text-field'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {__APIHOST__, apiGetOIDCConfig} from '../api.js'
import {OIDC_LINK_RESULT_KEY, OIDC_RETURN_PATH_KEY} from '../oidc.js'
import {fireEvent} from '../util.js'
import './GrampsjsRelogin.js'
import './GrampsjsTimedelta.js'

const ACCOUNTS_ENDPOINT = '/api/users/-/oidc-accounts/'

// An action interrupted by signing in again through the provider, which
// leaves the page; resumed when the settings page loads again.
const RESUME_KEY = 'oidc_resume_action'
const RESUME_MAX_AGE_MS = 10 * 60 * 1000

function takeResumeAction() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RESUME_KEY))
    sessionStorage.removeItem(RESUME_KEY)
    return value && Date.now() - value.at < RESUME_MAX_AGE_MS ? value : null
  } catch {
    return null
  }
}

// The API returns UTC timestamps without a time zone designator.
function parseUtcDate(value) {
  return new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(value) ? value : `${value}Z`)
}

// Takes the result of a link that the /oidc/complete page left behind.
function takeLinkResult() {
  try {
    const value = sessionStorage.getItem(OIDC_LINK_RESULT_KEY)
    sessionStorage.removeItem(OIDC_LINK_RESULT_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

// Lists the current user's linked OIDC identities, links new ones and
// unlinks them. Hidden if OIDC is disabled or the server is too old.
export class GrampsjsOidcAccounts extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-list {
          max-width: 720px;
          padding: 0;
        }

        md-list-item {
          --md-list-item-label-text-size: 1rem;
          --md-list-item-supporting-text-color: var(
            --md-sys-color-on-surface-variant
          );
        }

        .error {
          color: var(--md-sys-color-error);
        }

        md-filled-text-field {
          width: 100%;
        }

        md-outlined-button {
          margin: 0 0.5em 0.5em 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      username: {type: String},
      _status: {type: String},
      _accounts: {type: Array},
      _providers: {type: Array},
      _pendingUnlink: {type: Object},
      _unlinkError: {type: String},
    }
  }

  constructor() {
    super()
    this.username = ''
    // 'idle', 'loading', 'ready', 'hidden' or 'unavailable'
    this._status = 'idle'
    this._accounts = []
    this._providers = []
    this._pendingUnlink = null
    this._unlinkError = ''
    // Non-reactive: the action to retry after a successful relogin.
    this._pendingAction = null
  }

  update(changed) {
    super.update(changed)
    if (changed.has('appState') && this._status === 'idle') {
      this._load()
    }
  }

  updated(changed) {
    if (changed.has('_accounts')) {
      fireEvent(this, 'oidc-accounts:changed', {count: this._accounts.length})
    }
  }

  // Reloads the accounts, e.g. when the containing view is shown again.
  refresh() {
    if (this._status !== 'hidden') {
      this._load()
    }
  }

  render() {
    if (!['ready', 'unavailable'].includes(this._status)) {
      return ''
    }
    const linked = new Set(this._accounts.map(a => a.provider_id))
    const unlinked = this._providers.filter(p => !linked.has(p.id))
    return html`
      <h3>${this._('Linked sign-in methods')}</h3>
      ${this._status === 'unavailable'
        ? html`<p class="error">
            ${this._('The linked sign-in methods could not be loaded.')}
          </p>`
        : html`
            ${this._accounts.length
              ? html`<md-list>
                  ${this._accounts.map(account => this._renderAccount(account))}
                </md-list>`
              : html`<p>
                  ${this._(
                    'You can also sign in with an account from one of these providers once you link it.'
                  )}
                </p>`}
            <p>
              ${unlinked.map(
                provider => html`
                  <md-outlined-button @click="${() => this._link(provider.id)}">
                    ${this._('Link with %s', provider.name)}
                  </md-outlined-button>
                `
              )}
            </p>
          `}
      ${this._pendingUnlink ? this._renderUnlinkDialog() : ''}
      <grampsjs-relogin
        .appState="${this.appState}"
        username="${this.username}"
        @relogin="${this._handleRelogin}"
      ></grampsjs-relogin>
    `
  }

  _renderAccount(account) {
    const linkedAt = this._unixTime(account.created_at)
    return html`
      <md-list-item type="text" noninteractive>
        <div slot="headline">${this._providerName(account.provider_id)}</div>
        <div slot="supporting-text">
          ${account.email ? html`${account.email} &middot; ` : ''}
          ${this._('Linked')}:
          ${linkedAt === null
            ? account.created_at
            : html`<grampsjs-timedelta
                timestamp="${linkedAt}"
                locale="${this.appState?.i18n?.lang}"
              ></grampsjs-timedelta>`}
        </div>
        <md-outlined-button
          slot="end"
          @click="${() => this._requestUnlink(account)}"
        >
          ${this._('Unlink')}
        </md-outlined-button>
      </md-list-item>
    `
  }

  _renderUnlinkDialog() {
    const account = this._pendingUnlink
    const isLast = this._accounts.length === 1
    return html`
      <md-dialog open @cancel="${this._cancelUnlink}">
        <span slot="headline">
          ${this._('Unlink %s?', this._providerName(account.provider_id))}
        </span>
        <div slot="content">
          <p>
            ${this._(
              'You will no longer be able to sign in with this account.'
            )}
          </p>
          ${isLast
            ? html`
                <p>
                  ${this._(
                    'This is your last linked sign-in method. To unlink it, enter your password; you will then sign in with your user name and password.'
                  )}
                </p>
                <md-filled-text-field
                  id="unlink-password"
                  type="password"
                  label="${this._('Password: ').replace(':', '')}"
                ></md-filled-text-field>
              `
            : ''}
          ${this._unlinkError
            ? html`<p class="error">${this._unlinkError}</p>`
            : ''}
        </div>
        <div slot="actions">
          <md-text-button @click="${this._cancelUnlink}">
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button @click="${this._confirmUnlink}">
            ${this._('Unlink')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _providerName(providerId) {
    return this._providers.find(p => p.id === providerId)?.name ?? providerId
  }

  // seconds since the epoch, as grampsjs-timedelta expects, or null
  // eslint-disable-next-line class-methods-use-this
  _unixTime(value) {
    const time = value ? parseUtcDate(value).getTime() : NaN
    return Number.isNaN(time) ? null : Math.floor(time / 1000)
  }

  async _load() {
    if (this._status !== 'ready') {
      this._status = 'loading'
    }
    const config = await apiGetOIDCConfig()
    if (!config?.enabled || !config.providers?.length) {
      this._status = 'hidden'
      return
    }
    this._providers = config.providers
    const result = await this.appState.apiGet(ACCOUNTS_ENDPOINT)
    if ('error' in result) {
      // servers without account linking answer 404
      this._status =
        result.errorDetail?.status === 404 ? 'hidden' : 'unavailable'
      return
    }
    this._accounts = Array.isArray(result.data) ? result.data : []
    this._status = 'ready'
    this._reportLinkResult()
    this._resumeAction()
  }

  _resumeAction() {
    const action = takeResumeAction()
    if (action?.link) {
      this._link(action.link)
    } else if (action?.unlink) {
      const account = this._accounts.find(a => a.id === action.unlink)
      if (account) {
        this._requestUnlink(account)
      }
    }
  }

  _reportLinkResult() {
    const result = takeLinkResult()
    if (!result) {
      return
    }
    if (result.linked) {
      fireEvent(this, 'grampsjs:notification', {
        message: this._('Linked %s', this._providerName(result.linked)),
      })
      return
    }
    const messages = {
      identity_in_use: this._(
        'This sign-in is already linked to another account.'
      ),
      link_failed: this._('Linking failed.'),
    }
    fireEvent(this, 'grampsjs:error', {
      message: messages[result.error] ?? result.error,
    })
  }

  // Linking and unlinking need a recent login; asks for one first if needed.
  // `resume` describes the action, should signing in leave the page.
  _whenFresh(action, resume) {
    if (this.appState.auth.isTokenFresh()) {
      action()
      return
    }
    this._pendingAction = action
    if (this.appState.auth.claims?.oidc_provider) {
      // signing in again goes through the provider, a full page load
      try {
        sessionStorage.setItem(
          RESUME_KEY,
          JSON.stringify({...resume, at: Date.now()})
        )
        sessionStorage.setItem(OIDC_RETURN_PATH_KEY, window.location.pathname)
      } catch {
        // then the user starts the action again after signing in
      }
    }
    this.renderRoot.querySelector('grampsjs-relogin').show()
  }

  _handleRelogin() {
    const action = this._pendingAction
    this._pendingAction = null
    action?.()
  }

  _link(providerId) {
    this._whenFresh(
      async () => {
        const result = await this.appState.apiPost(
          '/api/oidc/link/',
          {provider: providerId},
          {dbChanged: false, saving: false, requireFresh: true}
        )
        if ('error' in result) {
          fireEvent(this, 'grampsjs:error', {message: result.error})
          return
        }
        const query = new URLSearchParams({
          provider: providerId,
          link: result.data.ticket,
        })
        window.location.href = `${__APIHOST__}/api/oidc/login/?${query}`
      },
      {link: providerId}
    )
  }

  _requestUnlink(account) {
    this._whenFresh(
      () => {
        this._unlinkError = ''
        this._pendingUnlink = account
      },
      {unlink: account.id}
    )
  }

  _cancelUnlink() {
    this._pendingUnlink = null
    this._unlinkError = ''
  }

  async _confirmUnlink() {
    const account = this._pendingUnlink
    if (!account) {
      return
    }
    const password = this.renderRoot.querySelector('#unlink-password')?.value
    const result = await this.appState.apiDelete(
      `${ACCOUNTS_ENDPOINT}${encodeURIComponent(account.id)}/`,
      {
        dbChanged: false,
        saving: false,
        requireFresh: true,
        payload: password ? {password} : {},
      }
    )
    if ('error' in result) {
      // keep the dialog open, e.g. to correct the password
      this._unlinkError = result.error
      return
    }
    this._pendingUnlink = null
    this._accounts = this._accounts.filter(a => a.id !== account.id)
    fireEvent(this, 'grampsjs:notification', {
      message: this._('Unlinked %s', this._providerName(account.provider_id)),
    })
  }
}

window.customElements.define('grampsjs-oidc-accounts', GrampsjsOidcAccounts)
