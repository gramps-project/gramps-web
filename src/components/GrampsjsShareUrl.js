import {LitElement, html, css} from 'lit'

import '@material/web/iconbutton/icon-button.js'

import {mdiCheck, mdiShareVariant} from '@mdi/js'

import {sharedStyles, iconButtonColorStyles} from '../SharedStyles.js'
import {clickKeyHandler} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsTooltip.js'
import './GrampsjsIcon.js'

export class GrampsjsShareUrl extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      iconButtonColorStyles,
      css`
        :host {
          font-size: 14px;
          font-weight: 450;
          color: var(--grampsjs-body-font-color-45);
        }

        md-icon-button {
          --grampsjs-icon-button-color: currentColor;
          --md-icon-button-state-layer-width: 28px;
          --md-icon-button-state-layer-height: 28px;
          position: relative;
        }
      `,
    ]
  }

  static get properties() {
    return {
      href: {type: String},
      _copied: {type: Boolean, state: true},
    }
  }

  constructor() {
    super()
    this.href = ''
    this._copied = false
  }

  render() {
    return html`
      <md-icon-button
        id="share-icon"
        aria-label="${this._('Copy URL')}"
        @click="${this._handleShareClick}"
        @keydown="${clickKeyHandler}"
      >
        <grampsjs-icon
          path="${this._copied ? mdiCheck : mdiShareVariant}"
          color="currentColor"
        ></grampsjs-icon>
      </md-icon-button>
      <grampsjs-tooltip for="share-icon"
        >${this._('Copy URL')}</grampsjs-tooltip
      >
    `
  }

  _handleShareClick() {
    const url = this.href
    if (navigator.share) {
      navigator.share({url})
    } else {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      navigator.clipboard.writeText(url).finally(() => {
        document.body.removeChild(input)
      })
      this._copied = true
      setTimeout(() => {
        this._copied = false
      }, 1000)
    }
  }
}

window.customElements.define('grampsjs-share-url', GrampsjsShareUrl)
