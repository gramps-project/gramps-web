import {LitElement, html, css} from 'lit'
import {sharedStyles} from '../SharedStyles.js'

export class GrampsjsIcon extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: inline-flex;
          vertical-align: middle;
          align-items: center;
          justify-content: center;
        }

        svg {
          display: block;
        }
      `,
    ]
  }

  static get properties() {
    return {
      path: {type: String},
      color: {type: String},
      rotate: {type: Number},
      slot: {type: String},
      height: {type: Number},
      width: {type: Number},
    }
  }

  constructor() {
    super()
    this.path = ''
    this.color = 'var(--grampsjs-body-font-color-40)'
    this.rotate = 0
    this.height = 24
    this.width = 24
  }

  render() {
    return html`
      <svg
        height="${this.height}"
        width="${this.width}"
        viewBox="0 0 24 24"
        transform="rotate(${this.rotate})"
        preserveAspectRatio="xMidYMid meet"
      >
        <path fill="${this.color}" d="${this.path}" />
      </svg>
    `
  }
}

window.customElements.define('grampsjs-icon', GrampsjsIcon)
