import {css, LitElement, html} from 'lit'

import '@material/web/progress/circular-progress.js'

import {mdiCheckCircle, mdiCloseCircle} from '@mdi/js'

import './GrampsjsIcon.js'
import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsProgressIndicator extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .success {
          color: var(--grampsjs-alert-success-font-color);
        }

        .error {
          color: var(--grampsjs-alert-error-font-color);
        }

        .warn {
          color: var(--grampsjs-alert-warn-font-color);
        }

        md-circular-progress {
          margin: -2px;
        }

        .placeholder {
          display: inline-block;
          vertical-align: middle;
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
      errorMessage: {type: String},
      infoMessage: {type: String},
    }
  }

  constructor() {
    super()
    this.progress = -1
    this.size = 24
    this.error = false
    this.open = false
    this.errorMessage = ''
    this.infoMessage = ''
  }

  reset() {
    this.progress = -1
    this.error = false
    this.errorMessage = ''
    this.infoMessage = ''
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

  // md-circular-progress draws inside a 4px margin, so the element is 4px
  // larger than the footprint and offset by a negative margin
  _getProgressStyle() {
    return `--md-circular-progress-size: ${this.size + 4}px;
      --md-circular-progress-active-indicator-width: ${250 / (this.size - 4)};`
  }

  renderClosed() {
    return html`
      <span
        class="placeholder"
        style="width: ${this.size}px; height: ${this.size}px;"
      ></span>
    `
  }

  renderIndeterminate() {
    return html`
      <md-circular-progress
        indeterminate
        id="progress-indeterminate"
        style="${this._getProgressStyle()}
          --md-circular-progress-active-indicator-color: var(--grampsjs-body-font-color-50);"
      >
      </md-circular-progress>
      ${this.infoMessage
        ? html` <grampsjs-tooltip
            for="progress-indeterminate"
            content="${this.infoMessage}"
          ></grampsjs-tooltip>`
        : ''}
    `
  }

  renderProgress() {
    return html`
      <md-circular-progress
        value="${Math.max(this.progress, 0.05)}"
        style="${this._getProgressStyle()}"
        id="progress-determinate"
      >
      </md-circular-progress>
      ${this.infoMessage
        ? html` <grampsjs-tooltip
            for="progress-determinate"
            content="${this.infoMessage}"
          ></grampsjs-tooltip>`
        : ''}
    `
  }

  renderSuccess() {
    return html`
      <grampsjs-icon
        class="success"
        path="${mdiCheckCircle}"
        color="currentColor"
        width="${this.size}"
        height="${this.size}"
      ></grampsjs-icon>
    `
  }

  renderError() {
    return html`
      <grampsjs-icon
        id="error-icon"
        class="error"
        path="${mdiCloseCircle}"
        color="currentColor"
        width="${this.size}"
        height="${this.size}"
      ></grampsjs-icon>
      ${this.errorMessage
        ? html`
            <grampsjs-tooltip for="error-icon" theme="error"
              >${this.errorMessage}</grampsjs-tooltip
            >
          `
        : ''}
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
