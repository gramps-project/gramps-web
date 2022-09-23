import {html} from 'lit'

import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import './GrampsjsRectContainer.js'
import './GrampsjsRect.js'
import {fireEvent, arrayEqual} from '../util.js'

export class GrampsjsFaces extends GrampsjsConnectedComponent {
  renderContent() {
    return html`
      <grampsjs-rect-container .strings="${this.strings}">
        <slot></slot>
        ${this.rectHidden
          ? ''
          : this._getFaces().map(obj =>
              arrayEqual(obj, this.selectedRect) ||
              this.deletedRects.some(el => arrayEqual(obj, el))
                ? ''
                : html`
                    <grampsjs-rect
                      muted
                      .rect="${obj}"
                      label="?"
                      target=""
                      @click="${() => this._handleRectClick(obj)}"
                    >
                    </grampsjs-rect>
                  `
            )}
      </grampsjs-rect-container>
    `
  }

  _handleRectClick(obj) {
    fireEvent(this, 'rect:selected', obj)
  }

  // slightly grow rectangles and make them rectangular
  _getFaces() {
    return this._data.data.map(rect => {
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
  }

  static get properties() {
    return {
      handle: {type: String},
      selectedRect: {type: Array},
      deletedRects: {type: Array},
      rectHidden: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.handle = ''
    this.selectedRect = []
    this.deletedRects = []
    this.rectHidden = false
  }

  getUrl() {
    return `/api/media/${this.handle}/face_detection`
  }
}

window.customElements.define('grampsjs-faces', GrampsjsFaces)
