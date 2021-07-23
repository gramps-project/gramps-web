import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'


class GrampsjsRect extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      .rect {
        border-radius: 6px;
        border: 2px solid rgba(255, 255, 255, 0.5);
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
        position:absolute;
      }

      .rect .label {
        background-color: rgba(0.5, 0.5, 0.5, 0.25);
        border-radius:3px;
        color: #fff;
        cursor: pointer;
        display: block;
        font-size:0.7em;
        left: 50%;
        overflow: hidden;
        padding: 0 0.5em;
        position: relative;
        top: 100%;
        transform: translate(-50%, 10px);
      }

      @media (hover: hover) {
        .rect .label {
          display: none;
        }

        .rect:hover .label {
          display: block;
        }

        .rect:hover {
          cursor: pointer;
        }
      }
      `
    ]
  }

  static get properties() {
    return {
      rect: {type: Array},
      label: {type: String},
      target: {type: String},
    }
  }

  render() {
    const left = this.rect[0]
    const top = this.rect[1]
    const width = this.rect[2] - this.rect[0]
    const height = this.rect[3] - this.rect[1]
    return html`
    <div class="rect"
      @click="${this._handleClick}"
      @keydown=""
      style="left:${left}%;top:${top}%;width:${width}%;height:${height}%;">
      <div class="label">${this.label}</div>
    </div>
    `
  }

  _handleClick() {
    this.dispatchEvent(new CustomEvent('rect:clicked', {bubbles: true, composed: true, detail: {target: this.target}}))
  }
}

window.customElements.define('grampsjs-rect', GrampsjsRect)
