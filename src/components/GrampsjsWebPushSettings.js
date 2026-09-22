import {css, html, LitElement} from 'lit'

import '@material/web/button/filled-button'
import '@material/web/button/outlined-button'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {
  PUSH_SUBSCRIPTIONS_ENDPOINT,
  serializePushSubscription,
  urlBase64ToUint8Array,
} from '../webPush.js'

export class GrampsjsWebPushSettings extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          max-width: 720px;
        }

        .status {
          color: var(--md-sys-color-on-surface-variant);
        }

        .error {
          color: var(--md-sys-color-error);
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _status: {type: String},
      _error: {type: String},
      _busy: {type: Boolean},
      _publicKey: {type: String},
      _subscription: {type: Object},
      _pendingDeletionEndpoint: {type: String},
    }
  }

  constructor() {
    super()
    this._status = 'loading'
    this._error = ''
    this._busy = false
    this._publicKey = ''
    this._subscription = null
    this._pendingDeletionEndpoint = ''
  }

  firstUpdated() {
    this._loadState()
  }

  render() {
    return html`
      <p>
        ${this._(
          'Receive browser notifications on this device, even when Gramps Web is not open.'
        )}
      </p>
      ${this._renderStatus()} ${this._renderActions()}
    `
  }

  _renderStatus() {
    if (this._status === 'loading') {
      return html`<p class="status" aria-live="polite">
        ${this._('Loading...')}
      </p>`
    }
    if (this._status === 'unsupported') {
      return html`<p class="status">
        ${this._('Browser notifications are not supported on this device.')}
      </p>`
    }
    if (this._status === 'unavailable') {
      return html`<p class="status">
        ${this._('Browser notifications are not configured on this server.')}
      </p>`
    }
    if (this._status === 'denied') {
      return html`<p class="status">
        ${this._(
          'Notifications are blocked. Allow them in your browser settings to continue.'
        )}
      </p>`
    }
    if (this._status === 'permission-dismissed') {
      return html`<p class="status" aria-live="polite">
        ${this._('Notification permission was not granted. You can try again.')}
      </p>`
    }
    if (this._status === 'active') {
      return html`<p class="status" aria-live="polite">
        ${this._('Browser notifications are enabled on this device.')}
      </p>`
    }
    if (this._status === 'cleanup-error') {
      return html`
        <p class="status" aria-live="polite">
          ${this._('Browser notifications are disabled on this device.')}
        </p>
        <p class="error" role="alert">
          ${this._('The server subscription could not be removed.')}
          ${this._error}
        </p>
      `
    }
    if (this._status === 'error') {
      return html`<p class="error" role="alert">
        ${this._('Browser notification settings could not be loaded.')}
        ${this._error}
      </p>`
    }
    return html`<p class="status" aria-live="polite">
      ${this._('Browser notifications are disabled on this device.')}
    </p>`
  }

  _renderActions() {
    if (this._status === 'active') {
      return html`
        <div class="actions">
          <md-outlined-button
            ?disabled="${this._busy}"
            @click="${this._disable}"
          >
            ${this._busy
              ? this._('Disabling...')
              : this._('Disable notifications')}
          </md-outlined-button>
        </div>
      `
    }
    if (
      this._status === 'inactive' ||
      this._status === 'permission-dismissed'
    ) {
      return html`
        <div class="actions">
          <md-filled-button ?disabled="${this._busy}" @click="${this._enable}">
            ${this._busy
              ? this._('Enabling...')
              : this._('Enable notifications')}
          </md-filled-button>
        </div>
      `
    }
    if (this._status === 'error' || this._status === 'cleanup-error') {
      return html`
        <div class="actions">
          <md-outlined-button ?disabled="${this._busy}" @click="${this._retry}">
            ${this._('Retry')}
          </md-outlined-button>
        </div>
      `
    }
    return ''
  }

  _isSupported() {
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    )
  }

  async _registration() {
    const current = await navigator.serviceWorker.getRegistration()
    return current || navigator.serviceWorker.ready
  }

  async _loadState() {
    this._error = ''
    this._pendingDeletionEndpoint = ''
    if (!this._isSupported()) {
      this._status = 'unsupported'
      return
    }
    this._status = 'loading'
    try {
      const result = await this.appState.apiGet(PUSH_SUBSCRIPTIONS_ENDPOINT)
      if ('error' in result) {
        throw new Error(result.error)
      }
      if (!result.data?.available || !result.data?.public_key) {
        this._status = 'unavailable'
        return
      }
      this._publicKey = result.data.public_key
      const registration = await this._registration()
      this._subscription = await registration.pushManager.getSubscription()
      if (this._subscription) {
        const syncResult = await this._saveSubscription(this._subscription)
        if ('error' in syncResult) {
          throw new Error(syncResult.error)
        }
        this._status = 'active'
      } else {
        this._status =
          window.Notification.permission === 'denied' ? 'denied' : 'inactive'
      }
    } catch (error) {
      this._setError(error)
    }
  }

  _saveSubscription(subscription) {
    return this.appState.apiPost(
      PUSH_SUBSCRIPTIONS_ENDPOINT,
      serializePushSubscription(subscription),
      {saving: false, dbChanged: false}
    )
  }

  async _enable() {
    if (this._busy) return
    this._busy = true
    this._error = ''
    let createdSubscription = null
    try {
      const permission =
        window.Notification.permission === 'granted'
          ? 'granted'
          : await window.Notification.requestPermission()
      if (permission !== 'granted') {
        this._status =
          permission === 'denied' ? 'denied' : 'permission-dismissed'
        return
      }
      const registration = await this._registration()
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(this._publicKey),
        })
        createdSubscription = subscription
      }
      const result = await this._saveSubscription(subscription)
      if ('error' in result) {
        throw new Error(result.error)
      }
      this._subscription = subscription
      this._status = 'active'
    } catch (error) {
      if (createdSubscription) {
        try {
          await createdSubscription.unsubscribe()
        } catch {
          // The server did not store it, so no notification can be delivered.
        }
      }
      this._setError(error)
    } finally {
      this._busy = false
    }
  }

  async _disable() {
    if (this._busy || !this._subscription) return
    this._busy = true
    this._error = ''
    const endpoint = this._subscription.endpoint
    try {
      const unsubscribed = await this._subscription.unsubscribe()
      if (unsubscribed === false) {
        throw new Error(
          this._('The browser subscription could not be removed.')
        )
      }
      this._subscription = null
      const result = await this._deleteRemoteSubscription(endpoint)
      if ('error' in result) {
        this._pendingDeletionEndpoint = endpoint
        this._status = 'cleanup-error'
        this._error = result.error
        return
      }
      this._status = 'inactive'
    } catch (error) {
      this._setError(error)
    } finally {
      this._busy = false
    }
  }

  _deleteRemoteSubscription(endpoint) {
    return this.appState.apiDelete(PUSH_SUBSCRIPTIONS_ENDPOINT, {
      body: {endpoint},
      saving: false,
      dbChanged: false,
    })
  }

  async _retry() {
    if (this._busy) return
    if (!this._pendingDeletionEndpoint) {
      await this._loadState()
      return
    }
    this._busy = true
    try {
      const result = await this._deleteRemoteSubscription(
        this._pendingDeletionEndpoint
      )
      if ('error' in result) {
        this._error = result.error
        return
      }
      this._pendingDeletionEndpoint = ''
      this._error = ''
      this._status = 'inactive'
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error)
    } finally {
      this._busy = false
    }
  }

  _setError(error) {
    this._error = error instanceof Error ? error.message : String(error)
    this._status = 'error'
  }
}

window.customElements.define(
  'grampsjs-web-push-settings',
  GrampsjsWebPushSettings
)
