/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
import {css, html, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {fireEvent} from '../util.js'
import '@material/mwc-icon-button'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsEditableList extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-list,
        md-list > * {
          --md-ripple-hover-opacity: 0;
          --md-ripple-pressed-opacity: 0;
        }

        md-list > * {
          transition: background-color 0.1s, color 0.1s;
        }

        /* Increase vertical spacing to match mwc-list-item */
        md-list-item {
          --md-list-item-one-line-container-height: 64px;
          --md-list-item-two-line-container-height: 80px;
          --md-list-item-three-line-container-height: 96px;
          --md-list-item-top-space: 12px;
          --md-list-item-bottom-space: 12px;
        }

        md-list.activatable md-list-item.selected {
          background-color: var(
            --grampsjs-editable-list-selected-background-color,
            color-mix(in srgb, var(--md-sys-color-primary) 12%, transparent)
          );
        }

        md-list.activatable md-list-item:not(.selected):hover,
        md-list.activatable md-list-item:not(.selected):focus {
          background-color: var(
            --grampsjs-editable-list-hover-background-color,
            color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)
          );
        }

        md-list.activatable md-list-item:not(.selected):active {
          background-color: var(
            --grampsjs-editable-list-active-background-color,
            color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent)
          );
        }

        md-list.activatable md-list-item.selected:hover,
        md-list.activatable md-list-item.selected:focus {
          background-color: var(
            --grampsjs-editable-list-selected-hover-background-color,
            color-mix(in srgb, var(--md-sys-color-primary) 16%, transparent)
          );
          color: var(--grampsjs-body-font-color-90);
        }

        md-list.activatable md-list-item.selected:active {
          background-color: var(
            --grampsjs-editable-list-selected-active-background-color,
            color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent)
          );
        }

        mwc-icon-button {
          --mdc-theme-text-disabled-on-light: var(
            --grampsjs-body-font-color-25
          );
        }

        /* Icon styling - replicate mwc-list-item graphic="avatar" */
        grampsjs-img[slot='start'],
        grampsjs-icon[slot='start'],
        mwc-icon[slot='start'] {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          overflow: hidden;
          border-radius: 50%;
          flex-shrink: 0;
        }

        grampsjs-icon[slot='start'] {
          background-color: var(--grampsjs-color-icon-background);
        }

        mwc-icon.placeholder {
          width: 40px;
          height: 40px;
          line-height: 40px;
          border-radius: 50%;
        }

        /* Cursor for clickable items in view mode */
        md-list:not(.activatable) md-list-item[type='button'] {
          cursor: pointer;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      edit: {type: Boolean},
      objType: {type: String},
      dialogContent: {type: String},
      dialogTitle: {type: String},
      hasAdd: {type: Boolean},
      hasShare: {type: Boolean},
      hasEdit: {type: Boolean},
      hasReorder: {type: Boolean},
      _selectedIndex: {type: Number},
    }
  }

  constructor() {
    super()
    this.data = []
    this.edit = false
    this.objType = ''
    this.dialogContent = ''
    this.dialogTitle = ''
    this.hasAdd = true
    this.hasShare = false
    this.hasEdit = false
    this.hasReorder = false
    this._selectedIndex = -1
  }

  render() {
    return html`
      ${Object.keys(this.data).length === 0 && !this.edit
        ? ''
        : html`
            ${this.edit ? this._renderActionBtns() : ''}
            <md-list class="${classMap({activatable: this.edit})}">
              ${this.sortData([...this.data]).map((obj, i, arr) =>
                this.row(obj, i, arr)
              )}
            </md-list>
          `}
      ${this.dialogContent}
    `
  }

  _handleSelected(i) {
    this._selectedIndex = i
  }

  // function to sort the data, if necessary
  sortData(dataCopy) {
    return dataCopy
  }

  row(obj, i, arr) {
    return ''
  }

  _renderActionBtns() {
    return html`
      ${this.hasShare
        ? html`
            <mwc-icon-button
              class="edit"
              icon="add_link"
              @click="${this._handleShare}"
            ></mwc-icon-button>
          `
        : ''}
      ${this.hasAdd
        ? html`
            <mwc-icon-button
              class="edit"
              icon="add"
              @click="${this._handleAdd}"
            ></mwc-icon-button>
          `
        : ''}
      ${this.hasEdit
        ? html`
            <mwc-icon-button
              ?disabled="${this._selectedIndex === -1}"
              class="edit"
              icon="edit"
              @click="${this._handleEdit}"
            ></mwc-icon-button>
          `
        : ''}
      ${this.hasReorder
        ? html`
            <mwc-icon-button
              ?disabled="${this._selectedIndex === -1 ||
              this._selectedIndex === 0}"
              class="edit"
              icon="arrow_upward"
              @click="${this._handleUp}"
            ></mwc-icon-button>
            <mwc-icon-button
              ?disabled="${this._selectedIndex === -1 ||
              this._selectedIndex === this.data.length - 1}"
              class="edit"
              icon="arrow_downward"
              @click="${this._handleDown}"
            ></mwc-icon-button>
          `
        : ''}
      <mwc-icon-button
        ?disabled="${this._selectedIndex === -1}"
        class="edit"
        icon="delete"
        @click="${this._handleDelete}"
      ></mwc-icon-button>
    `
  }

  updated(changed) {
    if (changed.has('edit')) {
      this._selectedIndex = -1
      this.dialogContent = ''
    }
  }

  _updateSelectionAfterReorder(movedUp) {
    // Clear selection to avoid highlighting wrong item while API call completes.
    // The movedUp parameter is provided for subclasses that may want to track
    // and restore selection after the data updates.
    this._selectedIndex = -1
  }

  _handleActionClick(e, action, handle) {
    fireEvent(this, 'edit:action', {action, handle})
    e.preventDefault()
    e.stopPropagation()
  }
}
