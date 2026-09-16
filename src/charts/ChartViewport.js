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

// Space around a chart that is fitted into the view, in pixels
const fitMargin = 20

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
    this._bounds = undefined
    this._clicked = undefined
  }

  // Remembers which node of a person was clicked, so that a person who
  // appears more than once is kept in place at that node
  rememberClick(handle, key) {
    this._clicked = {handle, key}
  }

  // Sets the viewBox for a layout with `bounds` in a view of `size`, and the
  // zoom transform for its root person. The same root person keeps their
  // place in the view in a `newLayout`, and otherwise the zoom transform stays
  // as it is. For a new root person, the first of `candidates` that was on
  // screen keeps its place in the view, preferring the clicked node.
  // Otherwise the chart starts at the default position with the current zoom
  // level or, with `fit`, zoomed out as far as needed to show all of it. A
  // layout shown before the view has a size does not count as shown.
  //
  // Each candidate has the `key` of a node of the new root person in
  // `positions`, the current node positions by key, and the `position` that
  // node has in the new layout.
  //
  // Returns `offset`, which subtracted from a current node position gives the
  // position in the coordinates of the new layout that is at the same place on
  // screen, and `keptKey`, the key of the node kept in place, if any. The
  // offset is exact while the zoom level stays the same, which `fit` changes.
  show({
    bounds,
    size,
    rootHandle,
    candidates = [],
    positions,
    fit = false,
    newLayout = false,
  }) {
    // A new layout stops an animated zoom or pan
    this._svg.interrupt('viewport')
    this._bounds = bounds
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
    const {transform, keptKey} = this._transformFor(previous, {
      bounds,
      size,
      rootHandle,
      candidates,
      positions,
      fit,
      newLayout,
    })
    if (transform !== previous.transform) {
      this._svg.call(this._zoom.transform, transform)
    }
    // A position p is shown at p * k + translate - viewStart
    const {k} = transform
    const offset = [
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
    return {offset, keptKey}
  }

  // Zooms by `factor` around the centre of the view
  zoomBy(factor, {duration = 0} = {}) {
    if (!this._hasSize()) {
      return
    }
    const {x, y, k} = zoomTransform(this._svg.node())
    const [cx, cy] = this._viewCentre()
    this._animateTo(
      zoomIdentity
        .translate(cx - (cx - x) * factor, cy - (cy - y) * factor)
        .scale(k * factor),
      duration
    )
  }

  // Moves the chart by `dx` and `dy` pixels
  panBy(dx, dy, {duration = 0} = {}) {
    if (!this._hasSize()) {
      return
    }
    const {x, y, k} = zoomTransform(this._svg.node())
    this._animateTo(zoomIdentity.translate(x + dx, y + dy).scale(k), duration)
  }

  // Centres the chart in the view, zoomed out as far as needed to show all of
  // it
  fit({duration = 0} = {}) {
    if (!this._hasSize() || !this._bounds) {
      return
    }
    this._animateTo(this._fitTransform(this._bounds, this._size), duration)
  }

  // Centres the root person in the view, keeping the zoom level
  centreRoot({duration = 0} = {}) {
    if (!this._hasSize()) {
      return
    }
    const {k} = zoomTransform(this._svg.node())
    const [cx, cy] = this._viewCentre()
    this._animateTo(zoomIdentity.translate(cx, cy).scale(k), duration)
  }

  _hasSize() {
    return Boolean(this._size?.every(value => value > 0))
  }

  // The centre of the view in viewBox coordinates
  _viewCentre() {
    return [
      this._viewStart[0] + this._size[0] / 2,
      this._viewStart[1] + this._size[1] / 2,
    ]
  }

  // Sets the zoom transform, animated over `duration` milliseconds
  _animateTo(transform, duration) {
    this._svg.interrupt('viewport')
    if (duration > 0) {
      this._svg
        .transition('viewport')
        .duration(duration)
        .call(this._zoom.transform, transform)
    } else {
      this._svg.call(this._zoom.transform, transform)
    }
  }

  // Returns the zoom transform for a new layout, and the key of the node kept
  // in place, as described for `show`
  _transformFor(
    previous,
    {bounds, size, rootHandle, candidates, positions, fit, newLayout}
  ) {
    const {transform} = previous
    if (!size.every(value => value > 0)) {
      return {transform}
    }
    if (rootHandle === this._rootHandle) {
      if (!newLayout) {
        return {transform}
      }
      // The root person is at the origin of both layouts, so moving the
      // transform with the viewBox keeps them in place
      return {
        transform: zoomIdentity
          .translate(
            transform.x + this._viewStart[0] - previous.viewStart[0],
            transform.y + this._viewStart[1] - previous.viewStart[1]
          )
          .scale(transform.k),
      }
    }
    this._rootHandle = rootHandle
    const clickedKey =
      this._clicked?.handle === rootHandle ? this._clicked.key : undefined
    this._clicked = undefined
    const ordered = [
      ...candidates.filter(candidate => candidate.key === clickedKey),
      ...candidates.filter(candidate => candidate.key !== clickedKey),
    ]
    for (const {key, position} of ordered) {
      const current = positions.get(key)
      const viewPosition = current && [
        transform.applyX(current[0]) - previous.viewStart[0],
        transform.applyY(current[1]) - previous.viewStart[1],
      ]
      if (
        viewPosition?.every(
          (value, i) => value >= 0 && value <= previous.size[i]
        )
      ) {
        return {
          transform: zoomIdentity
            .translate(
              viewPosition[0] + this._viewStart[0] - transform.k * position[0],
              viewPosition[1] + this._viewStart[1] - transform.k * position[1]
            )
            .scale(transform.k),
          keptKey: key,
        }
      }
    }
    return {
      transform: fit
        ? this._fitTransform(bounds, size)
        : zoomIdentity.scale(transform.k),
    }
  }

  // Returns the zoom transform that centres the chart in the view, zoomed out
  // as far as needed to show all of it
  _fitTransform(bounds, size) {
    const k = Math.min(
      1,
      size[0] / (bounds.xMax - bounds.xMin + 2 * fitMargin),
      size[1] / (bounds.yMax - bounds.yMin + 2 * fitMargin)
    )
    return zoomIdentity
      .translate(
        this._viewStart[0] +
          size[0] / 2 -
          (k * (bounds.xMin + bounds.xMax)) / 2,
        this._viewStart[1] + size[1] / 2 - (k * (bounds.yMin + bounds.yMax)) / 2
      )
      .scale(k)
  }
}
