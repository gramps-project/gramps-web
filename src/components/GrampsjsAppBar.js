/*
The top app bar, with the page title, search, and the global actions, or, in
edit mode, the actions for the object being edited
*/

import {html, css, LitElement} from 'lit'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/filled-button.js'
import '@material/web/progress/circular-progress.js'
import '@material/web/progress/linear-progress.js'
import {
  mdiArrowLeft,
  mdiCheck,
  mdiChevronRight,
  mdiClose,
  mdiDelete,
  mdiMagnify,
  mdiMenu,
} from '@mdi/js'
import './GrampsjsIcon.js'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'

import './GrampsjsAddMenu.js'
import './GrampsjsNotificationMenu.js'
import './GrampsjsSettingsMenu.js'
import './GrampsjsTooltip.js'
import './GrampsjsSearchBox.js'

import {fireEvent} from '../util.js'
import {getTreeName} from '../api.js'
import {pageTitleParts, pageTitleDetail} from '../routing.js'
import {sharedStyles, appBarIconButtonStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsAppBar extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      appBarIconButtonStyles,
      css`
        :host {
          display: block;
          position: sticky;
          top: 0;
          z-index: 5;
        }

        header {
          position: relative;
          display: flex;
          align-items: center;
          gap: 4px;
          box-sizing: border-box;
          height: var(--grampsjs-app-bar-height, 64px);
          padding: 0 8px 0 16px;
          background-color: var(--grampsjs-top-app-bar-background-color);
          /* the icons; the title has the bar's font colour */
          color: var(--md-sys-color-on-surface-variant);
          transition: box-shadow 150ms;
        }

        header.scrolled {
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        header.menu {
          padding-left: 8px;
        }

        /* very narrow screens: smaller buttons, closer together, leave the
           title more room; the touch targets stay 48px */
        @media (max-width: 420px) {
          :host {
            --grampsjs-app-bar-button-size: 40px;
          }

          header,
          header.menu {
            gap: 0;
            padding: 0 4px;
          }

          header .title {
            margin-right: 4px;
          }
        }

        header.edit {
          background-color: var(--mdc-theme-secondary);
          color: var(--mdc-theme-on-secondary);
          padding-left: 8px;
        }

        .title {
          flex: 0 1 auto;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0 8px 0 24px;
          white-space: nowrap;
          font-family: var(--grampsjs-heading-font-family);
          font-size: 18px;
          font-weight: var(--grampsjs-font-weight-heading);
          color: var(--grampsjs-top-app-bar-font-color);
        }

        .title > * {
          flex: 0 0 auto;
        }

        /* the parts that give way first when the bar is too narrow */
        .title .tree,
        .title .current {
          flex: 0 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .title .tree {
          font-size: 15px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .title .sep {
          color: var(--md-sys-color-outline);
        }

        .title a:link,
        .title a:visited,
        .title a:hover {
          color: var(--md-sys-color-on-surface-variant);
          font-weight: var(--grampsjs-font-weight-medium);
          text-decoration: none;
        }

        .title a:hover {
          text-decoration: underline;
          text-decoration-thickness: 1px;
        }

        .title grampsjs-icon {
          color: var(--md-sys-color-outline);
        }

        header.edit .title {
          color: inherit;
        }

        header.menu .title,
        header.edit .title {
          margin-left: 4px;
        }

        .spacer {
          flex: 1 1 0;
        }

        grampsjs-search-box {
          flex: 0 3 360px;
          min-width: 160px;
          margin-right: 8px;
        }

        /* on small screens, the search field takes the whole bar */
        header.searching grampsjs-search-box {
          flex: 1 1 auto;
          margin-right: 4px;
        }

        md-filled-button.save {
          margin-left: 12px;
          --md-filled-button-container-color: var(--mdc-theme-on-secondary);
          --md-filled-button-label-text-color: var(--mdc-theme-secondary);
          --md-filled-button-hover-label-text-color: var(--mdc-theme-secondary);
          --md-filled-button-focus-label-text-color: var(--mdc-theme-secondary);
          --md-filled-button-pressed-label-text-color: var(
            --mdc-theme-secondary
          );
        }

        .action-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
        }

        .action-icon-wrapper md-circular-progress {
          --md-circular-progress-size: 24px;
          --md-circular-progress-active-indicator-width: 14;
          --md-circular-progress-active-indicator-color: currentColor;
        }

        @keyframes save-complete {
          0% {
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        .save-done-icon {
          animation: save-complete 3s ease-out forwards;
        }

        md-linear-progress {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          visibility: hidden;
          --md-linear-progress-active-indicator-color: var(
            --grampsjs-color-page-loading-progress
          );
          --md-linear-progress-track-color: transparent;
        }

        md-linear-progress.active {
          visibility: visible;
        }
      `,
    ]
  }

  static get properties() {
    return {
      editMode: {type: Boolean},
      editTitle: {type: String},
      editDialogContent: {attribute: false},
      saveButton: {type: Boolean},
      hideDeleteButton: {type: Boolean},
      saving: {type: Boolean},
      saveComplete: {type: Boolean},
      progress: {type: Boolean},
      menuButton: {type: Boolean},
      showTreeName: {type: Boolean},
      pageTitle: {attribute: false},
      _scrolled: {state: true},
      _searching: {state: true},
    }
  }

  constructor() {
    super()
    this.editMode = false
    this.editTitle = ''
    this.editDialogContent = ''
    this.saveButton = false
    this.hideDeleteButton = false
    this.saving = false
    this.saveComplete = false
    this.progress = false
    this.menuButton = false
    this.showTreeName = false
    this.pageTitle = null
    this._scrolled = false
    // the search field fills the bar on small screens
    this._searching = false
    this._handleScroll = this._handleScroll.bind(this)
    this._focusSearch = this._focusSearch.bind(this)
    this._enableEditMode = this._enableEditMode.bind(this)
    this._disableEditMode = this._disableEditMode.bind(this)
    this._handleCloseRequest = this._handleCloseRequest.bind(this)
  }

  get _small() {
    return this.appState.screenSize === 'small'
  }

  render() {
    if (this._searching && this._small && !this.editMode) {
      return this._renderSearching()
    }
    const classes = [
      this.editMode ? 'edit' : '',
      this._scrolled ? 'scrolled' : '',
      this.menuButton ? 'menu' : '',
    ].join(' ')
    return html`
      <header class="${classes}">
        ${this.editMode ? this._renderCloseButton() : this._renderMenuButton()}
        <div id="app-title" class="title">
          ${this.editMode && this.editTitle
            ? html`<span class="current">${this.editTitle}</span>`
            : this._renderPageTitle()}
        </div>
        <div class="spacer"></div>
        ${this._renderSavingIndicator()}
        ${this.editMode ? this._renderEditActions() : this._renderActions()}
        <md-linear-progress
          ?indeterminate="${this.progress}"
          class="${this.progress ? 'active' : ''}"
        ></md-linear-progress>
      </header>
      ${this.editDialogContent}
    `
  }

  _renderSearching() {
    return html`
      <header class="searching ${this._scrolled ? 'scrolled' : ''}">
        <md-icon-button
          aria-label="${this._('Close')}"
          @click="${this._closeSearch}"
        >
          <grampsjs-icon
            path="${mdiArrowLeft}"
            color="currentColor"
          ></grampsjs-icon>
        </md-icon-button>
        ${this._renderSearchField()}
        <md-linear-progress
          ?indeterminate="${this.progress}"
          class="${this.progress ? 'active' : ''}"
        ></md-linear-progress>
      </header>
      ${this.editDialogContent}
    `
  }

  async _openSearch() {
    this._searching = true
    await this.updateComplete
    this.renderRoot.querySelector('grampsjs-search-box')?.focus()
  }

  // The keyboard shortcut: focuses the field in the bar, which the search page
  // and edit mode do not show
  _focusSearch() {
    if (this.editMode || this.appState.path.page === 'search') {
      this._handleNav('search')
    } else if (this._small) {
      this._openSearch()
    } else {
      this.renderRoot.querySelector('grampsjs-search-box')?.focus()
    }
  }

  _closeSearch() {
    this._searching = false
  }

  // The page's title, from the outermost part, each part but the last leading
  // to the page it names. The last part is the current page, unless it has a
  // link of its own, which leads up from the current page. With the drawer
  // collapsed, the tree's name comes
  // first, since the drawer then does not show it. Small screens have room
  // for the last part only.
  _renderPageTitle() {
    const {path} = this.appState
    const allParts = pageTitleParts(path, pageTitleDetail(path, this.pageTitle))
    const parts = this._small ? allParts.slice(-1) : allParts
    const treeName = this.showTreeName ? getTreeName(this.appState) : ''
    return html`
      ${treeName
        ? html`<span class="tree" title="${treeName}">${treeName}</span>
            ${parts.length ? html`<span class="sep">·</span>` : ''}`
        : ''}
      ${parts.map((part, index) => {
        const title = part.literal ? part.title : this._(part.title)
        const isLast = index === parts.length - 1
        return html`
          ${index > 0
            ? html`<grampsjs-icon
                path="${mdiChevronRight}"
                color="currentColor"
                height="18"
                width="18"
              ></grampsjs-icon>`
            : ''}
          ${isLast && !part.href
            ? html`<span class="current" aria-current="page">${title}</span>`
            : html`<a href="${part.href}">${title}</a>`}
        `
      })}
    `
  }

  _renderMenuButton() {
    if (!this.menuButton) {
      return ''
    }
    return html`<md-icon-button
      aria-label="${this._('Menu')}"
      @click="${this._toggleDrawer}"
    >
      <grampsjs-icon path="${mdiMenu}" color="currentColor"></grampsjs-icon>
    </md-icon-button>`
  }

  _renderCloseButton() {
    return html`<md-icon-button
        id="button-close"
        aria-label="${this._('Stop editing')}"
        @click="${this._handleCloseRequest}"
      >
        <grampsjs-icon path="${mdiClose}" color="currentColor"></grampsjs-icon>
      </md-icon-button>
      <grampsjs-tooltip for="button-close" .appState="${this.appState}"
        >${this._('Stop editing')}</grampsjs-tooltip
      >`
  }

  _renderSavingIndicator() {
    if (this.saving) {
      return html`<span class="action-icon-wrapper" id="button-saving">
          <md-circular-progress indeterminate></md-circular-progress>
        </span>
        <grampsjs-tooltip for="button-saving" .appState="${this.appState}"
          >${this._('Saving...')}</grampsjs-tooltip
        >`
    }
    if (this.saveComplete) {
      return html`<span
          class="action-icon-wrapper save-done-icon"
          id="button-saved"
        >
          <grampsjs-icon
            path="${mdiCheck}"
            color="currentColor"
            height="20"
            width="20"
          ></grampsjs-icon>
        </span>
        <grampsjs-tooltip for="button-saved" .appState="${this.appState}"
          >${this._('Saved')}</grampsjs-tooltip
        >`
    }
    return ''
  }

  _renderEditActions() {
    return html`
      ${this.hideDeleteButton
        ? ''
        : html`<md-icon-button
              id="button-delete"
              aria-label="${this._('_Delete')}"
              @click="${this._handleDeleteIcon}"
            >
              <grampsjs-icon
                path="${mdiDelete}"
                color="currentColor"
              ></grampsjs-icon>
            </md-icon-button>
            <grampsjs-tooltip for="button-delete" .appState="${this.appState}"
              >${this._('_Delete')}</grampsjs-tooltip
            >`}
      ${this.saveButton
        ? html`<md-filled-button class="save" @click="${this._handleSaveIcon}"
            >${this._('_Save')}</md-filled-button
          >`
        : ''}
    `
  }

  _renderActions() {
    const onSearchPage = this.appState.path.page === 'search'
    return html`
      ${this._small || onSearchPage ? '' : this._renderSearchField()}
      ${this._small && !onSearchPage ? this._renderSearchButton() : ''}
      ${this.appState.permissions.canAdd
        ? html`<grampsjs-add-menu
            .appState="${this.appState}"
            ?labelled="${!this._small}"
          ></grampsjs-add-menu>`
        : ''}
      <grampsjs-notification-menu
        .appState="${this.appState}"
        id="button-notifications"
      ></grampsjs-notification-menu>
      <grampsjs-tooltip for="button-notifications" .appState="${this.appState}"
        >${this._('Notifications')}</grampsjs-tooltip
      >
      <grampsjs-settings-menu
        .appState="${this.appState}"
        id="button-settings"
      ></grampsjs-settings-menu>
      <grampsjs-tooltip for="button-settings" .appState="${this.appState}"
        >${this._('Settings')}</grampsjs-tooltip
      >
    `
  }

  _renderSearchField() {
    return html`<grampsjs-search-box
      .appState="${this.appState}"
      ?fullwidth="${this._small}"
      @search-box:done="${this._closeSearch}"
    ></grampsjs-search-box>`
  }

  _renderSearchButton() {
    return html`<md-icon-button
        id="button-search"
        aria-label="${this._('Search')}"
        @click="${this._openSearch}"
      >
        <grampsjs-icon
          path="${mdiMagnify}"
          color="currentColor"
        ></grampsjs-icon>
      </md-icon-button>
      <grampsjs-tooltip for="button-search" .appState="${this.appState}"
        >${this._('Search')}</grampsjs-tooltip
      >`
  }

  _handleScroll() {
    const scrolled = window.scrollY > 0
    if (scrolled !== this._scrolled) {
      this._scrolled = scrolled
    }
  }

  _toggleDrawer() {
    fireEvent(this, 'drawer:toggle')
  }

  _handleNav(path) {
    fireEvent(this, 'nav', {path})
  }

  _handleCloseRequest() {
    if (this.saveButton) {
      this.editDialogContent = html`
        <md-dialog open @cancel="${e => e.preventDefault()}">
          <div slot="content">${this._('Abort changes?')}</div>
          <div slot="actions">
            <md-text-button @click="${() => this._handleDialogCancel()}">
              ${this._('Cancel')}
            </md-text-button>
            <md-text-button @click="${() => this._handleDialogDiscard()}">
              ${this._('Discard')}
            </md-text-button>
          </div>
        </md-dialog>
      `
    } else {
      this._editModeOff()
    }
  }

  async _handleDeleteIcon() {
    // the view being edited says whether it can be deleted, at this moment
    const check = {}
    fireEvent(this, 'edit-mode:delete-check', check)
    const blocked = await check.blocked
    if (blocked) {
      this.editDialogContent = html`
        <md-dialog open @cancel="${e => e.preventDefault()}">
          <div slot="headline">${blocked.title}</div>
          <div slot="content">${blocked.message}</div>
          <div slot="actions">
            <md-text-button @click="${() => this._handleDialogCancel()}">
              ${this._('OK')}
            </md-text-button>
          </div>
        </md-dialog>
      `
      return
    }
    this.editDialogContent = html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <div slot="content">${this._('Delete this object?')}</div>
        <div slot="actions">
          <md-text-button @click="${() => this._handleDialogCancel()}">
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button @click="${() => this._handleDialogDelete()}">
            ${this._('_Delete')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _handleDialogCancel() {
    this.editDialogContent = ''
  }

  _handleDialogDiscard() {
    fireEvent(this, 'edit:cancel', {})
    this._editModeOff()
    this.editDialogContent = ''
  }

  _handleDialogDelete() {
    this._deleteObject()
    this.editDialogContent = ''
  }

  _editModeOff() {
    fireEvent(this, 'edit-mode:off', {})
  }

  _handleSaveIcon() {
    fireEvent(this, 'edit-mode:save')
  }

  _disableEditMode() {
    this.editMode = false
  }

  _enableEditMode(e) {
    this.editMode = true
    this.editTitle = e.detail.title
    this.saveButton = e.detail?.saveButton || false
    this.hideDeleteButton = e.detail?.hideDeleteButton || false
  }

  _deleteObject() {
    fireEvent(this, 'edit-mode:delete')
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('scroll', this._handleScroll, {passive: true})
    window.addEventListener('search:focus', this._focusSearch)
    window.addEventListener('edit-mode:on', this._enableEditMode)
    window.addEventListener('edit-mode:off', this._disableEditMode)
    window.addEventListener('edit-mode:close-request', this._handleCloseRequest)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('scroll', this._handleScroll)
    window.removeEventListener('search:focus', this._focusSearch)
    window.removeEventListener('edit-mode:on', this._enableEditMode)
    window.removeEventListener('edit-mode:off', this._disableEditMode)
    window.removeEventListener(
      'edit-mode:close-request',
      this._handleCloseRequest
    )
  }
}

window.customElements.define('grampsjs-app-bar', GrampsjsAppBar)
