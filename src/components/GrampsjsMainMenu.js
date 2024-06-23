/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-list'

import './GrampsJsListItem.js'

import {mdiFamilyTree} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {renderIcon} from '../icons.js'

const BASE_DIR = ''

class GrampsjsAppBar extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        grampsjs-list-item span {
          color: #444;
        }
      `,
    ]
  }

  static get properties() {
    return {
      add: {type: Boolean},
      editMode: {type: Boolean},
      editTitle: {type: String},
      editDialogContent: {type: String},
      saveButton: {type: Boolean},
      canViewPrivate: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.add = false
    this.editMode = false
    this.editTitle = ''
    this.editDialogContent = ''
    this.saveButton = false
    this.canViewPrivate = false
  }

  render() {
    return html` <mwc-list>
      <grampsjs-list-item href="${BASE_DIR}/" graphic="icon">
        <span>${this._('Home Page')}</span>
        <mwc-icon slot="graphic">home</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item href="${BASE_DIR}/blog" graphic="icon">
        <span>${this._('Blog')}</span>
        <mwc-icon slot="graphic">rss_feed</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item href="${BASE_DIR}/people" graphic="icon">
        <span>${this._('Lists')}</span>
        <mwc-icon slot="graphic">list</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item href="${BASE_DIR}/map" graphic="icon">
        <span>${this._('Map')}</span>
        <mwc-icon slot="graphic">map</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item href="${BASE_DIR}/tree" graphic="icon">
        <span>${this._('Family Tree')}</span>
        <mwc-icon slot="graphic">${renderIcon(mdiFamilyTree)}</mwc-icon>
      </grampsjs-list-item>
      <li divider padded role="separator"></li>
      <grampsjs-list-item href="${BASE_DIR}/recent" graphic="icon">
        <span>${this._('History')}</span>
        <mwc-icon slot="graphic">history</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item href="${BASE_DIR}/bookmarks" graphic="icon">
        <span>${this._('_Bookmarks')}</span>
        <mwc-icon slot="graphic">bookmark</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item href="${BASE_DIR}/tasks" graphic="icon">
        <span>${this._('Tasks')}</span>
        <mwc-icon slot="graphic">checklist</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item href="${BASE_DIR}/export" graphic="icon">
        <span>${this._('Export')}</span>
        <mwc-icon slot="graphic">download_file</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item href="${BASE_DIR}/reports" graphic="icon">
        <span>${this._('_Reports').replace('_', '')}</span>
        <mwc-icon slot="graphic">menu_book</mwc-icon>
      </grampsjs-list-item>
      ${this.canViewPrivate
        ? html`
            <grampsjs-list-item href="${BASE_DIR}/revisions" graphic="icon">
              <span>${this._('Revisions')}</span>
              <mwc-icon slot="graphic">commit</mwc-icon>
            </grampsjs-list-item>
          `
        : ''}
    </mwc-list>`
  }
}

window.customElements.define('grampsjs-main-menu', GrampsjsAppBar)
