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
          background-color: #ffffff;
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
  }

  update(changed) {
    super.update(changed)
    if (changed.has('loading')) {
      if (this.loading && this.active) {
        this.dispatchEvent(
          new CustomEvent('progress:on', {bubbles: true, composed: true})
        )
      } else if (!this.loading && this.active) {
        this.dispatchEvent(
          new CustomEvent('progress:off', {bubbles: true, composed: true})
        )
      }
    }
    if (changed.has('active')) {
      if (!this.active) {
        this.dispatchEvent(
          new CustomEvent('progress:off', {bubbles: true, composed: true})
        )
      } else if (this.loading) {
        this.dispatchEvent(
          new CustomEvent('progress:on', {bubbles: true, composed: true})
        )
      }
    }
  }
}
