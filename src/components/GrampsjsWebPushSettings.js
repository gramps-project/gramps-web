import {css, html, LitElement} from 'lit'

import '@material/web/iconbutton/icon-button'
import '@material/web/switch/switch'

import {mdiBell, mdiBellOff, mdiRefresh} from '@mdi/js'

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

        .channel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .channel-name {
          font-weight: 500;
        }

        .feedback {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 8px 0 0;
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
      <label class="channel">
        <span class="channel-name">${this._('Browser')}</span>
        <md-switch
          icons
          ?selected="${this._isSwitchSelected()}"
          ?disabled="${this._isSwitchDisabled()}"
          @change="${this._handleToggle}"
        >
          <svg slot="on-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="${mdiBell}" />
          </svg>
          <svg slot="off-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="${mdiBellOff}" />
          </svg>
        </md-switch>
      </label>
      ${this._renderFeedback()}
    `
  }

  _renderFeedback() {
    if (
      this._status === 'loading' ||
      this._status === 'enabling' ||
      this._status === 'disabling'
    ) {
      return html`<p class="status feedback" aria-live="polite">
        ${this._('Loading...')}
      </p>`
    }
    if (this._status === 'unsupported' || this._status === 'unavailable') {
      return html`<p class="status feedback">
        ${this._(
          'Notifications are unavailable in this browser or on this server.'
        )}
      </p>`
    }
    if (this._status === 'denied') {
      return html`<p class="status feedback">
        ${this._('Notifications are blocked in browser settings.')}
      </p>`
    }
    if (this._status === 'error' || this._status === 'cleanup-error') {
      return html`
        <p class="error feedback" role="alert">
          ${this._('Could not update notifications.')} ${this._error}
          <md-icon-button
            title="${this._('Retry')}"
            aria-label="${this._('Retry')}"
            @click="${this._retry}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="${mdiRefresh}" />
            </svg>
          </md-icon-button>
        </p>
      `
    }
    return ''
  }

  _isSwitchSelected() {
    return (
      this._status === 'active' ||
      this._status === 'enabling' ||
      this._status === 'disabling'
    )
  }

  _isSwitchDisabled() {
    return (
      this._busy ||
      [
        'loading',
        'unsupported',
        'unavailable',
        'denied',
        'error',
        'cleanup-error',
      ].includes(this._status)
    )
  }

  _handleToggle(event) {
    if (event.target.selected) this._enable()
    else this._disable()
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
      if (!result.data?.public_key) {
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
    this._status = 'enabling'
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
    this._status = 'disabling'
    const endpoint = this._subscription.endpoint
    try {
      const unsubscribed = await this._subscription.unsubscribe()
      if (unsubscribed === false) {
        this._status = 'error'
        return
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
