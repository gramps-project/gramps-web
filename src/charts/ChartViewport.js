import {zoom, zoomIdentity, zoomTransform} from 'd3-zoom'

// Returns the viewBox start along one axis. A chart that fits the view is
// centred as a whole. One that overflows is centred on `focus`, without
// showing space beyond the chart's extent.
export function viewBoxStart(focus, extentMin, extentMax, viewSize) {
  if (extentMax - extentMin <= viewSize) {
    return (extentMin + extentMax - viewSize) / 2
  }
  return Math.min(
    Math.max(focus - viewSize / 2, extentMin),
    extentMax - viewSize
  )
}

// The zoom transform and viewBox of a chart whose layouts place the root
// person at the origin. The viewBox is as large as the container, so one
// viewBox unit is one screen pixel.
export class ChartViewport {
  constructor(svg, content) {
    this._svg = svg
    this._zoom = zoom().on('zoom', event =>
      content.attr('transform', event.transform)
    )
    svg.call(this._zoom)
    this._rootHandle = undefined
    this._viewStart = [0, 0]
    this._size = undefined
    this._clicked = undefined
  }

  // Remembers which node of a person was clicked, so that a person who
  // appears more than once is kept in place at that node
  rememberClick(handle, key) {
    this._clicked = {handle, key}
  }

  // Sets the viewBox for a layout with `bounds` in a view of `size`, and the
  // zoom transform for its root person. The same root person keeps the zoom
  // transform. A new root person who was on screen keeps their place in the
  // view, and any other new root person starts at the default position; both
  // keep the zoom level. `positions` are the current node positions by key,
  // and `rootKey` is the key of the new root person's node.
  //
  // Returns the offset to subtract from a current node position to get the
  // position, in the coordinates of the new layout, that is at the same place
  // on screen.
  show({bounds, size, rootHandle, rootKey, positions}) {
    const previous = {
      transform: zoomTransform(this._svg.node()),
      viewStart: this._viewStart,
      size: this._size ?? size,
    }
    this._viewStart = [
      viewBoxStart(0, bounds.xMin, bounds.xMax, size[0]),
      viewBoxStart(0, bounds.yMin, bounds.yMax, size[1]),
    ]
    this._size = size
    this._svg.attr('viewBox', [...this._viewStart, ...size])
    const transform = this._transformFor(previous, {
      rootHandle,
      rootKey,
      positions,
    })
    if (transform !== previous.transform) {
      this._svg.call(this._zoom.transform, transform)
    }
    // A position p is shown at p * k + translate - viewStart, and the zoom
    // level k stays the same
    const {k} = transform
    return [
      (transform.x -
        previous.transform.x +
        previous.viewStart[0] -
        this._viewStart[0]) /
        k,
      (transform.y -
        previous.transform.y +
        previous.viewStart[1] -
        this._viewStart[1]) /
        k,
    ]
  }

  // Returns the zoom transform for a new layout: the current transform for
  // the same root person, a transform that keeps a new root person who was on
  // screen in the previous view at their place in the view, or the default
  // position at the current zoom level
  _transformFor(previous, {rootHandle, rootKey, positions}) {
    const {transform} = previous
    if (rootHandle === this._rootHandle) {
      return transform
    }
    this._rootHandle = rootHandle
    const clicked =
      this._clicked?.handle === rootHandle && positions.get(this._clicked.key)
    this._clicked = undefined
    const kept = clicked || positions.get(rootKey)
    const viewPosition = kept && [
      transform.applyX(kept[0]) - previous.viewStart[0],
      transform.applyY(kept[1]) - previous.viewStart[1],
    ]
    if (
      viewPosition?.every((value, i) => value >= 0 && value <= previous.size[i])
    ) {
      return zoomIdentity
        .translate(
          viewPosition[0] + this._viewStart[0],
          viewPosition[1] + this._viewStart[1]
        )
        .scale(transform.k)
    }
    return zoomIdentity.scale(transform.k)
  }
}
