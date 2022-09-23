import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {sharedStyles} from '../SharedStyles.js'

class GrampsjsRect extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        .rect {
          border-radius: 3px;
          border: 2px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.4);
          position: absolute;
          cursor: pointer;
        }

        .rect .label {
          background-color: rgba(0.5, 0.5, 0.5, 0.25);
          border-radius: 3px;
          color: #fff;
          cursor: pointer;
          display: block;
          font-size: 0.8em;
          left: 50%;
          overflow: hidden;
          padding: 0.1em 0.5em;
          position: relative;
          top: 100%;
          transform: translate(-50%, 10px);
          text-align: center;
        }

        .rect.selected {
          border: 3px solid var(--mdc-theme-secondary);
          box-shadow: 0px 0px 0px 9999px rgba(0, 0, 0, 0.4);
        }

        .rect.muted {
          border-style: dotted;
          box-shadow: None;
        }

        @media (hover: hover) {
          .rect .label {
            background-color: rgba(0.5, 0.5, 0.5, 0.25);
            border-radius: 3px;
            color: #fff;
            cursor: pointer;
            display: block;
            font-size: 0.7em;
            left: 50%;
            overflow: hidden;
            padding: 0 0.5em;
            position: relative;
            top: 100%;
            transform: translate(-50%, 10px);
          }
        }

        .rect.selected .label {
          display: block;
        }

        .rect.inner {
          display: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      rect: {type: Array},
      label: {type: String},
      target: {type: String},
      selected: {type: Boolean},
      muted: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.rect = []
    this.label = ''
    this.target = ''
    this.selected = false
    this.muted = false
  }

  render() {
    if (this.rect.length === 0) {
      return ''
    }
    const left = this.rect[0]
    const top = this.rect[1]
    const width = this.rect[2] - this.rect[0]
    const height = this.rect[3] - this.rect[1]
    return html`
      <div
        class="rect ${classMap({selected: this.selected, muted: this.muted})}"
        @click="${this._handleClick}"
        @keydown=""
        style="left:${left}%;top:${top}%;width:${width}%;height:${height}%;"
      >
        <div class="rect inner ${classMap({selected: this.selected})}"></div>
        <div class="label">${this.label}</div>
        <slot></slot>
      </div>
    `
  }

  _handleClick() {
    this.dispatchEvent(
      new CustomEvent('rect:clicked', {
        bubbles: true,
        composed: true,
        detail: {target: this.target},
      })
    )
  }
}

window.customElements.define('grampsjs-rect', GrampsjsRect)
