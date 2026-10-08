import {extent} from 'd3-array'
import {hierarchy, tree} from 'd3-hierarchy'
import {getDescendantTree, getTree} from '../util.js'

// Dimensions for laying out tree charts, in SVG units
export const treeLayoutDefaults = {
  boxWidth: 190,
  boxHeight: 90,
  vertical: false, // generations in rows instead of columns
  gapX: 30, // gap between generations in columns
  gapY: 5, // gap between people in a column
  rowGap: 40, // gap between generations in rows
  columnGap: 20, // gap between people in a row
  padding: 20, // padding beyond the outermost generations
}

// Lays out a tree from `getTree` or `getDescendantTree` with the root person
// at the origin. Generations are placed in columns to the right for
// `direction` 1 and to the left for -1, or with `vertical`, in rows above for
// `direction` 1 and below for -1.
function layoutTree(
  data,
  direction,
  {vertical, boxWidth, boxHeight, gapX, gapY, rowGap, columnGap}
) {
  const root = hierarchy(data)
  tree()
    .nodeSize(
      vertical
        ? [boxWidth + columnGap, boxHeight + rowGap]
        : [boxHeight + gapY, boxWidth + gapX]
    )
    .separation(() => 1)(root)
  const nodes = new Map(
    root.descendants().map(d => [
      d,
      {
        key: d.data.id,
        handle: d.data.person?.handle,
        person: d.data.person,
        // `|| 0` avoids -0 for the root person
        generation: direction * d.depth || 0,
        ...(vertical
          ? {x: d.x, y: -direction * d.y || 0}
          : {x: direction * d.y || 0, y: d.x}),
        ...(d.data.expandable
          ? {expandable: direction > 0 ? 'ancestors' : 'descendants'}
          : {}),
      },
    ])
  )
  return {
    nodes: [...nodes.values()],
    // The target of each link carries the relation of the child to the
    // parent
    links: root.links().map(({source, target}) => ({
      source: nodes.get(source),
      target: nodes.get(target),
      relation: target.data.relation ?? 'Birth',
    })),
  }
}

// Adds the extent of the boxes, with padding beyond the outermost
// generations, and whether the layout is `vertical`
function withBounds({nodes, links}, {vertical, boxWidth, boxHeight, padding}) {
  const [xMin, xMax] = extent(nodes, node => node.x)
  const [yMin, yMax] = extent(nodes, node => node.y)
  const [padX, padY] = vertical ? [0, padding] : [padding, 0]
  return {
    nodes,
    links,
    vertical,
    bounds: {
      xMin: xMin - boxWidth / 2 - padX,
      xMax: xMax + boxWidth / 2 + padX,
      yMin: yMin - boxHeight / 2 - padY,
      yMax: yMax + boxHeight / 2 + padY,
    },
  }
}

// The layout functions return `{nodes, links, bounds, vertical}`. Each node has a
// unique `key`, the person's `handle` and `person` object, a `generation`
// that is positive for ancestors and negative for descendants, and the
// centre `x`, `y` of its box. Each link has a `source` and a `target` node
// and the `relation`, such as Birth or Adopted, of the child to the parent.
// Depths count generations including the root person, who is always shown.
//
// The people with a handle in the set `expanded` show one more generation. A
// node at the end of a branch whose relatives in that direction are not shown
// gets `expandable`, 'ancestors' or 'descendants'.

export function layoutAncestors(
  graph,
  handle,
  {depth, expanded = new Set(), ...options}
) {
  const settings = {...treeLayoutDefaults, ...options}
  const data = getTree(graph, handle, Math.max(depth, 1), false, {expanded})
  return withBounds(layoutTree(data, 1, settings), settings)
}

export function layoutDescendants(
  graph,
  handle,
  {depth, expanded = new Set(), ...options}
) {
  const settings = {...treeLayoutDefaults, ...options}
  const data = getDescendantTree(graph, handle, Math.max(depth, 1), {expanded})
  return withBounds(layoutTree(data, -1, settings), settings)
}

export function layoutHourglass(
  graph,
  handle,
  {ancestorDepth, descendantDepth, expanded = new Set(), ...options}
) {
  const settings = {...treeLayoutDefaults, ...options}
  const ancestors = layoutTree(
    getTree(graph, handle, Math.max(ancestorDepth, 1), false, {expanded}),
    1,
    settings
  )
  const descendants = layoutTree(
    getDescendantTree(graph, handle, Math.max(descendantDepth, 1), {expanded}),
    -1,
    settings
  )
  // Both halves start at the root person, who is shown once
  const [root] = ancestors.nodes
  const [descendantRoot, ...descendantNodes] = descendants.nodes
  return withBounds(
    {
      nodes: [...ancestors.nodes, ...descendantNodes],
      links: [
        ...ancestors.links,
        ...descendants.links.map(link => ({
          ...link,
          source: link.source === descendantRoot ? root : link.source,
        })),
      ],
    },
    settings
  )
}
