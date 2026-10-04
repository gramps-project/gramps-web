import {LitElement, html, css} from 'lit'

import '@material/web/button/outlined-button'
import '@material/web/button/text-button'
import '@material/web/dialog/dialog'
import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/textfield/filled-text-field'

import {mdiCheck, mdiContentCopy} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {apiVersionAtLeast, fireEvent} from '../util.js'
import './GrampsjsIcon.js'

// Scopes with `multiple` hold several labelled tokens per user, one per
// device, managed via the `tokens/` endpoints. Servers without those
// endpoints answer 404, and the scope is hidden.
const PERSISTENT_ACCESS_TOKEN_SCOPES = [
  {
    scope: 'anniversaries_ics',
    label: 'Anniversary calendar subscription',
  },
  {
    scope: 'sync',
    label: 'Desktop sync',
    addLabel: 'Add sync device',
    multiple: true,
  },
]

const TOKEN_LABEL_MAX_LENGTH = 100

export function supportsPersistentAccessTokens(dbInfo) {
  return apiVersionAtLeast(dbInfo, 3, 18)
}

function scopeInfo(scope) {
  return PERSISTENT_ACCESS_TOKEN_SCOPES.find(s => s.scope === scope)
}

function accessTokenEndpoint(scope) {
  const base = `/api/users/-/access-tokens/${encodeURIComponent(scope)}/`
  return scopeInfo(scope)?.multiple ? `${base}tokens/` : base
}

// The API returns UTC timestamps without a time zone designator.
function parseUtcDate(value) {
  return new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(value) ? value : `${value}Z`)
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

export class GrampsjsAccessTokens extends GrampsjsAppStateMixin(LitElement) {
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

        code {
          overflow-wrap: anywhere;
        }

        md-filled-text-field {
          width: 100%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _states: {type: Object},
      _pendingRevocation: {type: Object},
      _creatingScope: {type: String},
      _creating: {type: Boolean},
      _createdToken: {type: String},
      _createdTokenCopied: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._states = Object.fromEntries(
      PERSISTENT_ACCESS_TOKEN_SCOPES.map(({scope}) => [
        scope,
        {status: 'idle', error: ''},
      ])
    )
    this._fetching = new Set()
    this._pendingRevocation = null
    this._creatingScope = ''
    this._creating = false
    this._createdToken = ''
    this._createdTokenCopied = false
  }

  update(changed) {
    super.update(changed)
    if (changed.has('appState')) {
      this._loadIfNeeded()
    }
  }

  // Reloads all scopes, e.g. when the containing view is shown again.
  refresh() {
    this._loadIfNeeded(true)
  }

  render() {
    const scopes = PERSISTENT_ACCESS_TOKEN_SCOPES.filter(
      ({scope}) => this._states[scope]?.status !== 'unsupported'
    )
    const statusOf = scope => this._states[scope]?.status
    const entries = this._entries()
    const isLoading = scopes.some(({scope}) =>
      ['idle', 'loading'].includes(statusOf(scope))
    )
    const hasUnavailable = scopes.some(
      ({scope}) => statusOf(scope) === 'unavailable'
    )
    const creatableScopes = scopes.filter(
      ({scope, multiple}) =>
        multiple && ['active', 'inactive'].includes(statusOf(scope))
    )
    return html`
      <p>
        ${this._(
          'Applications and services can use persistent access tokens to access limited features of your account.'
        )}
      </p>
      ${entries.length
        ? html`
            <md-list>
              ${entries.map(entry => this._renderEntry(entry))}
            </md-list>
          `
        : ''}
      ${isLoading
        ? html`<p aria-live="polite">${this._('Loading...')}</p>`
        : ''}
      ${!isLoading && !hasUnavailable && entries.length === 0
        ? html`<p aria-live="polite">${this._('No active access tokens.')}</p>`
        : ''}
      ${creatableScopes.map(
        ({scope, addLabel}) => html`
          <p>
            <md-outlined-button @click="${() => this._openCreation(scope)}">
              ${this._(addLabel)}
            </md-outlined-button>
          </p>
        `
      )}
      ${hasUnavailable
        ? html`
            <p class="error" role="alert">
              ${this._('Some access tokens could not be loaded.')}
            </p>
            <p>
              <md-outlined-button @click="${this._retryUnavailable}">
                ${this._('Retry')}
              </md-outlined-button>
            </p>
          `
        : ''}
      ${this._pendingRevocation ? this._renderRevocationDialog() : ''}
      ${this._creatingScope ? this._renderCreationDialog() : ''}
      ${this._createdToken ? this._renderCreatedDialog() : ''}
    `
  }

  // One entry per token: scopes with a single token yield one entry without
  // an id, scopes with several tokens yield one entry per labelled token.
  _entries() {
    return PERSISTENT_ACCESS_TOKEN_SCOPES.flatMap(
      ({scope, label, multiple}) => {
        const state = this._states[scope]
        if (state?.status !== 'active') {
          return []
        }
        const error = id => (state.errorId === id ? state.error : '')
        if (!multiple) {
          return [{scope, title: this._(label), details: '', error: error()}]
        }
        return (state.tokens ?? []).map(token => ({
          scope,
          id: token.id,
          title: token.label,
          details: [
            `${this._('Created')}: ${this._formatDate(token.created_at)}`,
            `${this._('Last used')}: ${
              token.last_used_at
                ? this._formatDate(token.last_used_at)
                : this._('Never')
            }`,
          ].join(' · '),
          error: error(token.id),
        }))
      }
    )
  }

  _renderEntry({scope, id, title, details, error}) {
    return html`
      <md-list-item type="text" noninteractive>
        <div slot="headline">${title}</div>
        <div slot="supporting-text" aria-live="polite">
          ${this._('Scope')}: <code>${scope}</code>
          ${details ? html`&middot; ${details}` : ''}
          ${error ? html`<span class="error">&middot; ${error}</span>` : ''}
        </div>
        <md-outlined-button
          slot="end"
          @click="${() => this._requestRevocation(scope, id)}"
        >
          ${this._('Revoke')}
        </md-outlined-button>
      </md-list-item>
    `
  }

  _formatDate(value) {
    if (!value) {
      return ''
    }
    const date = parseUtcDate(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
  }

  _setState(scope, state) {
    this._states = {...this._states, [scope]: state}
  }

  _loadIfNeeded(force = false) {
    if (!supportsPersistentAccessTokens(this.appState?.dbInfo)) {
      return
    }
    for (const {scope} of PERSISTENT_ACCESS_TOKEN_SCOPES) {
      const status = this._states[scope]?.status
      if (status === 'idle' || (force && status !== 'unsupported')) {
        this._fetchStatus(scope)
      }
    }
  }

  _retryUnavailable() {
    for (const {scope} of PERSISTENT_ACCESS_TOKEN_SCOPES) {
      if (this._states[scope]?.status === 'unavailable') {
        this._fetchStatus(scope)
      }
    }
  }

  async _fetchStatus(scope) {
    if (this._fetching.has(scope)) {
      return
    }
    this._fetching.add(scope)
    // loaded tokens stay visible while they are refreshed
    if (!['active', 'inactive'].includes(this._states[scope]?.status)) {
      this._setState(scope, {status: 'loading', error: ''})
    }
    const multiple = scopeInfo(scope)?.multiple
    try {
      const result = await this.appState.apiGet(accessTokenEndpoint(scope))
      if ('error' in result) {
        const unsupported = multiple && result.errorDetail?.status === 404
        this._setState(
          scope,
          unsupported
            ? {status: 'unsupported', error: ''}
            : {status: 'unavailable', error: result.error}
        )
        return
      }
      if (multiple) {
        const tokens = Array.isArray(result.data) ? result.data : []
        this._setState(scope, {
          status: tokens.length ? 'active' : 'inactive',
          tokens,
          error: '',
        })
        return
      }
      this._setState(scope, {
        status: result.data?.active ? 'active' : 'inactive',
        error: '',
      })
    } catch (error) {
      this._setState(scope, {status: 'unavailable', error: errorMessage(error)})
    } finally {
      this._fetching.delete(scope)
    }
  }

  _requestRevocation(scope, id) {
    if (this._states[scope]?.status === 'active') {
      this._pendingRevocation = {scope, id}
    }
  }

  _cancelRevocation() {
    this._pendingRevocation = null
  }

  _renderRevocationDialog() {
    const {scope, id} = this._pendingRevocation
    const token = (this._states[scope]?.tokens ?? []).find(t => t.id === id)
    return html`
      <md-dialog open @cancel="${this._cancelRevocation}">
        <span slot="headline">${this._('Revoke access token?')}</span>
        <div slot="content">
          <p>
            <strong>${token?.label ?? this._(scopeInfo(scope)?.label)}</strong>
          </p>
          <p>
            ${this._(
              'Revoking this token will immediately stop any application or service using it.'
            )}
          </p>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._cancelRevocation}">
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button @click="${this._confirmRevocation}">
            ${this._('Revoke')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  async _confirmRevocation() {
    const pending = this._pendingRevocation
    this._pendingRevocation = null
    if (!pending || this._states[pending.scope]?.status !== 'active') {
      return
    }
    const {scope, id} = pending
    const multiple = scopeInfo(scope)?.multiple
    const endpoint = multiple
      ? `${accessTokenEndpoint(scope)}${encodeURIComponent(id)}/`
      : accessTokenEndpoint(scope)

    let error = ''
    try {
      const result = await this.appState.apiDelete(endpoint, {
        dbChanged: false,
      })
      if ('error' in result) {
        error = result.error
      }
    } catch (e) {
      error = errorMessage(e)
    }

    const state = this._states[scope]
    if (error) {
      this._setState(scope, {
        ...state,
        error,
        ...(multiple ? {errorId: id} : {}),
      })
      fireEvent(this, 'grampsjs:error', {message: error})
      return
    }
    if (multiple) {
      const tokens = (state.tokens ?? []).filter(t => t.id !== id)
      this._setState(scope, {
        status: tokens.length ? 'active' : 'inactive',
        tokens,
        error: '',
      })
    } else {
      this._setState(scope, {status: 'inactive', error: ''})
    }
    fireEvent(this, 'grampsjs:notification', {
      message: this._('Access token revoked'),
    })
  }

  _openCreation(scope) {
    this._creatingScope = scope
  }

  _closeCreation() {
    this._creatingScope = ''
  }

  _handleLabelKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      this._createToken()
    }
  }

  _renderCreationDialog() {
    return html`
      <md-dialog open @cancel="${this._closeCreation}">
        <span slot="headline">
          ${this._(scopeInfo(this._creatingScope)?.addLabel)}
        </span>
        <div slot="content">
          <md-filled-text-field
            id="token-label"
            label="${this._('Device name')}"
            maxlength="${TOKEN_LABEL_MAX_LENGTH}"
            required
            ?disabled="${this._creating}"
            @keydown="${this._handleLabelKeydown}"
          ></md-filled-text-field>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._closeCreation}">
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button
            ?disabled="${this._creating}"
            @click="${this._createToken}"
          >
            ${this._('Add')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  async _createToken() {
    if (this._creating) {
      return
    }
    const scope = this._creatingScope
    const field = this.renderRoot.querySelector('#token-label')
    const label = field?.value.trim() ?? ''
    if (!scope || !label) {
      field?.reportValidity()
      return
    }
    this._creating = true
    let result
    try {
      result = await this.appState.apiPost(
        accessTokenEndpoint(scope),
        {label},
        {dbChanged: false}
      )
    } catch (error) {
      result = {error: errorMessage(error)}
    } finally {
      this._creating = false
    }
    if ('error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
      return
    }
    const {token, ...info} = result.data ?? {}
    const tokens = [...(this._states[scope]?.tokens ?? []), info]
    this._setState(scope, {status: 'active', tokens, error: ''})
    this._closeCreation()
    this._createdTokenCopied = false
    this._createdToken = token ?? ''
  }

  // The token is shown only once, so the dialog closes only via its button.
  _renderCreatedDialog() {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Access token created')}</span>
        <div slot="content">
          <p>${this._('Copy the token now. It will not be shown again.')}</p>
          <p><code>${this._createdToken}</code></p>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._copyCreatedToken}">
            <grampsjs-icon
              slot="icon"
              path="${this._createdTokenCopied ? mdiCheck : mdiContentCopy}"
              color="var(--mdc-theme-primary)"
            ></grampsjs-icon>
            ${this._('_Copy')}
          </md-text-button>
          <md-text-button @click="${this._closeCreated}">
            ${this._('Close')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  async _copyCreatedToken() {
    try {
      await navigator.clipboard.writeText(this._createdToken)
      this._createdTokenCopied = true
    } catch {
      fireEvent(this, 'grampsjs:error', {
        message: 'Failed to copy token to clipboard',
      })
    }
  }

  _closeCreated() {
    this._createdToken = ''
    this._createdTokenCopied = false
  }
}

window.customElements.define('grampsjs-access-tokens', GrampsjsAccessTokens)
