import {LitElement, html} from 'lit'

import '@material/mwc-icon-button'

import {sharedStyles} from '../SharedStyles.js'
import {clickKeyHandler, fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsTooltip.js'
import {addBookmark, deleteBookmark, hasBookmark} from '../api.js'

export class GrampsjsBookmarkButton extends GrampsjsAppStateMixin(LitElement) {
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
      <grampsjs-tooltip
        for="btn-star"
        content="${this.bookmarked
          ? this._('Remove bookmark')
          : this._('Bookmark this')}"
      ></grampsjs-tooltip>
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
    fireEvent(this, 'bookmark:changed')
    this.bookmarked = false
  }

  _handleMark() {
    addBookmark(this.endpoint, this.handle)
    fireEvent(this, 'bookmark:changed')
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
