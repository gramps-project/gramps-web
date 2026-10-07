import {Graphviz} from '@hpcc-js/wasm'
import {familyMarkerPosition} from '../familyMarker.js'
import {routeLinks} from './orthogonalRoutes.js'

// Layout of the relationship chart. Each person is drawn once. People who
// share a family as partners, directly or through other partners, form a
// partner group: one Graphviz node, an HTML table with a row of cells for
// their cards and the gaps between them, and the space for whatever else is
// drawn above and below the cards. Edges run from the gap between two
// partners, or from the card of a single parent, to the top of each child's
// card. The graph is laid out by the dot engine and read back from its JSON
// output. Each partner group's row of cards lies in one row of the chart,
// and links are drawn with right angles between the rows: through each row
// where dot's route for them crosses it, and between rows at heights from
// `routeLinks`.

// Size of the person cards the layout makes room for, in pixels
export const relationshipLayoutDefaults = {
  boxWidth: 190,
  boxHeight: 90,
}

// Space left and right of each card, and between adjacent cards, in pixels
const cardPadding = 5
const gapWidth = 14

// Vertical distance in pixels from the bottom of a row of cards to the
// bracket of a family whose partners are not adjacent, and between the
// brackets of one partner group
const bracketDepth = 16

// Radius of a family's marker, from `familyMarker.js`, and room for the
// width of lines
const markerRadius = 6
const lineMargin = 2

// Largest horizontal distance in pixels between the links that reach the
// top of one card
const entrySpacing = 20

// Least horizontal distance in pixels between a link that reaches the top of
// a card and the card's left or right edge
const entryInset = 12

// Largest horizontal distance in pixels between the start and the end of a
// link that is drawn straight down
const snapDistance = 4

// Height in pixels of the arch over a partner group that links a child to
// parents in the same group
export const archHeight = 20

// Returns the relation of a child to the parents the child is linked from:
// Birth if it is Birth for all of them, otherwise the first other relation
function childRelation(family, childHandle, parents) {
  const childRef = (family.child_ref_list ?? []).find(
    ref => ref.ref === childHandle
  )
  const relations = parents.map(parent =>
    parent === family.father_handle ? childRef?.frel : childRef?.mrel
  )
  return relations.find(relation => relation && relation !== 'Birth') ?? 'Birth'
}

// Returns the order of the cards of a partner group. The person with the
// most partners comes first and gets their first partner on the left and
// the others on the right; a person with one partner gets the father on the
// left. Partners of partners continue on the side they were reached from.
// Returns the handles in the order of the cards and the person in the middle.
function orderGroup(members, partnersOf) {
  const [hub] = [...members].sort(
    (a, b) => partnersOf(b).length - partnersOf(a).length
  )
  const row = [hub]
  const placed = new Set(row)
  const place = (handle, side) => {
    for (const {partner} of partnersOf(handle)) {
      if (!placed.has(partner)) {
        placed.add(partner)
        if (side === 'left') {
          row.unshift(partner)
        } else {
          row.push(partner)
        }
        place(partner, side)
      }
    }
  }
  const [first, ...others] = partnersOf(hub)
  if (first) {
    const isFather = others.length === 0 && first.family.mother_handle === hub
    placed.add(first.partner)
    if (isFather || others.length > 0) {
      row.unshift(first.partner)
      place(first.partner, 'left')
    } else {
      row.push(first.partner)
      place(first.partner, 'right')
    }
  }
  place(hub, 'right')
  return {row, hub}
}

// Returns the model of the relationship chart of all people in `graph`.
//
// Each of the `groups` has the `members` of a partner group in the order of
// their cards and the `families` between them. A family is `adjacent` when
// it takes the gap between its two partners' cards; any other family is
// drawn as a bracket below the cards, from the inner partner to its marker
// under the `outer` one. Each of the `edges` links a child to a
// parent family: from the family when both parents are known, and from the
// known parent otherwise. No two edges link the same source and child.
export function relationshipModel(graph) {
  const people = graph.people()
  const known = handle => Boolean(handle) && graph.person(handle) !== undefined

  // Families with both partners known, by partner, in the partner's order
  const couples = new Map()
  const seen = new Set()
  const addCouple = family => {
    if (
      seen.has(family.handle) ||
      !known(family.father_handle) ||
      !known(family.mother_handle) ||
      family.father_handle === family.mother_handle
    ) {
      return
    }
    seen.add(family.handle)
    for (const [handle, partner] of [
      [family.father_handle, family.mother_handle],
      [family.mother_handle, family.father_handle],
    ]) {
      couples.set(handle, [...(couples.get(handle) ?? []), {family, partner}])
    }
  }
  for (const person of people) {
    graph.partnerFamilies(person.handle).forEach(addCouple)
  }
  for (const person of people) {
    graph.parentFamilies(person.handle).forEach(addCouple)
  }
  // A person's families follow their family list, which Gramps users sort
  // by date
  for (const [handle, list] of couples) {
    const order = graph.partnerFamilies(handle).map(family => family.handle)
    const rank = ({family}) => {
      const index = order.indexOf(family.handle)
      return index === -1 ? order.length : index
    }
    list.sort((a, b) => rank(a) - rank(b))
  }
  const couplesOf = handle => couples.get(handle) ?? []
  // Each partner once, from their first family with this person
  const partnersOf = handle =>
    couplesOf(handle).filter(
      (couple, i, all) => all.findIndex(c => c.partner === couple.partner) === i
    )

  const groups = []
  const groupOfPerson = new Map()
  for (const person of people) {
    if (groupOfPerson.has(person.handle)) {
      continue
    }
    const members = [person.handle]
    const reached = new Set(members)
    for (let i = 0; i < members.length; i += 1) {
      for (const {partner} of couplesOf(members[i])) {
        if (!reached.has(partner)) {
          reached.add(partner)
          members.push(partner)
        }
      }
    }
    const {row, hub} = orderGroup(members, partnersOf)
    // Of two partners who are not adjacent, the one with fewer partners is
    // the outer one, or else the one further from the middle
    const outerOf = (left, right) => {
      const weight = index => [
        -partnersOf(row[index]).length,
        Math.abs(index - row.indexOf(hub)),
      ]
      const [a, b] = [weight(left), weight(right)]
      return a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]) ? left : right
    }
    const group = {index: groups.length, members: row, families: []}
    const familySeen = new Set()
    for (const handle of row) {
      for (const {family} of couplesOf(handle)) {
        if (familySeen.has(family.handle)) {
          continue
        }
        familySeen.add(family.handle)
        const [left, right] = [
          row.indexOf(family.father_handle),
          row.indexOf(family.mother_handle),
        ].sort((a, b) => a - b)
        const gapTaken = group.families.some(
          other => other.adjacent && other.left === left
        )
        const adjacent = right === left + 1 && !gapTaken
        group.families.push({
          family,
          left,
          right,
          adjacent,
          outer: adjacent ? undefined : outerOf(left, right),
        })
      }
    }
    group.families.sort((a, b) => a.left - b.left || a.right - b.right)
    groups.push(group)
    for (const handle of row) {
      groupOfPerson.set(handle, group)
    }
  }

  // Families of a child that resolve to the same single parent give one
  // edge, which is Birth if the child is the parent's birth child in any of
  // them
  const edgesByKey = new Map()
  for (const person of people) {
    for (const family of graph.parentFamilies(person.handle)) {
      const parents = [family.father_handle, family.mother_handle].filter(known)
      const couple = seen.has(family.handle)
      if (parents.length > 0) {
        const edge = {
          family: couple ? family : undefined,
          fromPerson: couple ? undefined : parents[0],
          toPerson: person.handle,
          relation: childRelation(family, person.handle, parents),
        }
        const key = `${couple ? family.handle : edge.fromPerson}->${
          person.handle
        }`
        const existing = edgesByKey.get(key)
        if (!existing) {
          edgesByKey.set(key, edge)
        } else if (edge.relation === 'Birth') {
          existing.relation = 'Birth'
        }
      }
    }
  }
  const edges = [...edgesByKey.values()]

  // A child in the same group as their parents is linked by an arch
  for (const edge of edges) {
    const source = groupOfPerson.get(
      edge.family ? edge.family.father_handle : edge.fromPerson
    )
    if (source === groupOfPerson.get(edge.toPerson)) {
      source.arch = true
    }
  }

  return {groups, groupOfPerson, edges}
}

// Returns the space a partner group needs above and below its cards: room
// for its brackets below and its arch above. It is the same on both sides,
// so that the cards of all groups in a row stay aligned.
function groupMargin(group) {
  const brackets = group.families.filter(({adjacent}) => !adjacent).length
  const below =
    brackets > 0 ? brackets * bracketDepth + markerRadius + lineMargin : 0
  const above = group.arch ? archHeight + lineMargin : 0
  return Math.max(below, above)
}

// Returns the port that edges leave a cell by: the cell itself, or the cell
// under it in the space below the cards
const tailPort = (group, port) => (groupMargin(group) > 0 ? `s${port}` : port)

// Returns the cells of a partner group's row: a card for each member and a
// gap between adjacent cards, with their widths and the x of their left
// edges relative to the left edge of the row
function groupCells(group, {boxWidth}) {
  const cells = []
  let x = 0
  group.members.forEach((handle, i) => {
    if (i > 0) {
      cells.push({port: `g${i - 1}`, x, width: gapWidth})
      x += gapWidth
    }
    const width = boxWidth + 2 * cardPadding
    cells.push({port: `p${i}`, x, width})
    x += width
  })
  return {cells, width: x}
}

// Returns the centre x of the card at `index` in a partner group's row,
// relative to the left edge of the row
const cardX = (index, {boxWidth}) =>
  index * (boxWidth + 2 * cardPadding + gapWidth) + boxWidth / 2 + cardPadding

// Returns where a family's links start, relative to the left edge of its
// partner group's row, and the port of the cell below that point: the gap
// between adjacent partners, or else under the outer partner's card, on the
// side of the inner one
function familyStart(groupFamily, options) {
  const {left, right, adjacent, outer} = groupFamily
  if (adjacent) {
    return {
      x: (cardX(left, options) + cardX(right, options)) / 2,
      port: `g${left}`,
    }
  }
  const inward = outer === right ? -1 : 1
  return {
    x: cardX(outer, options) + (inward * options.boxWidth) / 4,
    port: `p${outer}`,
  }
}

const groupName = group => `group${group.index}`

// Returns the tail and head of the DOT edge for a model edge
function edgeEnds(model, edge, options) {
  const target = model.groupOfPerson.get(edge.toPerson)
  const head = `"${groupName(target)}":"p${target.members.indexOf(
    edge.toPerson
  )}":n`
  if (edge.family) {
    const group = model.groupOfPerson.get(edge.family.father_handle)
    const groupFamily = group.families.find(
      ({family}) => family.handle === edge.family.handle
    )
    const {port} = familyStart(groupFamily, options)
    return {tail: `"${groupName(group)}":"${tailPort(group, port)}":s`, head}
  }
  const group = model.groupOfPerson.get(edge.fromPerson)
  const port = `p${group.members.indexOf(edge.fromPerson)}`
  return {tail: `"${groupName(group)}":"${tailPort(group, port)}":s`, head}
}

// Returns the DOT source for a relationship model, with cards of `boxWidth`
// by `boxHeight` pixels
export function relationshipDot(model, options = relationshipLayoutDefaults) {
  const {boxHeight} = options
  const statements = model.groups.map(group => {
    const {cells, width} = groupCells(group, options)
    const row = (height, prefix = '') =>
      `<TR>${cells
        .map(
          cell =>
            `<TD PORT="${prefix}${cell.port}" FIXEDSIZE="TRUE" WIDTH="${cell.width}" HEIGHT="${height}"></TD>`
        )
        .join('')}</TR>`
    const margin = groupMargin(group)
    const rows =
      margin > 0
        ? [
            `<TR><TD COLSPAN="${cells.length}" FIXEDSIZE="TRUE" WIDTH="${width}" HEIGHT="${margin}"></TD></TR>`,
            row(boxHeight),
            row(margin, 's'),
          ]
        : [row(boxHeight)]
    return `"${groupName(
      group
    )}" [label=<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0">${rows.join(
      ''
    )}</TABLE>>]`
  })
  model.edges.forEach((edge, i) => {
    const {tail, head} = edgeEnds(model, edge, options)
    statements.push(`${tail} -> ${head} [id="e${i}"]`)
  })
  return `digraph gramps {ranksep=0.9 nodesep=0.5 pad=2 splines=polyline nslimit=2.0 charset="UTF-8" node [shape=plain] edge [arrowhead=none] ${statements.join(
    ' '
  )}}`
}

// Returns the nodes, links and bounds of a relationship model from the JSON
// output of Graphviz, with y pointing down and the root person at the origin
function readLayout(output, model, graph, rootHandle, options) {
  const {boxHeight} = options
  const [markerX, markerY] = familyMarkerPosition(boxHeight)
  const centres = new Map(
    (output.objects ?? [])
      .filter(object => object.pos)
      .map(object => {
        const [x, y] = object.pos.split(',').map(Number)
        return [object.name, [x, -y]]
      })
  )
  const nodes = []
  const people = new Map()
  const families = new Map()
  // The centre y of each partner group's row, and of each node's
  const groupY = new Map()
  const nodeRowY = new Map()
  for (const group of model.groups) {
    const [x, y] = centres.get(groupName(group))
    groupY.set(group, y)
    const left = x - groupCells(group, options).width / 2
    group.members.forEach((handle, i) => {
      const node = {
        key: `person:${handle}`,
        kind: 'person',
        handle,
        person: graph.person(handle),
        x: left + cardX(i, options),
        y,
      }
      nodes.push(node)
      nodeRowY.set(node, y)
      people.set(handle, node)
    })
    // Shorter brackets lie above longer ones
    const depths = new Map(
      group.families
        .filter(groupFamily => !groupFamily.adjacent)
        .sort((a, b) => a.right - a.left - (b.right - b.left))
        .map((groupFamily, i) => [groupFamily, i + 1])
    )
    for (const groupFamily of group.families) {
      const start = left + familyStart(groupFamily, options).x
      const node = {
        key: `family:${groupFamily.family.handle}`,
        kind: 'family',
        family: groupFamily.family,
        x: start,
        y,
      }
      if (!groupFamily.adjacent) {
        // The marker sits below the outer partner's card, at the end of a
        // bracket from the inner partner's card, drawn relative to the
        // family node
        const depth = depths.get(groupFamily) * bracketDepth
        node.x = start - markerX
        node.y = y + boxHeight / 2 + depth - markerY
        const inner =
          groupFamily.outer === groupFamily.left
            ? groupFamily.right
            : groupFamily.left
        const innerX = left + cardX(inner, options) - node.x
        node.bracket = {
          left: Math.min(innerX, markerX),
          right: Math.max(innerX, markerX),
          top: y + boxHeight / 2 - node.y,
        }
      }
      nodes.push(node)
      nodeRowY.set(node, y)
      families.set(groupFamily.family.handle, node)
    }
  }

  // The rows of partner groups, from the top, with the top and bottom of
  // their cards and the space around them
  const rowYs = [...new Set(model.groups.map(group => groupY.get(group)))].sort(
    (a, b) => a - b
  )
  const rowOfGroup = group => rowYs.indexOf(groupY.get(group))
  const rows = rowYs.map(() => ({
    top: Infinity,
    bottom: -Infinity,
    blocked: [],
  }))
  for (const group of model.groups) {
    const row = rows[rowOfGroup(group)]
    const extent = boxHeight / 2 + groupMargin(group)
    row.top = Math.min(row.top, groupY.get(group) - extent)
    row.bottom = Math.max(row.bottom, groupY.get(group) + extent)
    const [x] = centres.get(groupName(group))
    const halfWidth = groupCells(group, options).width / 2
    row.blocked.push([x - halfWidth, x + halfWidth])
  }

  // The route Graphviz found for each edge, by its id
  const polylines = new Map(
    (output.edges ?? []).map(edge => [
      edge.id,
      (edge.pos ?? '')
        .split(' ')
        .filter(token => token && !/^[se],/.test(token))
        .map(token => {
          const [x, y] = token.split(',').map(Number)
          return [x, -y]
        }),
    ])
  )
  const linkStart = source =>
    source.kind === 'family'
      ? [source.x + markerX, source.y + markerY]
      : [source.x, source.y + boxHeight / 2]
  const sourceOf = edge =>
    edge.family ? families.get(edge.family.handle) : people.get(edge.fromPerson)
  // The links to a child with several parent families reach the top of the
  // child's card side by side, in the order of their sources
  const endX = new Map()
  const edgesTo = new Map()
  model.edges.forEach((edge, i) => {
    edgesTo.set(edge.toPerson, [...(edgesTo.get(edge.toPerson) ?? []), i])
  })
  for (const [handle, indices] of edgesTo) {
    const startX = i => linkStart(sourceOf(model.edges[i]))[0]
    // Many links share the width of the card, away from its corners
    const spacing = Math.min(
      entrySpacing,
      (options.boxWidth - 2 * entryInset) / Math.max(1, indices.length - 1)
    )
    indices
      .sort((a, b) => startX(a) - startX(b))
      .forEach((i, k) => {
        const offset = (k - (indices.length - 1) / 2) * spacing
        const x = people.get(handle).x + offset
        // A link that almost goes straight down does
        endX.set(i, Math.abs(x - startX(i)) < snapDistance ? startX(i) : x)
      })
  }
  const links = []
  const routed = []
  model.edges.forEach((edge, i) => {
    const source = sourceOf(edge)
    const target = people.get(edge.toPerson)
    const link = {
      key: `${source.key}->${target.key}`,
      kind: 'child',
      relation: edge.relation,
      source,
      target,
      points: [],
    }
    links.push(link)
    const sourceGroup = model.groupOfPerson.get(
      edge.family ? edge.family.father_handle : edge.fromPerson
    )
    const targetGroup = model.groupOfPerson.get(edge.toPerson)
    if (sourceGroup !== targetGroup) {
      const [startX, startY] = linkStart(source)
      const start = {row: rowOfGroup(sourceGroup), x: startX, y: startY}
      const end = {
        row: rowOfGroup(targetGroup),
        x: endX.get(i),
        y: target.y - boxHeight / 2,
      }
      routed.push({
        link,
        owner: source.key,
        start,
        end,
        legs: routeLegs(polylines.get(`e${i}`) ?? [], rowYs, start, end),
      })
    }
  })

  // Rows move down to make room for the lines between them
  const {shifts, routes} = routeLinks(rows, routed)
  for (const node of nodes) {
    node.y += shifts[rowYs.indexOf(nodeRowY.get(node))]
  }
  routed.forEach(({link}, i) => {
    link.points = routes[i]
  })
  // A child in the same partner group as their parents is linked by an arch
  // over the row
  links.forEach((link, i) => {
    if (link.points.length === 0) {
      const start = linkStart(link.source)
      const end = [endX.get(i), link.target.y - boxHeight / 2]
      const top = end[1] - archHeight
      link.points = [start, [start[0], top], [end[0], top], end]
    }
  })

  const root = people.get(rootHandle)
  const [originX, originY] = root ? [root.x, root.y] : [0, 0]
  for (const node of nodes) {
    node.x -= originX
    node.y -= originY
  }
  for (const link of links) {
    link.points = link.points.map(([x, y]) => [x - originX, y - originY])
  }
  const [x0, y0, x1, y1] = (output.bb ?? '0,0,0,0').split(',').map(Number)
  const bounds = {
    xMin: x0 - originX,
    xMax: x1 - originX,
    yMin: -y1 - originY,
    yMax: -y0 - originY + shifts.at(-1),
  }
  // Lines above the first row or below the last can reach past the space
  // Graphviz left around the chart
  for (const link of links) {
    for (const [x, y] of link.points) {
      bounds.xMin = Math.min(bounds.xMin, x)
      bounds.xMax = Math.max(bounds.xMax, x)
      bounds.yMin = Math.min(bounds.yMin, y)
      bounds.yMax = Math.max(bounds.yMax, y)
    }
  }
  return {nodes, links, bounds, root}
}

// Returns the legs of a link for `routeLinks`, from the `polyline` Graphviz
// found for it. The link goes through a row where the polyline crosses the
// row's centre line, `rowYs`, for which Graphviz has kept room there. Between
// two crossings it runs in the gap the polyline passes through.
function routeLegs(polyline, rowYs, start, end) {
  const crossings = []
  for (let i = 1; i < polyline.length; i += 1) {
    const [x0, y0] = polyline[i - 1]
    const [x1, y1] = polyline[i]
    rowYs.forEach((y, row) => {
      if (y0 < y !== y1 < y) {
        const f = (y - y0) / (y1 - y0)
        crossings.push({row, x: x0 + f * (x1 - x0), at: i - 1 + f})
      }
    })
  }
  crossings.sort((a, b) => a.at - b.at)
  const yAt = at => {
    const i = Math.min(Math.floor(at), polyline.length - 2)
    const f = at - i
    return polyline[i][1] + f * (polyline[i + 1][1] - polyline[i][1])
  }
  const anchors = [start, ...crossings, end]
  const legs = []
  for (let i = 1; i < anchors.length; i += 1) {
    const [a, b] = [anchors[i - 1], anchors[i]]
    let gap
    if (b === end) {
      gap = end.row - 1
    } else if (a === start) {
      gap = start.row
    } else if (a.row !== b.row) {
      gap = Math.min(a.row, b.row)
    } else {
      // The polyline left the row and came back to it
      gap = yAt((a.at + b.at) / 2) > rowYs[a.row] ? a.row : a.row - 1
    }
    legs.push({gap, from: a.x, to: b.x})
  }
  return legs
}

let graphvizLoading

// Lays out the relationship chart of all people in `graph` around the person
// with `rootHandle`, and returns a promise of `{nodes, links, bounds, root}`
// in pixels, with y pointing down and `root`, the root person's node, at the
// origin.
//
// Each node has a unique `key`, a `kind` and its centre `x`, `y`. A `person`
// node has the person's `handle` and `person` object; each person has one.
// A `family` node has its `family`, whose marker is drawn relative to it. It
// lies in the gap between the cards of its two partners, unless they are not
// next to each other: then its marker lies below the outer partner's card,
// and its `bracket` gives the `left` and `right` x and the `top` y of the
// bracket from the other partner's card to the marker and up to the card
// above it, relative to the node. Each link joins a `source`,
// a family or a single parent, to a child `target`, has a `kind` of `child`,
// the child's `relation` to the linked parents and the `points` of its route:
// lines that are alternately vertical and horizontal, from the family's
// marker or the bottom of the parent's card down to the top of the child's
// card. The links of one source share the line down from it and the
// horizontal line below it. A link to a child in the same row arches over
// the row.
export async function layoutRelationships(graph, rootHandle, options = {}) {
  const settings = {...relationshipLayoutDefaults, ...options}
  const model = relationshipModel(graph)
  const dot = relationshipDot(model, settings)
  graphvizLoading ??= Graphviz.load().catch(error => {
    // A failed load is tried again by the next layout
    graphvizLoading = undefined
    throw error
  })
  const graphviz = await graphvizLoading
  const output = JSON.parse(graphviz.layout(dot, 'json', 'dot'))
  return readLayout(output, model, graph, rootHandle, settings)
}
