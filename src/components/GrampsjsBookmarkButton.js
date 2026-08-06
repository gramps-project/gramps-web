import {LitElement, html, css} from 'lit'

import '@material/web/iconbutton/icon-button.js'

import {mdiBookmark, mdiBookmarkOutline} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {clickKeyHandler, fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsTooltip.js'
import './GrampsjsIcon.js'
import {addBookmark, deleteBookmark, hasBookmark} from '../api.js'

export class GrampsjsBookmarkButton extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-icon-button {
          --md-icon-button-icon-color: currentColor;
          --md-icon-button-hover-icon-color: currentColor;
          --md-icon-button-focus-icon-color: currentColor;
          --md-icon-button-pressed-icon-color: currentColor;
        }
      `,
    ]
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
      <md-icon-button
        aria-label="${this.bookmarked
          ? this._('Remove bookmark')
          : this._('Bookmark this')}"
        @click="${this._handleClick}"
        @keydown="${clickKeyHandler}"
        id="btn-star"
      >
        <grampsjs-icon
          path="${this.bookmarked ? mdiBookmark : mdiBookmarkOutline}"
          color="currentColor"
        ></grampsjs-icon>
      </md-icon-button>
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
