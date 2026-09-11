import {extent} from 'd3-array'
import {hierarchy, tree} from 'd3-hierarchy'
import {getDescendantTree, getTree} from '../util.js'

// Dimensions for laying out tree charts, in SVG units
export const treeLayoutDefaults = {
  boxWidth: 190,
  boxHeight: 90,
  gapX: 30, // horizontal gap between generations
  gapY: 5, // vertical gap between people
  padding: 20, // horizontal padding beyond the outermost generations
}

// Lays out a tree from `getTree` or `getDescendantTree` with the root person
// at the origin. Generations are placed in columns to the right for
// `direction` 1 and to the left for -1.
function layoutTree(data, direction, {boxWidth, boxHeight, gapX, gapY}) {
  const root = hierarchy(data)
  tree()
    .nodeSize([boxHeight + gapY, boxWidth + gapX])
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
        x: direction * d.y || 0,
        y: d.x,
      },
    ])
  )
  return {
    nodes: [...nodes.values()],
    links: root.links().map(({source, target}) => ({
      source: nodes.get(source),
      target: nodes.get(target),
    })),
  }
}

// Adds the extent of the boxes, with horizontal padding
function withBounds({nodes, links}, {boxWidth, boxHeight, padding}) {
  const [xMin, xMax] = extent(nodes, node => node.x)
  const [yMin, yMax] = extent(nodes, node => node.y)
  return {
    nodes,
    links,
    bounds: {
      xMin: xMin - boxWidth / 2 - padding,
      xMax: xMax + boxWidth / 2 + padding,
      yMin: yMin - boxHeight / 2,
      yMax: yMax + boxHeight / 2,
    },
  }
}

// The layout functions return `{nodes, links, bounds}`. Each node has a
// unique `key`, the person's `handle` and `person` object, a `generation`
// that is positive for ancestors and negative for descendants, and the
// centre `x`, `y` of its box. Each link has a `source` and a `target` node.
// Depths count generations including the root person, who is always shown.

export function layoutAncestors(graph, handle, {depth, ...options}) {
  const settings = {...treeLayoutDefaults, ...options}
  const data = getTree(graph, handle, Math.max(depth, 1), false)
  return withBounds(layoutTree(data, 1, settings), settings)
}

export function layoutDescendants(graph, handle, {depth, ...options}) {
  const settings = {...treeLayoutDefaults, ...options}
  const data = getDescendantTree(graph, handle, Math.max(depth, 1))
  return withBounds(layoutTree(data, -1, settings), settings)
}

export function layoutHourglass(
  graph,
  handle,
  {ancestorDepth, descendantDepth, ...options}
) {
  const settings = {...treeLayoutDefaults, ...options}
  const ancestors = layoutTree(
    getTree(graph, handle, Math.max(ancestorDepth, 1), false),
    1,
    settings
  )
  const descendants = layoutTree(
    getDescendantTree(graph, handle, Math.max(descendantDepth, 1)),
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
        ...descendants.links.map(({source, target}) => ({
          source: source === descendantRoot ? root : source,
          target,
        })),
      ],
    },
    settings
  )
}
