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

// The frame of two layouts that share their coordinates
const sameFrame = {scale: 1, offset: 0, shift: 0}

// Returns how the arcs of the fan layout `previous` relate to those of
// `layout`. `key(k)` is the key in `layout` of the arc with key `k` in
// `previous`, or undefined if `layout` has no such arc. `frame` maps the arcs
// of `previous` to their place in `layout`: an angle x becomes
// x * scale + offset, and a radius y becomes y + shift. `kind` is 'sameRoot'
// for layouts of the same root person, 'lineage' when the root person of one
// layout is an ancestor of the other, and 'unrelated' otherwise.
//
// When the root person of one layout is an ancestor of the root person of
// the other, the ancestor's arc in one layout is the full circle in the
// other. An ancestor with several arcs is related by the arc with
// `clickedKey` in `previous`, if it is theirs, and otherwise by their arc
// nearest to the centre. Layouts of different people that are not related
// this way have no arcs in common.
export function relateFanLayouts(previous, layout, {clickedKey} = {}) {
  const unrelated = {
    key: () => undefined,
    frame: sameFrame,
    kind: 'unrelated',
  }
  if (!previous) {
    return unrelated
  }
  const [before] = previous.nodes
  const [after] = layout.nodes
  if (before.handle === after.handle) {
    return {key: key => key, frame: sameFrame, kind: 'sameRoot'}
  }
  // The nodes are ordered by generation, so the first arc of an ancestor is
  // the one nearest to the centre
  const arcOf = (nodes, handle, preferredKey) =>
    handle &&
    (nodes.find(node => node.key === preferredKey && node.handle === handle) ??
      nodes.find(node => node.generation > 0 && node.handle === handle))
  const ancestor = arcOf(previous.nodes, after.handle, clickedKey)
  if (ancestor) {
    const scale = (2 * Math.PI) / (ancestor.x1 - ancestor.x0)
    return {
      key: key =>
        key.startsWith(ancestor.key)
          ? `p${key.slice(ancestor.key.length)}`
          : undefined,
      frame: {scale, offset: -ancestor.x0 * scale, shift: -ancestor.y0},
      kind: 'lineage',
    }
  }
  const previousRoot = arcOf(layout.nodes, before.handle)
  if (previousRoot) {
    return {
      key: key => `${previousRoot.key}${key.slice(1)}`,
      frame: {
        scale: (previousRoot.x1 - previousRoot.x0) / (2 * Math.PI),
        offset: previousRoot.x0,
        shift: previousRoot.y0,
      },
      kind: 'lineage',
    }
  }
  return unrelated
}

// Returns the angles and radii of `arc` moved by `frame` from
// `relateFanLayouts`
export function placeArc({x0, x1, y0, y1}, {scale, offset, shift}) {
  return {
    x0: x0 * scale + offset,
    x1: x1 * scale + offset,
    y0: y0 + shift,
    y1: y1 + shift,
  }
}

// Returns the frame that moves arcs back where `frame` moved them from
export function invertFrame({scale, offset, shift}) {
  return {scale: 1 / scale, offset: -offset / scale, shift: -shift}
}
