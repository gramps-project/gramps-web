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
