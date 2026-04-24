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
    // Tracks the lang value we last passed to _onLangChanged. Used to deduplicate
    // calls when firstUpdated() and updated() fire in the same Lit cycle (e.g.
    // when active and appState both change together in the same batched update).
    this._lastLangChanged = ''
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
    const lang = this.appState?.i18n?.lang
    if (lang) {
      this._lastLangChanged = lang
      this._onLangChanged(lang)
    }
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
  }

  // Override in subclasses to fetch lang-dependent data.
  // eslint-disable-next-line no-unused-vars
  _onLangChanged(_lang) {}
}
