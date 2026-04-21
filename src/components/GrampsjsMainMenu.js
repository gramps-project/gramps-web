/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/divider/divider'

import {
  mdiFamilyTree,
  mdiChat,
  mdiDna,
  mdiHome,
  mdiImage,
  mdiRss,
  mdiFormatListBulleted,
  mdiMap,
  mdiHistory,
  mdiBookmark,
  mdiFormatListChecks,
  mdiDownload,
  mdiBookOpenVariant,
  mdiSourceCommit,
  mdiLabel,
} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsIcon.js'

const BASE_DIR = ''

const selectedColor = 'var(--grampsjs-color-icon-selected)'
const defaultColor = 'var(--grampsjs-color-icon-default)'

class GrampsjsAppBar extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-list-item {
          --md-list-item-label-text-color: var(--grampsjs-color-drawer-text);
          --md-list-item-label-text-size: 1rem;
          --md-list-item-label-text-weight: 400;
        }

        md-list-item[selected] {
          --md-list-item-label-text-color: var(--grampsjs-color-icon-selected);
          --md-list-item-label-text-weight: 500;
        }

        md-divider {
          --md-divider-thickness: 1px;
          --md-divider-color: rgba(0, 0, 0, 0.12);
          padding: 0 20px;
          margin: 4px 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      editMode: {type: Boolean},
      editTitle: {type: String},
      editDialogContent: {type: String},
      saveButton: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.editMode = false
    this.editTitle = ''
    this.editDialogContent = ''
    this.saveButton = false
  }

  // eslint-disable-next-line class-methods-use-this
  _icon(path, isSelected) {
    return html`<grampsjs-icon
      slot="start"
      path="${path}"
      color="${isSelected ? selectedColor : defaultColor}"
    ></grampsjs-icon>`
  }

  render() {
    const p = this.appState.path.page
    return html` <md-list>
      <md-list-item
        type="link"
        href="${BASE_DIR + '/'}"
        ?selected="${p === 'home'}"
      >
        ${this._icon(mdiHome, p === 'home')} ${this._('Home')}
      </md-list-item>
      <md-list-item
        type="link"
        href="${BASE_DIR}/blog"
        ?selected="${p === 'blog'}"
      >
        ${this._icon(mdiRss, p === 'blog')} ${this._('Blog')}
      </md-list-item>
      <md-list-item
        type="link"
        href="${BASE_DIR}/people"
        ?selected="${[
          'people',
          'families',
          'events',
          'places',
          'citations',
          'sources',
          'repositories',
          'notes',
        ].includes(p)}"
      >
        ${this._icon(
          mdiFormatListBulleted,
          [
            'people',
            'families',
            'events',
            'places',
            'citations',
            'sources',
            'repositories',
            'notes',
          ].includes(p)
        )}
        ${this._('Lists')}
      </md-list-item>
      <md-list-item
        type="link"
        href="${BASE_DIR}/medialist"
        ?selected="${p === 'medialist'}"
      >
        ${this._icon(mdiImage, p === 'medialist')} ${this._('Media')}
      </md-list-item>
      <md-list-item
        type="link"
        href="${BASE_DIR}/map"
        ?selected="${p === 'map'}"
      >
        ${this._icon(mdiMap, p === 'map')} ${this._('Map')}
      </md-list-item>
      <md-list-item
        type="link"
        href="${BASE_DIR}/tree"
        ?selected="${p === 'tree'}"
      >
        ${this._icon(mdiFamilyTree, p === 'tree')} ${this._('Family Tree')}
      </md-list-item>
      ${this.appState.frontendConfig.hideDNALink
        ? ''
        : html`
            <md-list-item
              type="link"
              href="${BASE_DIR}/dna-matches"
              ?selected="${['dna-matches', 'dna-chromosome', 'ydna'].includes(
                p
              )}"
            >
              ${this._icon(
                mdiDna,
                ['dna-matches', 'dna-chromosome', 'ydna'].includes(p)
              )}
              ${this._('DNA')}
            </md-list-item>
          `}
      ${this.canUseChat
        ? html`
            <md-list-item
              type="link"
              href="${BASE_DIR}/chat"
              ?selected="${p === 'chat'}"
            >
              ${this._icon(mdiChat, p === 'chat')} ${this._('Chat')}
            </md-list-item>
          `
        : ''}
      <md-divider inset></md-divider>
      <md-list-item
        type="link"
        href="${BASE_DIR}/recent"
        ?selected="${p === 'recent'}"
      >
        ${this._icon(mdiHistory, p === 'recent')} ${this._('History')}
      </md-list-item>
      <md-list-item
        type="link"
        href="${BASE_DIR}/bookmarks"
        ?selected="${p === 'bookmarks'}"
      >
        ${this._icon(mdiBookmark, p === 'bookmarks')} ${this._('_Bookmarks')}
      </md-list-item>
      <md-list-item
        type="link"
        href="${BASE_DIR}/tasks"
        ?selected="${p === 'tasks'}"
      >
        ${this._icon(mdiFormatListChecks, p === 'tasks')} ${this._('Tasks')}
      </md-list-item>
      <md-list-item
        type="link"
        href="${BASE_DIR}/export"
        ?selected="${p === 'export'}"
      >
        ${this._icon(mdiDownload, p === 'export')} ${this._('Export')}
      </md-list-item>
      <md-list-item
        type="link"
        href="${BASE_DIR}/reports"
        ?selected="${p === 'reports'}"
      >
        ${this._icon(mdiBookOpenVariant, p === 'reports')}
        ${this._('_Reports').replace('_', '')}
      </md-list-item>
      ${this.appState.permissions.canViewPrivate
        ? html`
            <md-list-item
              type="link"
              href="${BASE_DIR}/revisions"
              ?selected="${p === 'revisions'}"
            >
              ${this._icon(mdiSourceCommit, p === 'revisions')}
              ${this._('Revisions')}
            </md-list-item>
          `
        : ''}
      ${this.appState.permissions.canEdit
        ? html`
            <md-list-item
              type="link"
              href="${BASE_DIR}/tags"
              ?selected="${p === 'tags'}"
            >
              ${this._icon(mdiLabel, p === 'tags')} ${this._('Tags')}
            </md-list-item>
          `
        : ''}
    </md-list>`
  }
}

window.customElements.define('grampsjs-main-menu', GrampsjsAppBar)
