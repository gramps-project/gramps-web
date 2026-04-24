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
  }

  render() {
    if (this.error) {
      this.dispatchEvent(
        new CustomEvent('grampsjs:error', {
          bubbles: true,
          composed: true,
          detail: {message: this._errorMessage},
        })
      )
    }
    return this.renderContent()
  }

  firstUpdated() {
    this._hasFirstUpdated = true
    if (this.appState.i18n.lang) {
      this._onLangChanged(this.appState.i18n.lang)
    }
  }

  updated(changed) {
    super.updated(changed)
    if (
      changed.has('appState') &&
      changed.get('appState')?.i18n?.lang !== this.appState.i18n.lang &&
      this.appState.i18n.lang &&
      this._hasFirstUpdated
    ) {
      this._onLangChanged(this.appState.i18n.lang)
    }
  }

  // Override in subclasses to fetch lang-dependent data.
  // Called on first update (if lang already set) and whenever lang changes.
  // eslint-disable-next-line no-unused-vars
  _onLangChanged(_lang) {}
}
