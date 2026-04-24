/*
Base class for Gramps views
*/

import {LitElement, css} from 'lit'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsView extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          margin: 25px 40px;
          background-color: var(--md-sys-color-surface);
        }

        @media (max-width: 768px) {
          :host {
            margin: 25px 20px;
          }
        }
      `,
    ]
  }

  shouldUpdate() {
    return this.active
  }

  static get properties() {
    return {
      active: {type: Boolean},
      loading: {type: Boolean},
      error: {type: Boolean},
      settings: {type: Object},
      _errorMessage: {type: String},
      _errorDetail: {type: Object},
      _hasFirstUpdated: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.active = false
    this.loading = false
    this.error = false
    this.settings = {}
    this._errorMessage = ''
    this._hasFirstUpdated = false
    this._lastLangChanged = ''
    this._errorDetail = {}
    this._errorDispatched = false
  }

  render() {
    return this.renderContent()
  }

  updated(changed) {
    super.updated(changed)
    const lang = this.appState?.i18n?.lang
    if (
      lang &&
      lang !== this._lastLangChanged &&
      changed.has('appState') &&
      changed.get('appState')?.i18n?.lang !== lang
    ) {
      this._lastLangChanged = lang
      this._onLangChanged(lang)
    }
    if (
      changed.has('error') ||
      changed.has('_errorMessage') ||
      changed.has('_errorDetail')
    ) {
      // Reset guard whenever the error state changes so a new error always fires
      this._errorDispatched = false
    }
    if (this.error && !this._errorDispatched) {
      this._errorDispatched = true
      this.dispatchEvent(
        new CustomEvent('grampsjs:error', {
          bubbles: true,
          composed: true,
          detail: {
            message: this._errorMessage,
            detail: this._errorDetail ?? {},
          },
        })
      )
    }
  }

  firstUpdated() {
    this._hasFirstUpdated = true
    const lang = this.appState?.i18n?.lang
    if (lang) {
      this._lastLangChanged = lang
      this._onLangChanged(lang)
    }
  }

  // Override in subclasses to fetch lang-dependent data.
  // eslint-disable-next-line no-unused-vars
  _onLangChanged(_lang) {}
}
