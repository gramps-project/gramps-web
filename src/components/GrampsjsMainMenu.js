/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-list'

import './GrampsJsListItem.js'

import {mdiFamilyTree, mdiChat, mdiDna} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {renderIcon} from '../icons.js'

const BASE_DIR = ''

const selectedColor = '#393939'
const defaultColor = '#9e9e9e'

class GrampsjsAppBar extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        grampsjs-list-item span {
          color: #444;
        }

        grampsjs-list-item[selected] span {
          color: #393939;
          font-weight: 500;
        }

        grampsjs-list-item[selected] mwc-icon {
          color: #393939;
        }

        span.raise {
          position: relative;
          top: -2px;
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
      canUseChat: {type: Boolean},
      page: {type: String},
      pageId: {type: String},
      pageId2: {type: String},
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
    this.canUseChat = false
    this.page = ''
    this.pageId = ''
    this.pageId2 = ''
  }

  render() {
    return html` <mwc-list>
      <grampsjs-list-item
        href="${BASE_DIR}/"
        graphic="icon"
        ?selected="${this.page === 'home'}"
      >
        <span>${this._('Home Page')}</span>
        <mwc-icon slot="graphic">home</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item
        href="${BASE_DIR}/blog"
        graphic="icon"
        ?selected="${this.page === 'blog'}"
      >
        <span>${this._('Blog')}</span>
        <mwc-icon slot="graphic">rss_feed</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item
        href="${BASE_DIR}/people"
        graphic="icon"
        ?selected="${[
          'people',
          'families',
          'events',
          'places',
          'citations',
          'sources',
          'repositories',
          'notes',
          'medialist',
        ].includes(this.page)}"
      >
        <span>${this._('Lists')}</span>
        <mwc-icon slot="graphic">list</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item
        href="${BASE_DIR}/map"
        graphic="icon"
        ?selected="${this.page === 'map'}"
      >
        <span>${this._('Map')}</span>
        <mwc-icon slot="graphic">map</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item
        href="${BASE_DIR}/tree"
        graphic="icon"
        ?selected="${this.page === 'tree'}"
      >
        <span>${this._('Family Tree')}</span>
        <mwc-icon slot="graphic"
          ><span class="raise"
            >${renderIcon(
              mdiFamilyTree,
              this.page === 'tree' ? selectedColor : defaultColor
            )}</span
          ></mwc-icon
        >
      </grampsjs-list-item>
      <grampsjs-list-item
        href="${BASE_DIR}/dna-matches"
        graphic="icon"
        ?selected="${['dna-matches', 'dna-chromosome'].includes(this.page)}"
      >
        <span>${this._('DNA')}</span>
        <mwc-icon slot="graphic"
          ><span class="raise"
            >${renderIcon(
              mdiDna,
              ['dna-matches', 'dna-chromosome'].includes(this.page)
                ? selectedColor
                : defaultColor
            )}</span
          ></mwc-icon
        >
      </grampsjs-list-item>
      ${this.canUseChat
        ? html`
            <grampsjs-list-item
              href="${BASE_DIR}/chat"
              graphic="icon"
              ?selected="${this.page === 'chat'}"
            >
              <span>${this._('Chat')}</span>
              <mwc-icon slot="graphic"
                ><span class="raise"
                  >${renderIcon(
                    mdiChat,
                    this.page === 'chat' ? selectedColor : defaultColor
                  )}</span
                ></mwc-icon
              >
            </grampsjs-list-item>
          `
        : ''}
      <li divider padded role="separator"></li>
      <grampsjs-list-item
        href="${BASE_DIR}/recent"
        graphic="icon"
        ?selected="${this.page === 'recent'}"
      >
        <span>${this._('History')}</span>
        <mwc-icon slot="graphic">history</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item
        href="${BASE_DIR}/bookmarks"
        graphic="icon"
        ?selected="${this.page === 'bookmarks'}"
      >
        <span>${this._('_Bookmarks')}</span>
        <mwc-icon slot="graphic">bookmark</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item
        href="${BASE_DIR}/tasks"
        graphic="icon"
        ?selected="${this.page === 'tasks'}"
      >
        <span>${this._('Tasks')}</span>
        <mwc-icon slot="graphic">checklist</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item
        href="${BASE_DIR}/export"
        graphic="icon"
        ?selected="${this.page === 'export'}"
      >
        <span>${this._('Export')}</span>
        <mwc-icon slot="graphic">download_file</mwc-icon>
      </grampsjs-list-item>
      <grampsjs-list-item
        href="${BASE_DIR}/reports"
        graphic="icon"
        ?selected="${this.page === 'reports'}"
      >
        <span>${this._('_Reports').replace('_', '')}</span>
        <mwc-icon slot="graphic">menu_book</mwc-icon>
      </grampsjs-list-item>
      ${this.canViewPrivate
        ? html`
            <grampsjs-list-item
              href="${BASE_DIR}/revisions"
              graphic="icon"
              ?selected="${this.page === 'revisions'}"
            >
              <span>${this._('Revisions')}</span>
              <mwc-icon slot="graphic">commit</mwc-icon>
            </grampsjs-list-item>
          `
        : ''}
    </mwc-list>`
  }
}

window.customElements.define('grampsjs-main-menu', GrampsjsAppBar)
