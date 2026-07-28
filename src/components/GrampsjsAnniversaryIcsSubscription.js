import {LitElement, css, html} from 'lit'

import '@material/web/button/outlined-button'
import '@material/web/textfield/filled-text-field'
import {mdiCheck, mdiContentCopy} from '@mdi/js'

import {__APIHOST__} from '../api.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import './GrampsjsIcon.js'

const TOKEN_SCOPE = 'anniversaries_ics'
const TOKEN_ENDPOINT = `/api/users/-/access-tokens/${TOKEN_SCOPE}/`

export class GrampsjsAnniversaryIcsSubscription extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .status {
          color: var(--md-sys-color-on-surface-variant);
          max-width: 65ch;
        }

        .error {
          color: var(--md-sys-color-error);
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        #anniversary-ics-url {
          width: min(100%, 720px);
        }
      `,
    ]
  }

  static get properties() {
    return {
      tokenStatus: {type: String},
      _url: {type: String},
      _loading: {type: Boolean},
      _copied: {type: Boolean},
      _errorMessage: {type: String},
    }
  }

  constructor() {
    super()
    this.tokenStatus = 'idle'
    this._url = ''
    this._loading = false
    this._copied = false
    this._errorMessage = ''
  }

  updated(changed) {
    if (changed.has('tokenStatus') && this.tokenStatus === 'inactive') {
      this._url = ''
      this._copied = false
      this._errorMessage = ''
    }
  }

  render() {
    const canGenerate =
      !this._loading &&
      (this.tokenStatus === 'active' || this.tokenStatus === 'inactive')
    return html`
      <p>
        ${this._(
          'Create a private subscription URL for recurring anniversary events.'
        )}
      </p>
      <p class="status" aria-live="polite">${this._statusMessage()}</p>
      ${this._url
        ? html`
            <p>
              <md-filled-text-field
                id="anniversary-ics-url"
                type="url"
                label="${this._('Subscription URL')}"
                .value="${this._url}"
                readonly
                autocomplete="off"
              ></md-filled-text-field>
            </p>
          `
        : ''}
      <p class="actions">
        <md-outlined-button
          @click="${this._generateToken}"
          ?disabled="${!canGenerate}"
        >
          ${this.tokenStatus === 'active'
            ? this._('Regenerate link')
            : this._('Generate link')}
        </md-outlined-button>
        <md-outlined-button
          @click="${this._copyUrl}"
          ?disabled="${!this._url || this._loading}"
        >
          <grampsjs-icon
            slot="icon"
            path="${this._copied ? mdiCheck : mdiContentCopy}"
            color="var(--mdc-theme-primary)"
          ></grampsjs-icon>
          ${this._('_Copy')}
        </md-outlined-button>
      </p>
      <p class="status">
        ${this._('Manage or revoke this subscription in Access tokens.')}
      </p>
      ${this._errorMessage
        ? html` <p class="error" role="alert">${this._errorMessage}</p> `
        : ''}
    `
  }

  _statusMessage() {
    if (this._loading) {
      return this._('Loading...')
    }
    if (this._url) {
      return this._(
        'Copy this URL now. It will not be shown again after you leave this page.'
      )
    }
    switch (this.tokenStatus) {
      case 'active':
        return this._(
          'A subscription link is active. For security, regenerate it to display a new URL.'
        )
      case 'inactive':
        return this._('No active subscription link.')
      case 'unavailable':
        return this._('Token status unavailable. Retry in Access tokens.')
      default:
        return this._('Loading...')
    }
  }

  _buildUrl(token, apiHost = __APIHOST__) {
    const url = new URL(
      `${apiHost}/api/anniversaries.ics`,
      window.location.origin
    )
    url.searchParams.set('token', token)
    return url.href
  }

  async _generateToken() {
    if (
      this._loading ||
      (this.tokenStatus !== 'active' && this.tokenStatus !== 'inactive')
    ) {
      return
    }

    const previousStatus = this.tokenStatus
    this._loading = true
    this._errorMessage = ''
    fireEvent(this, 'access-token:changed', {
      scope: TOKEN_SCOPE,
      status: 'loading',
    })
    try {
      const result = await this.appState.apiPost(
        TOKEN_ENDPOINT,
        {},
        {dbChanged: false}
      )
      if ('error' in result || !result.data?.token) {
        const message =
          result.error || this._('No access token returned by server')
        this._handleError(message, previousStatus)
        return
      }
      this._url = this._buildUrl(result.data.token)
      this._loading = false
      fireEvent(this, 'access-token:changed', {
        scope: TOKEN_SCOPE,
        status: 'active',
      })
      fireEvent(this, 'grampsjs:notification', {
        message: this._('ICS subscription link updated'),
      })
    } catch (error) {
      this._handleError(
        error instanceof Error ? error.message : String(error),
        previousStatus
      )
    }
  }

  _handleError(message, tokenStatus) {
    this._errorMessage = message
    this._loading = false
    fireEvent(this, 'access-token:changed', {
      scope: TOKEN_SCOPE,
      status: tokenStatus,
    })
    fireEvent(this, 'grampsjs:error', {message})
  }

  async _copyUrl() {
    if (!this._url) {
      return
    }
    try {
      await navigator.clipboard.writeText(this._url)
      this._copied = true
      setTimeout(() => {
        this._copied = false
      }, 2000)
    } catch {
      fireEvent(this, 'grampsjs:error', {
        message: this._('Failed to copy ICS URL to clipboard'),
      })
    }
  }
}

window.customElements.define(
  'grampsjs-anniversary-ics-subscription',
  GrampsjsAnniversaryIcsSubscription
)
