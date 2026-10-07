import {hierarchy, partition} from 'd3-hierarchy'
import {getTree} from '../util.js'

// Dimensions for laying out fan charts, in SVG units
export const fanLayoutDefaults = {
  arcRadius: 60, // width of the ring of one generation
}

// Returns the bounding rectangle of a list of rectangles
function unionBounds(...bounds) {
  return {
    minX: Math.min(...bounds.map(({minX}) => minX)),
    minY: Math.min(...bounds.map(({minY}) => minY)),
    maxX: Math.max(...bounds.map(({maxX}) => maxX)),
    maxY: Math.max(...bounds.map(({maxY}) => maxY)),
  }
}

// Returns the cartesian coordinates of a polar coordinate as a bounding box
function angleBounds(radius, theta) {
  const x1 = radius * Math.cos(theta)
  const y1 = radius * Math.sin(theta)
  return {minX: x1, minY: y1, maxX: x1, maxY: y1}
}

// Returns whether the tree data contains a real person
function isRealPerson(treeData) {
  return treeData != null && Object.keys(treeData.person).length > 0
}

// Returns the bounding box of the arcs of the people in the tree data from
// `getTree`. `arcLevel` is the generation beyond the root person, starting at
// -1, and `arcCount` the index of the arc among the 2^arcLevel arcs of that
// generation.
function arcBounds(
  treeData,
  radius,
  arcLevel = -1,
  arcCount = 0,
  currentBounds = {minX: -radius, minY: -radius, maxX: radius, maxY: radius}
) {
  if (!isRealPerson(treeData)) {
    return currentBounds
  }
  if (treeData?.children?.some(isRealPerson)) {
    return unionBounds(
      ...treeData.children.map((child, index) =>
        arcBounds(
          child,
          radius,
          arcLevel + 1,
          arcCount * 2 + index,
          currentBounds
        )
      )
    )
  }
  // The angle of the arc, such as 2π for the root person and π for parents
  const arcSweep = Math.PI / 2 ** arcLevel
  const minAngle = arcSweep * arcCount - Math.PI
  // The beginning, middle and end of the arc
  const anglesToCheck = [minAngle, minAngle + arcSweep / 2, minAngle + arcSweep]
  return unionBounds(
    currentBounds,
    ...anglesToCheck.map(theta => angleBounds(radius * (arcLevel + 2), theta))
  )
}

// Lays out the ancestors of the person with `handle` as rings around them,
// with `depth` generations including the root person, who is a disc at the
// origin. Each parent gets half of their child's arc, the father the first
// half, so the father's side is the upper half and the mother's the lower.
//
// Returns `{nodes, bounds}`. Each node has a unique `key`, the person's
// `handle` and `person` object, which is empty for an ancestor who is not
// known, the `generation`, the start and end angle `x0`, `x1` in radians
// clockwise from the left, the inner and outer radius `y0`, `y1`, and `side`,
// which is 'father' or 'mother' for ancestors and '' for the root person.
export function layoutFan(graph, handle, {depth, ...options}) {
  const {arcRadius} = {...fanLayoutDefaults, ...options}
  const data = getTree(graph, handle, Math.max(depth, 1))
  const root = hierarchy(data)
  // Every arc has the same share of its generation's ring
  root.count()
  partition().size([2 * Math.PI, depth * arcRadius])(root)
  const nodes = root.descendants().map(d => ({
    key: d.data.id,
    handle: d.data.person?.handle,
    person: d.data.person,
    generation: d.depth,
    x0: d.x0,
    x1: d.x1,
    y0: d.y0,
    y1: d.y1,
    side: {f: 'father', m: 'mother'}[d.data.id.slice(-1)] ?? '',
  }))
  const {minX, minY, maxX, maxY} = arcBounds(data, arcRadius)
  return {nodes, bounds: {xMin: minX, xMax: maxX, yMin: minY, yMax: maxY}}
}
