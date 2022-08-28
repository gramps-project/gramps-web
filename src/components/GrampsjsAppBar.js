/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import '@material/mwc-top-app-bar'
import '@material/mwc-icon-button'
import '@material/mwc-icon'
import '@material/mwc-dialog'

import './GrampsjsAddMenu.js'

import {fireEvent} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

class GrampsjsAppBar extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-top-app-bar {
          --mdc-typography-headline6-font-family: Roboto Slab;
          --mdc-typography-headline6-font-weight: 400;
          --mdc-typography-headline6-font-size: 19px;
        }

        mwc-top-app-bar.edit {
          --mdc-theme-primary: var(--mdc-theme-secondary);
          --mdc-theme-on-primary: var(--mdc-theme-on-secondary);
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
    }
  }

  constructor() {
    super()
    this.add = false
    this.editMode = false
    this.editTitle = ''
    this.editDialogContent = ''
    this.saveButton = false
  }

  render() {
    return html`
      <mwc-top-app-bar class="${classMap({edit: this.editMode})}">
        ${this.editMode
          ? html`<mwc-icon-button
              slot="navigationIcon"
              icon="close"
              @click="${this._handleCloseIcon}"
            ></mwc-icon-button>`
          : html`<mwc-icon-button
              slot="navigationIcon"
              icon="menu"
              @click="${this._toggleDrawer}"
            ></mwc-icon-button>`}
        <div id="app-title" slot="title">
          ${this.editMode && this.editTitle
            ? this.editTitle
            : this._dbInfo?.database?.name || 'Gramps'}
        </div>
        ${
          // eslint-disable-next-line no-nested-ternary
          this.editMode
            ? this.saveButton
              ? html`
                  <mwc-icon-button
                    icon="save"
                    slot="actionItems"
                    @click="${this._handleSaveIcon}"
                  ></mwc-icon-button>
                `
              : ''
            : html`
                ${this.add
                  ? html`
                      <grampsjs-add-menu
                        slot="actionItems"
                        .strings="${this.strings}"
                      ></grampsjs-add-menu>
                    `
                  : ''}
                <mwc-icon-button
                  icon="account_circle"
                  slot="actionItems"
                  @click="${() => this._handleNav('settings')}"
                ></mwc-icon-button>
                <mwc-icon-button
                  icon="search"
                  slot="actionItems"
                  @click="${() => this._handleNav('search')}"
                ></mwc-icon-button>
              `
        }
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

  _handleCloseIcon() {
    if (this.saveButton) {
      this.editDialogContent = html`
        <mwc-dialog open @closed="${this._handleDialog}">
          <div>${this._('Abort changes?')}</div>
          <mwc-button slot="primaryAction" dialogAction="discard">
            ${this._('Discard')}
          </mwc-button>
          <mwc-button slot="secondaryAction" dialogAction="cancel">
            ${this._('Cancel')}
          </mwc-button>
        </mwc-dialog>
      `
    } else {
      this._editModeOff()
    }
  }

  _handleDialog(e) {
    if (e.detail.action === 'discard') {
      this._editModeOff()
    }
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

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:on', e => this._enableEditMode(e))
    window.addEventListener('edit-mode:off', e => this._disableEditMode(e))
  }
}

window.customElements.define('grampsjs-app-bar', GrampsjsAppBar)
