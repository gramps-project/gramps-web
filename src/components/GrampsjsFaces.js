import {html} from 'lit'

import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import './GrampsjsRect.js'
import {fireEvent, normalizeRect, rectOverlap} from '../util.js'

// Faces detected in an image, as suggested regions. Meant to be placed inside
// the grampsjs-rect-container that holds the image.
export class GrampsjsFaces extends GrampsjsConnectedComponent {
  renderContent() {
    if (this.rectHidden) {
      return ''
    }
    return this._getFaces()
      .filter(
        face => !this.hiddenRects.some(rect => rectOverlap(face, rect) > 0.5)
      )
      .map(
        face => html`
          <grampsjs-rect
            muted
            .rect="${face}"
            target=""
            @rect:clicked="${e => this._handleRectClick(e, face)}"
          >
          </grampsjs-rect>
        `
      )
  }

  _handleRectClick(e, face) {
    e.stopPropagation()
    fireEvent(this, 'rect:selected', face)
  }

  // slightly grow rectangles and make them rectangular
  _getFaces() {
    if (!this._data.data) {
      return []
    }
    return this._data.data
      .map(rect => {
        const [left, top, right, bottom] = rect
        const width = right - left
        const height = bottom - top
        return [
          Math.round(left - 0.15 * width),
          Math.round(top - 0.37 * height),
          Math.round(right + 0.15 * width),
          Math.round(bottom + 0.37 * height),
        ]
      })
      .map(normalizeRect)
      .filter(rect => rect !== null)
  }

  static get properties() {
    return {
      handle: {type: String},
      // faces overlapping any of these are not shown
      hiddenRects: {type: Array},
      rectHidden: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.handle = ''
    this.hiddenRects = []
    this.rectHidden = false
    this.renderOnError = true // render even if face detection fails
  }

  getUrl() {
    return `/api/media/${this.handle}/face_detection`
  }
}

window.customElements.define('grampsjs-faces', GrampsjsFaces)
