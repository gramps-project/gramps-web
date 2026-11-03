/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
import {css, html, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {fireEvent} from '../util.js'
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiDelete,
  mdiLinkPlus,
  mdiPencil,
  mdiPlus,
} from '@mdi/js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'

import {
  personListItemStyles,
  reorderableStyles,
  sharedStyles,
} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {DragReorderController} from '../dragReorderController.js'

export class GrampsjsEditableList extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      personListItemStyles,
      reorderableStyles,
      css`
        md-list.activatable,
        md-list.activatable > * {
          --md-ripple-hover-opacity: 0;
          --md-ripple-pressed-opacity: 0;
        }

        md-list.activatable > * {
          transition: background-color 0.1s, color 0.1s;
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

        md-icon-button[disabled] {
          color: var(--grampsjs-body-font-color-25);
        }

        md-list.reorderable > [dragging] {
          background-color: var(--md-sys-color-surface-container-high);
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
    // the property of the edited object holding the list, for reordering
    this.listProp = ''
    this._selectedIndex = -1
    this._pendingSelection = null
    this._dragReorder = new DragReorderController(this, {
      getContainer: () =>
        this.edit && this.hasReorder
          ? this.renderRoot.querySelector('md-list')
          : null,
      getCount: () => this.data.length,
      onMove: (from, to) => this._moveItem(from, to),
    })
  }

  render() {
    return html`
      ${Object.keys(this.data).length === 0 && !this.edit
        ? ''
        : html`
            ${this.edit ? this._renderActionBtns() : ''}
            <md-list
              class="${classMap({
                activatable: this.edit,
                reorderable: this.edit && this.hasReorder,
              })}"
              @pointerdown="${this._dragReorder.handlePointerDown}"
              @dragstart="${this._dragReorder.handleDragStart}"
            >
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
            <md-icon-button class="edit" @click="${this._handleShare}">
              <grampsjs-icon
                path="${mdiLinkPlus}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
      ${this.hasAdd
        ? html`
            <md-icon-button class="edit" @click="${this._handleAdd}">
              <grampsjs-icon
                path="${mdiPlus}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
      ${this.hasEdit
        ? html`
            <md-icon-button
              ?disabled="${this._selectedIndex === -1}"
              class="edit"
              @click="${this._handleEdit}"
            >
              <grampsjs-icon
                path="${mdiPencil}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
      ${this.hasReorder
        ? html`
            <md-icon-button
              ?disabled="${this._selectedIndex === -1 ||
              this._selectedIndex === 0}"
              class="edit"
              @click="${this._handleUp}"
            >
              <grampsjs-icon
                path="${mdiArrowUp}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
            <md-icon-button
              ?disabled="${this._selectedIndex === -1 ||
              this._selectedIndex === this.data.length - 1}"
              class="edit"
              @click="${this._handleDown}"
            >
              <grampsjs-icon
                path="${mdiArrowDown}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          `
        : ''}
      <md-icon-button
        ?disabled="${this._selectedIndex === -1}"
        class="edit"
        @click="${this._handleDelete}"
      >
        <grampsjs-icon
          path="${mdiDelete}"
          color="var(--mdc-theme-secondary)"
        ></grampsjs-icon>
      </md-icon-button>
    `
  }

  updated(changed) {
    if (changed.has('edit') || changed.has('data')) {
      // the rows under an ongoing drag may have changed
      this._dragReorder.end()
    }
    if (changed.has('edit')) {
      this._selectedIndex = -1
      this._pendingSelection = null
      this.dialogContent = ''
    } else if (changed.has('data') && this._pendingSelection) {
      // Select the moved item again at its new position once the reordered
      // data has arrived. If the move failed, another item is there.
      const {index, item} = this._pendingSelection
      if (JSON.stringify(this.data?.[index]) === item) {
        this._selectedIndex = index
      }
      this._pendingSelection = null
    }
  }

  _handleUp() {
    this._moveItem(this._selectedIndex, this._selectedIndex - 1)
  }

  _handleDown() {
    this._moveItem(this._selectedIndex, this._selectedIndex + 1)
  }

  _moveItem(from, to) {
    const n = this.data?.length ?? 0
    if (from < 0 || from >= n || to < 0 || to >= n || from === to) {
      return
    }
    // Clear selection to avoid highlighting the wrong item while the API
    // call completes, and remember the moved item and its new position to
    // select it again afterwards.
    this._pendingSelection = {index: to, item: JSON.stringify(this.data[from])}
    this._selectedIndex = -1
    this._handleMove(from, to)
  }

  // fires the edit action that moves the item at index `from` to index `to`
  _handleMove(from, to) {
    fireEvent(this, 'edit:action', {
      action: 'moveListItem',
      prop: this.listProp,
      index: from,
      to,
    })
  }

  _handleActionClick(e, action, handle) {
    fireEvent(this, 'edit:action', {action, handle})
    e.preventDefault()
    e.stopPropagation()
  }
}
