import {LitElement, html} from 'lit'

import '@material/mwc-icon-button'

import {sharedStyles} from '../SharedStyles.js'
import {clickKeyHandler} from '../util.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import './GrampsjsTooltip.js'
import {addBookmark, deleteBookmark, hasBookmark} from '../api.js'

export class GrampsjsBookmarkButton extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [sharedStyles]
  }

  static get properties() {
    return {
      endpoint: {type: String},
      handle: {type: String},
      bookmarked: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.endpoint = ''
    this.handle = ''
    this.bookmarked = false
  }

  render() {
    return html`
      <mwc-icon-button
        icon="${this.bookmarked ? 'bookmark' : 'bookmark_border'}"
        @click="${this._handleClick}"
        @keydown="${clickKeyHandler}"
        id="btn-star"
      ></mwc-icon-button>
      <grampsjs-tooltip for="btn-star">${this._('Bookmark')}</grampsjs-tooltip>
    `
  }

  _handleClick() {
    if (this.bookmarked) {
      this._handleUnmark()
    } else {
      this._handleMark()
    }
  }

  _handleUnmark() {
    deleteBookmark(this.endpoint, this.handle)
    this.bookmarked = false
  }

  _handleMark() {
    addBookmark(this.endpoint, this.handle)
    this.bookmarked = true
  }

  update(changed) {
    super.update(changed)
    if (changed.has('handle') || changed.has('endpoint')) {
      this._updateStatus()
    }
  }

  _updateStatus() {
    this.bookmarked = hasBookmark(this.endpoint, this.handle)
  }
}

window.customElements.define('grampsjs-bookmark-button', GrampsjsBookmarkButton)
