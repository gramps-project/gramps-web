import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsFormSelectObjectList.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, modifyRect, normalizeRect, rectEqual} from '../util.js'

// Container for an image (slot "image") and the rectangles on top of it
// (default slot). In draw mode, dragging on the image draws a new rectangle
// and fires rect:draw. Dragging an editable rectangle or one of its handles
// fires rect:modify while dragging and rect:modify-end when released.
// Escape or a cancelled pointer discards the drag.
class GrampsjsRectContainer extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #rect-container {
          display: inline-block;
          position: relative;
          overflow: hidden;
          vertical-align: bottom;
        }

        .draw {
          cursor: crosshair;
          touch-action: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      draw: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.draw = false
    this._drag = null
    this._handleKeyDown = this._handleKeyDown.bind(this)
  }

  render() {
    return html`
      <div
        id="rect-container"
        class="${classMap({draw: this.draw})}"
        @pointerdown="${this._handleDown}"
        @pointerup="${this._handleUp}"
        @pointermove="${this._handleMove}"
        @pointercancel="${this._handleCancel}"
        @lostpointercapture="${this._handleCancel}"
        @dragstart="${this._handleDragStart}"
        @rect:modify-start="${this._handleModifyStart}"
      >
        <slot name="image"></slot>
        <slot></slot>
      </div>
    `
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._handleKeyDown, true)
    super.disconnectedCallback()
  }

  _handleDown(e) {
    if (!this.draw || this._drag || e.button !== 0) return
    e.preventDefault()
    this._startDrag(e.pointerId, {
      handle: 'draw',
      start: this._getRelativeCoords(e),
      rect: null,
    })
  }

  _handleModifyStart(e) {
    e.stopPropagation()
    const {handle, rect, pointerId, clientX, clientY} = e.detail
    if (this._drag) return
    this._startDrag(pointerId, {
      handle,
      start: this._getRelativeCoords({clientX, clientY}),
      rect,
    })
  }

  _startDrag(pointerId, drag) {
    const container = this.renderRoot.querySelector('#rect-container')
    // Capturing the pointer delivers all further events to the container,
    // also when the pointer leaves it, and stops the browser from dragging
    // the image
    try {
      container.setPointerCapture(pointerId)
    } catch {
      return
    }
    this._drag = {...drag, pointerId, current: drag.rect}
    // capture phase, so that the drag is cancelled before other Escape
    // handlers on the window see the event
    window.addEventListener('keydown', this._handleKeyDown, true)
  }

  _handleDragStart(e) {
    if (this.draw) e.preventDefault()
  }

  _handleMove(e) {
    const drag = this._drag
    if (drag?.pointerId !== e.pointerId) return
    const [x, y] = this._getRelativeCoords(e)
    const [x0, y0] = drag.start
    const rect =
      drag.handle === 'draw'
        ? normalizeRect([x0, y0, x, y])
        : modifyRect(drag.rect, drag.handle, x - x0, y - y0)
    // A draw that shrinks back to zero size clears the region drawn so far
    // (rect null), so that releasing it does not keep an earlier region
    if (rect === drag.current || rectEqual(rect, drag.current)) return
    drag.current = rect
    fireEvent(this, drag.handle === 'draw' ? 'rect:draw' : 'rect:modify', {
      rect,
    })
  }

  _handleUp(e) {
    if (this._drag?.pointerId !== e.pointerId) return
    this._endDrag(false)
  }

  _handleCancel(e) {
    if (this._drag?.pointerId !== e.pointerId) return
    this._endDrag(true)
  }

  _handleKeyDown(e) {
    if (e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    this._endDrag(true)
  }

  _endDrag(cancel) {
    const drag = this._drag
    this._drag = null
    window.removeEventListener('keydown', this._handleKeyDown, true)
    const container = this.renderRoot.querySelector('#rect-container')
    if (container?.hasPointerCapture(drag.pointerId)) {
      container.releasePointerCapture(drag.pointerId)
    }
    if (drag.handle === 'draw') {
      if (cancel && drag.current) {
        fireEvent(this, 'rect:draw', {rect: null})
      }
      return
    }
    fireEvent(this, 'rect:modify-end', {
      rect: cancel ? drag.rect : drag.current,
      original: drag.rect,
    })
  }

  _getRelativeCoords({clientX, clientY}) {
    const container = this.renderRoot.querySelector('#rect-container')
    const rect = container.getBoundingClientRect()
    return [
      ((clientX - rect.left) / rect.width) * 100,
      ((clientY - rect.top) / rect.height) * 100,
    ]
  }
}

window.customElements.define('grampsjs-rect-container', GrampsjsRectContainer)
