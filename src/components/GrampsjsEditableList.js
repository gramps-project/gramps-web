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

import {personListItemStyles, sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

const LONG_PRESS_MS = 400
const TOUCH_SLOP_PX = 8
const MOUSE_SLOP_PX = 4
// wide enough to reach below the app bar at the top of the viewport
const AUTO_SCROLL_EDGE_PX = 80
const AUTO_SCROLL_MAX_PX = 12

// the nearest ancestor that scrolls vertically, across shadow roots
function scrollParent(el) {
  let node = el
  while (node) {
    node = node.assignedSlot ?? node.parentElement ?? node.getRootNode().host
    if (!node || node === document.body || node === document.documentElement) {
      break
    }
    const {overflowY} = getComputedStyle(node)
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight
    ) {
      return node
    }
  }
  return document.scrollingElement
}

export class GrampsjsEditableList extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      personListItemStyles,
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

        md-list.reorderable > * {
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }

        md-list.reorderable > [dragging] {
          position: relative;
          z-index: 1;
          cursor: grabbing;
          background-color: var(--md-sys-color-surface-container-high);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        md-list.reorderable > [drag-shift] {
          transition: transform 0.15s ease;
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
    this._drag = null
    this._handleDragMove = this._handleDragMove.bind(this)
    this._handleDragEnd = this._handleDragEnd.bind(this)
    this._handleDragCancel = this._handleDragCancel.bind(this)
    this._handleDragTouchMove = this._handleDragTouchMove.bind(this)
    this._handleDragKeyDown = this._handleDragKeyDown.bind(this)
    this._handleDragScroll = this._handleDragScroll.bind(this)
    this._autoScroll = this._autoScroll.bind(this)
  }

  disconnectedCallback() {
    this._endDrag()
    super.disconnectedCallback()
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
              @pointerdown="${this._handleDragStart}"
              @dragstart="${this._handleNativeDragStart}"
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
      this._endDrag()
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

  _handleNativeDragStart(e) {
    // a native drag of an image in a row would cancel the pointer drag
    if (this.edit && this.hasReorder) {
      e.preventDefault()
    }
  }

  _handleDragStart(e) {
    if (
      !this.edit ||
      !this.hasReorder ||
      this._drag ||
      !e.isPrimary ||
      e.button !== 0
    ) {
      return
    }
    const list = this.renderRoot.querySelector('md-list')
    const items = [...(list?.children ?? [])]
    const item = e.composedPath().find(el => items.includes(el))
    if (!item || items.length < 2 || items.length !== this.data.length) {
      return
    }
    const touch = e.pointerType === 'touch'
    this._drag = {
      pointerId: e.pointerId,
      touch,
      list,
      items,
      from: items.indexOf(item),
      to: items.indexOf(item),
      startX: e.clientX,
      startY: e.clientY,
      y: e.clientY,
      active: false,
      // touch drags start with a long press, so that swiping still scrolls
      timer: touch ? setTimeout(() => this._activateDrag(), LONG_PRESS_MS) : 0,
    }
    window.addEventListener('pointermove', this._handleDragMove)
    window.addEventListener('pointerup', this._handleDragEnd)
    window.addEventListener('pointercancel', this._handleDragCancel)
    window.addEventListener('touchmove', this._handleDragTouchMove, {
      passive: false,
    })
    window.addEventListener('contextmenu', this._handleDragTouchMove)
    window.addEventListener('keydown', this._handleDragKeyDown)
  }

  _activateDrag() {
    const drag = this._drag
    const listTop = drag.list.getBoundingClientRect().top
    drag.active = true
    drag.startOffset = drag.y - listTop
    drag.rows = drag.items.map(el => {
      const rect = el.getBoundingClientRect()
      return {top: rect.top - listTop, height: rect.height}
    })
    drag.items.forEach((el, i) => {
      el.toggleAttribute(i === drag.from ? 'dragging' : 'drag-shift', true)
    })
    drag.scroller = scrollParent(drag.list)
    drag.frame = requestAnimationFrame(this._autoScroll)
    // capture also catches scrolling inside containers
    window.addEventListener('scroll', this._handleDragScroll, true)
  }

  // scroll while the pointer is near the top or bottom edge of the scroller,
  // the faster the closer it gets to the edge
  _autoScroll() {
    const drag = this._drag
    const {scroller, y} = drag
    let top = 0
    let bottom = window.innerHeight
    if (scroller !== document.scrollingElement) {
      const rect = scroller.getBoundingClientRect()
      top = Math.max(top, rect.top)
      bottom = Math.min(bottom, rect.bottom)
    }
    let speed = 0
    if (y < top + AUTO_SCROLL_EDGE_PX) {
      speed = -Math.min(
        1,
        (top + AUTO_SCROLL_EDGE_PX - y) / AUTO_SCROLL_EDGE_PX
      )
    } else if (y > bottom - AUTO_SCROLL_EDGE_PX) {
      speed = Math.min(
        1,
        (y - bottom + AUTO_SCROLL_EDGE_PX) / AUTO_SCROLL_EDGE_PX
      )
    }
    if (speed) {
      scroller.scrollTop += Math.round(speed * AUTO_SCROLL_MAX_PX)
    }
    drag.frame = requestAnimationFrame(this._autoScroll)
  }

  _handleDragScroll() {
    // the list moved under the pointer, so the dragged row must follow it
    if (this._drag?.active) {
      this._updateDragPosition()
    }
  }

  _handleDragMove(e) {
    const drag = this._drag
    if (e.pointerId !== drag.pointerId) {
      return
    }
    drag.y = e.clientY
    if (!drag.active) {
      const distance = Math.hypot(
        e.clientX - drag.startX,
        e.clientY - drag.startY
      )
      if (drag.touch && distance > TOUCH_SLOP_PX) {
        // moving before the long press is over is a scroll
        this._endDrag()
      } else if (!drag.touch && distance > MOUSE_SLOP_PX) {
        this._activateDrag()
      }
    }
    if (this._drag?.active) {
      this._updateDragPosition()
    }
  }

  _updateDragPosition() {
    const {list, rows, from, items, startOffset, y} = this._drag
    const row = rows[from]
    const last = rows[rows.length - 1]
    // offsets are relative to the list, so scrolling during a drag works
    const offset = y - list.getBoundingClientRect().top - startOffset
    const dy = Math.min(
      Math.max(offset, -row.top),
      last.top + last.height - row.top - row.height
    )
    // a row is passed once the leading edge of the dragged row crosses its
    // middle, so the first and last position are reachable within the list
    const top = row.top + dy
    const bottom = top + row.height
    const to =
      from +
      rows.filter((r, i) => i > from && r.top + r.height / 2 < bottom).length -
      rows.filter((r, i) => i < from && r.top + r.height / 2 > top).length
    this._drag.to = to
    items.forEach((el, i) => {
      let shift = 0
      if (i === from) {
        shift = dy
      } else if (from < i && i <= to) {
        shift = -row.height
      } else if (to <= i && i < from) {
        shift = row.height
      }
      // eslint-disable-next-line no-param-reassign
      el.style.transform = shift ? `translateY(${shift}px)` : ''
    })
  }

  _handleDragEnd(e) {
    if (e.pointerId !== this._drag.pointerId) {
      return
    }
    const {active, from, to} = this._drag
    this._endDrag()
    if (active) {
      // the click ending the drag must not select the row under the pointer
      const suppressClick = ev => {
        ev.preventDefault()
        ev.stopPropagation()
      }
      window.addEventListener('click', suppressClick, {
        capture: true,
        once: true,
      })
      setTimeout(() => window.removeEventListener('click', suppressClick, true))
      this._moveItem(from, to)
    }
  }

  _handleDragCancel(e) {
    if (e.pointerId === this._drag.pointerId) {
      this._endDrag()
    }
  }

  _handleDragTouchMove(e) {
    // keep the page from scrolling, and the long press from opening a menu
    if (this._drag?.active || (e.type === 'contextmenu' && this._drag?.touch)) {
      e.preventDefault()
    }
  }

  _handleDragKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this._endDrag()
    }
  }

  _endDrag() {
    const drag = this._drag
    if (!drag) {
      return
    }
    clearTimeout(drag.timer)
    cancelAnimationFrame(drag.frame)
    drag.items.forEach(el => {
      // eslint-disable-next-line no-param-reassign
      el.style.transform = ''
      el.removeAttribute('dragging')
      el.removeAttribute('drag-shift')
    })
    window.removeEventListener('pointermove', this._handleDragMove)
    window.removeEventListener('pointerup', this._handleDragEnd)
    window.removeEventListener('pointercancel', this._handleDragCancel)
    window.removeEventListener('touchmove', this._handleDragTouchMove)
    window.removeEventListener('contextmenu', this._handleDragTouchMove)
    window.removeEventListener('keydown', this._handleDragKeyDown)
    window.removeEventListener('scroll', this._handleDragScroll, true)
    this._drag = null
  }

  _handleActionClick(e, action, handle) {
    fireEvent(this, 'edit:action', {action, handle})
    e.preventDefault()
    e.stopPropagation()
  }
}
