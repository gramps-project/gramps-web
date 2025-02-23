import {LitElement, html, css} from 'lit'

import '@material/mwc-icon-button'

import {sharedStyles} from '../SharedStyles.js'
import {clickKeyHandler} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsTooltip.js'

export class GrampsjsShareUrl extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          font-size: 14px;
          font-weight: 450;
          color: rgba(0, 0, 0, 0.45);
        }

        mwc-icon {
          font-size: 18px;
          top: 4px;
          position: relative;
          color: rgba(0, 0, 0, 0.4);
        }

        mwc-icon-button {
          --mdc-icon-size: 16px;
          --mdc-icon-button-size: 28px;
          position: relative;
        }
      `,
    ]
  }

  static get properties() {
    return {
      href: {type: String},
    }
  }

  constructor() {
    super()
    this.href = ''
  }

  render() {
    return html`
      <mwc-icon-button
        id="share-icon"
        icon="share"
        @click="${this._handleShareClick}"
        @keydown="${clickKeyHandler}"
      ></mwc-icon-button>
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
      const btn = this.renderRoot.getElementById('share-icon')
      btn.icon = 'done'
      setTimeout(() => {
        btn.icon = 'share'
      }, 1000)
    }
  }
}

window.customElements.define('grampsjs-share-url', GrampsjsShareUrl)
