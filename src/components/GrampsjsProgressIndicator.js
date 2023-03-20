import {css, LitElement, html} from 'lit'

import '@material/mwc-circular-progress'
import '@material/mwc-icon'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'

export class GrampsjsProgressIndicator extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-circular-progress {
          --mdc-theme-primary: rgba(0, 0, 0, 0.5);
        }

        .success {
          color: #41ad49;
        }

        .error {
          color: #bf360c;
        }

        .warn {
          color: #f9a825;
        }
      `,
    ]
  }

  static get properties() {
    return {
      progress: {type: Number},
      size: {type: Number},
      error: {type: Boolean},
      open: {type: Boolean},
      _errorMessage: {type: String},
    }
  }

  constructor() {
    super()
    this.progress = -1
    this.size = 24
    this.error = false
    this.open = false
    this._errorMessage = ''
  }

  reset() {
    this.progress = -1
    this.error = false
    this._errorMessage = ''
  }

  render() {
    if (!this.open) {
      return this.renderClosed()
    }
    if (this.error) {
      return this.renderError()
    }
    if (this.progress <= -1) {
      return this.renderIndeterminate()
    }
    if (this.progress >= 1) {
      return this.renderSuccess()
    }
    return this.renderProgress()
  }

  _getDensity() {
    return -6 + Math.round((this.size - 24) / 4)
  }

  renderClosed() {
    return html`
      <mwc-circular-progress closed density="${this._getDensity()}">
      </mwc-circular-progress>
    `
  }

  renderIndeterminate() {
    return html`
      <mwc-circular-progress indeterminate density="${this._getDensity()}">
      </mwc-circular-progress>
    `
  }

  renderProgress() {
    return html`
      <mwc-circular-progress
        progress="${Math.max(this.progress, 0.05)}"
        density="${this._getDensity()}"
      >
      </mwc-circular-progress>
    `
  }

  renderSuccess() {
    return html`
      <mwc-icon style="--mdc-icon-size: ${this.size}px;" class="success"
        >check_circle</mwc-icon
      >
    `
  }

  renderError() {
    return html`
      <mwc-icon style="--mdc-icon-size: ${this.size}px;" class="error"
        >cancel</mwc-icon
      >
    `
  }

  _handleClick() {
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {private: !this.private},
    })
  }
}

window.customElements.define(
  'grampsjs-progress-indicator',
  GrampsjsProgressIndicator
)
