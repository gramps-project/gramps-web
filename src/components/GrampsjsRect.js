import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {sharedStyles} from '../SharedStyles.js'
import {clickKeyHandler, fireEvent, objectIconPath} from '../util.js'
import './GrampsjsIcon.js'

class GrampsjsRect extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        .rect {
          border-radius: 3px;
          border: 2px solid var(--grampsjs-rect-border-color);
          box-shadow: 0 0 1px 1px var(--grampsjs-rect-border-shadow-color);
          position: absolute;
          cursor: pointer;
        }

        .rect .label {
          background-color: var(--grampsjs-rect-label-background-color);
          border-radius: 3px;
          color: var(--grampsjs-rect-label-color);
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
          box-shadow: 0px 0px 0px 9999px
            var(--grampsjs-rect-border-shadow-color);
        }

        .rect.muted {
          border-style: dotted;
          box-shadow: None;
        }

        .rect.hidden:not(.selected) {
          opacity: 0;
        }

        .rect.hidden:hover,
        .rect.hidden:focus-visible {
          opacity: 1;
        }

        .rect:focus-visible {
          outline: 2px solid var(--mdc-theme-secondary);
          outline-offset: 2px;
        }

        .rect.selected {
          z-index: 1;
        }

        .rect.editable {
          cursor: move;
          touch-action: none;
        }

        .handle {
          position: absolute;
          width: 10px;
          height: 10px;
          border: 2px solid var(--grampsjs-rect-border-color);
          border-radius: 50%;
          background-color: var(--mdc-theme-secondary);
          touch-action: none;
        }

        /* larger hit area, for touch screens */
        .handle::before {
          content: '';
          position: absolute;
          inset: -12px;
        }

        .handle.nw {
          left: -9px;
          top: -9px;
          cursor: nwse-resize;
        }

        .handle.ne {
          right: -9px;
          top: -9px;
          cursor: nesw-resize;
        }

        .handle.sw {
          left: -9px;
          bottom: -9px;
          cursor: nesw-resize;
        }

        .handle.se {
          right: -9px;
          bottom: -9px;
          cursor: nwse-resize;
        }

        @media (hover: hover) {
          .rect .label {
            background-color: var(--grampsjs-rect-label-background-color);
            border-radius: 3px;
            color: var(--grampsjs-rect-label-color);
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

        .label grampsjs-icon {
          margin-right: 0.3em;
          vertical-align: -0.15em;
        }

        .rect.selected .label {
          display: block;
        }

        /* labels of rectangles at the bottom of the image, which would
           otherwise be cut off */
        .rect .label.above {
          top: 0;
          transform: translate(-50%, calc(-100% - 10px));
        }

        .rect .label.inside {
          transform: translate(-50%, calc(-100% - 6px));
        }
      `,
    ]
  }

  static get properties() {
    return {
      rect: {type: Array},
      label: {type: String},
      type: {type: String},
      target: {type: String},
      selected: {type: Boolean},
      muted: {type: Boolean},
      hidden: {type: Boolean},
      editable: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.rect = []
    this.label = ''
    this.type = ''
    this.target = ''
    this.selected = false
    this.muted = false
    this.hidden = false
    this.editable = false
  }

  render() {
    if (this.rect.length === 0) {
      return ''
    }
    const left = this.rect[0]
    const top = this.rect[1]
    const width = this.rect[2] - this.rect[0]
    const height = this.rect[3] - this.rect[1]
    const atBottom = this.rect[3] > 90
    return html`
      <div
        class="rect ${classMap({
          selected: this.selected,
          muted: this.muted,
          hidden: this.hidden,
          editable: this.editable,
        })}"
        tabindex="0"
        role="button"
        aria-label="${this.label}"
        @click="${this._handleClick}"
        @keydown="${clickKeyHandler}"
        @pointerdown="${this._handlePointerDown}"
        style="left:${left}%;top:${top}%;width:${width}%;height:${height}%;"
      >
        ${this.label
          ? html`<div
              class="label ${classMap({
                above: atBottom && top >= 10,
                inside: atBottom && top < 10,
              })}"
            >
              ${this.type in objectIconPath
                ? html`<grampsjs-icon
                    path="${objectIconPath[this.type]}"
                    color="var(--grampsjs-rect-label-color)"
                    height="12"
                    width="12"
                  ></grampsjs-icon>`
                : ''}${this.label}
            </div>`
          : ''}
        ${this.editable
          ? ['nw', 'ne', 'sw', 'se'].map(
              handle =>
                html`<div
                  class="handle ${handle}"
                  data-handle="${handle}"
                ></div>`
            )
          : ''}
        <slot></slot>
      </div>
    `
  }

  _handleClick() {
    fireEvent(this, 'rect:clicked', {target: this.target})
  }

  // Starts moving the rectangle, or resizing it when the pointer is on a
  // handle. The enclosing grampsjs-rect-container tracks the pointer.
  _handlePointerDown(e) {
    if (!this.editable || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    fireEvent(this, 'rect:modify-start', {
      handle: e.target.dataset?.handle ?? 'move',
      rect: this.rect,
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
    })
  }
}

window.customElements.define('grampsjs-rect', GrampsjsRect)
