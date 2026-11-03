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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

// the index that item `i` has after moving the item at `from` to `to`
function indexAfterMove(i, from, to) {
  if (from < i && i <= to) {
    return i - 1
  }
  if (to <= i && i < from) {
    return i + 1
  }
  return i
}

// Where the rows of a list go while the row `from` is dragged by `offset`
// pixels: the index it moves to and the [dx, dy] shift of every row. `rects`
// are the rows' positions before the drag.
export function listShifts(rects, from, offset) {
  const row = rects[from]
  const last = rects[rects.length - 1]
  const dy = clamp(
    offset,
    -row.top,
    last.top + last.height - row.top - row.height
  )
  // a row is passed once the leading edge of the dragged row crosses its
  // middle, so the first and last position are reachable within the list
  const top = row.top + dy
  const bottom = top + row.height
  const to =
    from +
    rects.filter((r, i) => i > from && r.top + r.height / 2 < bottom).length -
    rects.filter((r, i) => i < from && r.top + r.height / 2 > top).length
  const shifts = rects.map((r, i) => {
    if (i === from) {
      return [0, dy]
    }
    if (from < i && i <= to) {
      return [0, -row.height]
    }
    if (to <= i && i < from) {
      return [0, row.height]
    }
    return [0, 0]
  })
  return {to, shifts}
}

// Where the tiles of a grid go while the tile `from` is dragged by
// `offsetX` and `offsetY` pixels, like listShifts.
export function gridShifts(rects, from, offsetX, offsetY) {
  const tile = rects[from]
  // the dragged tile stays within the grid
  const dx = clamp(
    offsetX,
    Math.min(...rects.map(r => r.left)) - tile.left,
    Math.max(...rects.map(r => r.left + r.width)) - tile.left - tile.width
  )
  const dy = clamp(
    offsetY,
    Math.min(...rects.map(r => r.top)) - tile.top,
    Math.max(...rects.map(r => r.top + r.height)) - tile.top - tile.height
  )
  // the target is the cell nearest to the centre of the dragged tile in the
  // nearest row, so the empty end of the last row means the last position.
  // The tiles of a row share their top, but rounding can make their heights
  // differ by a fraction of a pixel.
  const x = tile.left + dx + tile.width / 2
  const y = tile.top + dy + tile.height / 2
  const rowDistance = r => Math.abs(r.top + r.height / 2 - y)
  const nearest = rects.reduce((a, r) =>
    rowDistance(r) < rowDistance(a) ? r : a
  )
  const distances = rects.map(r =>
    Math.abs(r.top - nearest.top) < 1
      ? Math.abs(r.left + r.width / 2 - x)
      : Infinity
  )
  const to = distances.indexOf(Math.min(...distances))
  // the other tiles move to the cells they take after the move
  const shifts = rects.map((r, i) => {
    if (i === from) {
      return [dx, dy]
    }
    const cell = rects[indexAfterMove(i, from, to)]
    return [cell.left - r.left, cell.top - r.top]
  })
  return {to, shifts}
}

// keeps the click that follows the release of a drag from acting on the item
// under the pointer
function suppressNextClick() {
  const suppressClick = ev => {
    ev.preventDefault()
    ev.stopPropagation()
  }
  window.addEventListener('click', suppressClick, {capture: true, once: true})
  setTimeout(() => window.removeEventListener('click', suppressClick, true))
}

// Reorders the child elements of a container by dragging them with the
// pointer: with the mouse after a short movement, on touch after a long
// press. Escape cancels a drag. The dragged element gets the `dragging`
// attribute and the others `drag-shift`, styled by reorderableStyles.
//
// The host renders the container with the `reorderable` class and binds
// `handlePointerDown` and `handleDragStart` to its `pointerdown` and
// `dragstart` events. `getContainer` returns the container, or null while
// reordering is off, and `getCount` the number of items in the data, so that
// nothing is dragged while the rendered items are out of date. `onMove(from,
// to)` is called for every drop that changes the order. With `grid`, the
// elements are tiles of a grid; otherwise rows of a list. While a drag is
// under way, `target` holds the move it would make, and the host updates
// whenever that changes.
export class DragReorderController {
  constructor(host, {getContainer, getCount, onMove, grid = false}) {
    this.host = host
    this.getContainer = getContainer
    this.getCount = getCount
    this.onMove = onMove
    this.grid = grid
    this._drag = null
    this.handlePointerDown = this.handlePointerDown.bind(this)
    this.handleDragStart = this.handleDragStart.bind(this)
    this._handleMove = this._handleMove.bind(this)
    this._handleEnd = this._handleEnd.bind(this)
    this._handleCancel = this._handleCancel.bind(this)
    this._handleTouchMove = this._handleTouchMove.bind(this)
    this._handleKeyDown = this._handleKeyDown.bind(this)
    this._handleScroll = this._handleScroll.bind(this)
    this._autoScroll = this._autoScroll.bind(this)
    host.addController(this)
  }

  hostDisconnected() {
    this.end()
  }

  // the move a drop would make, as {from, to}, or null without a drag
  get target() {
    const drag = this._drag
    return drag?.active ? {from: drag.from, to: drag.to} : null
  }

  handleDragStart(e) {
    // a native drag of an image in an item would cancel the pointer drag
    if (this.getContainer()) {
      e.preventDefault()
    }
  }

  // starts a drag of the item under the pointer, if any
  handlePointerDown(e) {
    if (this._drag || !e.isPrimary || e.button !== 0) {
      return
    }
    const container = this.getContainer()
    const items = [...(container?.children ?? [])]
    const item = e.composedPath().find(el => items.includes(el))
    if (!item || items.length < 2 || items.length !== this.getCount()) {
      return
    }
    const touch = e.pointerType === 'touch'
    this._drag = {
      pointerId: e.pointerId,
      touch,
      container,
      items,
      from: items.indexOf(item),
      to: items.indexOf(item),
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
      // touch drags start with a long press, so that swiping still scrolls
      timer: touch ? setTimeout(() => this._activate(), LONG_PRESS_MS) : 0,
    }
    window.addEventListener('pointermove', this._handleMove)
    window.addEventListener('pointerup', this._handleEnd)
    window.addEventListener('pointercancel', this._handleCancel)
    window.addEventListener('touchmove', this._handleTouchMove, {
      passive: false,
    })
    window.addEventListener('contextmenu', this._handleTouchMove)
    window.addEventListener('keydown', this._handleKeyDown)
  }

  _activate() {
    const drag = this._drag
    const box = drag.container.getBoundingClientRect()
    drag.active = true
    drag.startOffsetX = drag.x - box.left
    drag.startOffsetY = drag.y - box.top
    drag.rects = drag.items.map(el => {
      const rect = el.getBoundingClientRect()
      return {
        left: rect.left - box.left,
        top: rect.top - box.top,
        width: rect.width,
        height: rect.height,
      }
    })
    drag.items.forEach((el, i) => {
      el.toggleAttribute(i === drag.from ? 'dragging' : 'drag-shift', true)
    })
    this.host.requestUpdate()
    drag.scroller = scrollParent(drag.container)
    drag.frame = requestAnimationFrame(this._autoScroll)
    // capture also catches scrolling inside containers
    window.addEventListener('scroll', this._handleScroll, true)
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

  _handleScroll() {
    // the container moved under the pointer, so the dragged item must follow
    if (this._drag?.active) {
      this._updatePosition()
    }
  }

  _handleMove(e) {
    const drag = this._drag
    if (e.pointerId !== drag.pointerId) {
      return
    }
    drag.x = e.clientX
    drag.y = e.clientY
    if (!drag.active) {
      const distance = Math.hypot(
        e.clientX - drag.startX,
        e.clientY - drag.startY
      )
      if (drag.touch && distance > TOUCH_SLOP_PX) {
        // moving before the long press is over is a scroll
        this.end()
      } else if (!drag.touch && distance > MOUSE_SLOP_PX) {
        this._activate()
      }
    }
    if (this._drag?.active) {
      this._updatePosition()
    }
  }

  _updatePosition() {
    const drag = this._drag
    const box = drag.container.getBoundingClientRect()
    // offsets are relative to the container, so scrolling during a drag works
    const offsetX = drag.x - box.left - drag.startOffsetX
    const offsetY = drag.y - box.top - drag.startOffsetY
    const {to, shifts} = this.grid
      ? gridShifts(drag.rects, drag.from, offsetX, offsetY)
      : listShifts(drag.rects, drag.from, offsetY)
    if (to !== drag.to) {
      drag.to = to
      this.host.requestUpdate()
    }
    drag.items.forEach((el, i) => {
      const [dx, dy] = shifts[i]
      // eslint-disable-next-line no-param-reassign
      el.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : ''
    })
  }

  _handleEnd(e) {
    if (e.pointerId !== this._drag.pointerId) {
      return
    }
    const {active, from, to} = this._drag
    this.end()
    if (active) {
      suppressNextClick()
      if (from !== to) {
        this.onMove(from, to)
      }
    }
  }

  _handleCancel(e) {
    if (e.pointerId === this._drag.pointerId) {
      this.end()
    }
  }

  _handleTouchMove(e) {
    // keep the page from scrolling, and the long press from opening a menu
    if (this._drag?.active || (e.type === 'contextmenu' && this._drag?.touch)) {
      e.preventDefault()
    }
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      const {active, pointerId} = this._drag
      this.end()
      if (active) {
        // the release of a cancelled drag must not click the item either
        const handleRelease = ev => {
          if (ev.pointerId !== pointerId) {
            return
          }
          window.removeEventListener('pointerup', handleRelease, true)
          window.removeEventListener('pointercancel', handleRelease, true)
          if (ev.type === 'pointerup') {
            suppressNextClick()
          }
        }
        window.addEventListener('pointerup', handleRelease, true)
        window.addEventListener('pointercancel', handleRelease, true)
      }
    }
  }

  // ends an ongoing drag without moving anything
  end() {
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
    window.removeEventListener('pointermove', this._handleMove)
    window.removeEventListener('pointerup', this._handleEnd)
    window.removeEventListener('pointercancel', this._handleCancel)
    window.removeEventListener('touchmove', this._handleTouchMove)
    window.removeEventListener('contextmenu', this._handleTouchMove)
    window.removeEventListener('keydown', this._handleKeyDown)
    window.removeEventListener('scroll', this._handleScroll, true)
    this._drag = null
    if (drag.active) {
      this.host.requestUpdate()
    }
  }
}
