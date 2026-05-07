/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import '@material/mwc-top-app-bar'
import '@material/mwc-icon-button'
import '@material/web/progress/circular-progress.js'
import {mdiCheck} from '@mdi/js'
import './GrampsjsIcon.js'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'

import './GrampsjsAddMenu.js'
import './GrampsjsSettingsMenu.js'
import './GrampsjsTooltip.js'

import {fireEvent} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsAppBar extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-top-app-bar {
          --mdc-typography-headline6-font-family: var(
            --grampsjs-heading-font-family
          );
          --mdc-typography-headline6-font-weight: 550;
          --mdc-typography-headline6-font-size: 17px;
          --mdc-theme-primary: var(--grampsjs-top-app-bar-background-color);
          --mdc-theme-on-primary: var(--grampsjs-top-app-bar-font-color);
        }

        mwc-top-app-bar.edit {
          --mdc-theme-primary: var(--mdc-theme-secondary);
          --mdc-theme-on-primary: var(--mdc-theme-on-secondary);
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
          --md-circular-progress-active-indicator-color: var(
            --grampsjs-top-app-bar-font-color
          );
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
      `,
    ]
  }

  static get properties() {
    return {
      editMode: {type: Boolean},
      editTitle: {type: String},
      editDialogContent: {type: String},
      saveButton: {type: Boolean},
      saving: {type: Boolean},
      saveComplete: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.editMode = false
    this.editTitle = ''
    this.editDialogContent = ''
    this.saveButton = false
    this.saving = false
    this.saveComplete = false
  }

  render() {
    const savingIndicator = this.saving
      ? html`<span
            slot="actionItems"
            class="action-icon-wrapper"
            id="button-saving"
          >
            <md-circular-progress indeterminate></md-circular-progress>
          </span>
          <grampsjs-tooltip for="button-saving" .appState="${this.appState}"
            >${this._('Saving...')}</grampsjs-tooltip
          >`
      : this.saveComplete
      ? html`<span
            slot="actionItems"
            class="action-icon-wrapper save-done-icon"
            id="button-saved"
          >
            <grampsjs-icon
              path="${mdiCheck}"
              color="var(--grampsjs-top-app-bar-font-color)"
              height="20"
              width="20"
            ></grampsjs-icon>
          </span>
          <grampsjs-tooltip for="button-saved" .appState="${this.appState}"
            >${this._('Saved')}</grampsjs-tooltip
          >`
      : ''

    return html`
      <mwc-top-app-bar class="${classMap({edit: this.editMode})}">
        ${this.editMode
          ? html`<mwc-icon-button
                slot="navigationIcon"
                icon="close"
                id="button-close"
                @click="${this._handleCloseRequest}"
              ></mwc-icon-button>
              <grampsjs-tooltip for="button-close" .appState="${this.appState}"
                >${this._('Stop editing')}</grampsjs-tooltip
              >`
          : html`<mwc-icon-button
              slot="navigationIcon"
              icon="menu"
              @click="${this._toggleDrawer}"
            ></mwc-icon-button>`}
        <div id="app-title" slot="title">
          ${this.editMode && this.editTitle
            ? this.editTitle
            : this.appState?.dbInfo?.database?.name || 'Gramps Web'}
        </div>
        ${savingIndicator}
        ${this.editMode
          ? html`
              ${this.saveButton
                ? html`<mwc-icon-button
                      icon="save"
                      slot="actionItems"
                      id="button-save"
                      @click="${this._handleSaveIcon}"
                    ></mwc-icon-button>
                    <grampsjs-tooltip
                      for="button-save"
                      .appState="${this.appState}"
                      >${this._('_Save')}</grampsjs-tooltip
                    >`
                : ''}
              <mwc-icon-button
                icon="delete"
                slot="actionItems"
                id="button-delete"
                @click="${this._handleDeleteIcon}"
              ></mwc-icon-button>
              <grampsjs-tooltip for="button-delete" .appState="${this.appState}"
                >${this._('_Delete')}</grampsjs-tooltip
              >
            `
          : html`
              ${this.appState.permissions.canAdd
                ? html`<grampsjs-add-menu
                      slot="actionItems"
                      .appState="${this.appState}"
                      id="button-add"
                    ></grampsjs-add-menu>
                    <grampsjs-tooltip
                      for="button-add"
                      .appState="${this.appState}"
                      >${this._('Add')}</grampsjs-tooltip
                    >`
                : ''}
              <grampsjs-settings-menu
                slot="actionItems"
                .appState="${this.appState}"
                id="button-settings"
              ></grampsjs-settings-menu>
              <grampsjs-tooltip
                for="button-settings"
                .appState="${this.appState}"
                >${this._('Preferences')}</grampsjs-tooltip
              >
              <mwc-icon-button
                icon="search"
                slot="actionItems"
                id="button-search"
                @click="${() => this._handleNav('search')}"
              ></mwc-icon-button>
              <grampsjs-tooltip for="button-search" .appState="${this.appState}"
                >${this._('Search')}</grampsjs-tooltip
              >
            `}
      </mwc-top-app-bar>
      ${this.editDialogContent}
    `
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

  _handleDeleteIcon() {
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
  }

  _deleteObject() {
    fireEvent(this, 'edit-mode:delete')
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:on', e => this._enableEditMode(e))
    window.addEventListener('edit-mode:off', e => this._disableEditMode(e))
    window.addEventListener('edit-mode:close-request', e =>
      this._handleCloseRequest(e)
    )
  }
}

window.customElements.define('grampsjs-app-bar', GrampsjsAppBar)
