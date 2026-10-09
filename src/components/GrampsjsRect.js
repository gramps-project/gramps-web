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
        /* the border is part of the region, so that the box covers
           exactly the stored rectangle */
        .rect {
          --rect-border-width: 2px;
          box-sizing: border-box;
          border-radius: 8px;
          border: var(--rect-border-width) solid
            var(--grampsjs-rect-border-color);
          box-shadow: 0 0 1px 1px var(--grampsjs-rect-border-shadow-color);
          position: absolute;
          cursor: pointer;
        }

        .rect:hover:not(.selected) {
          border-color: var(--grampsjs-rect-border-hover-color);
        }

        .rect.selected {
          --rect-border-width: 3px;
          border-color: var(--mdc-theme-secondary);
          box-shadow: 0 0 0 9999px var(--grampsjs-rect-border-shadow-color);
          z-index: 1;
        }

        .rect.muted {
          border-style: dotted;
          box-shadow: none;
        }

        .rect.muted:hover {
          border-color: var(--grampsjs-rect-border-hover-color);
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

        /* the selection border already shows the focus */
        .rect.selected:focus-visible {
          outline: none;
        }

        .rect.editable {
          cursor: move;
          touch-action: none;
        }

        /* a pill below the box, sized to its text and cut off with an
           ellipsis when too long */
        .label {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translate(-50%, 6px);
          box-sizing: border-box;
          width: max-content;
          max-width: 16em;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 20px;
          padding: 0 8px;
          border-radius: 10px;
          background-color: var(--grampsjs-rect-label-background-color);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          color: var(--grampsjs-rect-label-color);
          font-size: 12px;
          line-height: 16px;
          cursor: pointer;
        }

        .label grampsjs-icon {
          flex: none;
          display: flex;
        }

        .label-text {
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* labels of rectangles at the bottom of the image, which would
           otherwise be cut off */
        .label.above {
          top: auto;
          bottom: 100%;
          transform: translate(-50%, -6px);
        }

        .label.inside {
          top: auto;
          bottom: 6px;
          transform: translateX(-50%);
        }

        /* centred on the corners of the border */
        .handle {
          --handle-size: 14px;
          --handle-offset: calc(
            -1 * (var(--handle-size) + var(--rect-border-width)) / 2
          );
          position: absolute;
          box-sizing: border-box;
          width: var(--handle-size);
          height: var(--handle-size);
          border: 2px solid var(--grampsjs-rect-border-hover-color);
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
          left: var(--handle-offset);
          top: var(--handle-offset);
          cursor: nwse-resize;
        }

        .handle.ne {
          right: var(--handle-offset);
          top: var(--handle-offset);
          cursor: nesw-resize;
        }

        .handle.sw {
          left: var(--handle-offset);
          bottom: var(--handle-offset);
          cursor: nesw-resize;
        }

        .handle.se {
          right: var(--handle-offset);
          bottom: var(--handle-offset);
          cursor: nwse-resize;
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
                : ''}<span class="label-text">${this.label}</span>
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
