import {LitElement, html, css} from 'lit'
import {sharedStyles} from '../SharedStyles.js'

export class GrampsjsIcon extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        /* The size lives in a CSS declaration rather than an inline style so
           that a parent can override it — e.g. via ::slotted() sizing from
           md-icon-button / md-*-button, which is how the Material components
           size their slotted icons. An inline style on the host would win
           over those rules and make the icon unsizeable from outside. */
        :host {
          display: inline-flex;
          vertical-align: middle;
          align-items: center;
          justify-content: center;
          width: var(--grampsjs-icon-width, 24px);
          height: var(--grampsjs-icon-height, 24px);
        }

        svg {
          display: block;
          width: 100%;
          height: 100%;
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

  willUpdate() {
    // Fed into the :host rule above rather than set as width/height directly,
    // so that outer rules still take precedence. Non-numeric values are
    // dropped so the rule falls back to its default instead of computing to
    // an invalid length.
    this._setSize('--grampsjs-icon-width', this.width)
    this._setSize('--grampsjs-icon-height', this.height)
  }

  _setSize(prop, value) {
    if (Number.isFinite(value)) {
      this.style.setProperty(prop, `${value}px`)
    } else {
      this.style.removeProperty(prop)
    }
  }

  render() {
    return html`
      <svg
        height="100%"
        width="100%"
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
