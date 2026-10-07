import {Graphviz} from '@hpcc-js/wasm'
import {familyMarkerPosition} from '../familyMarker.js'

// Layout of the relationship chart. Each person is drawn once. People who
// share a family as partners, directly or through other partners, form a
// partner group: one Graphviz node, an HTML table with a row of cells for
// their cards and the gaps between them. Edges run from the gap between two
// partners, or from the card of a single parent, to the top of each child's
// card. The graph is laid out by the dot engine and read back from its JSON
// output.

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
// known parent otherwise.
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

  const edges = []
  for (const person of people) {
    for (const family of graph.parentFamilies(person.handle)) {
      const parents = [family.father_handle, family.mother_handle].filter(known)
      const couple = seen.has(family.handle)
      if (parents.length > 0) {
        edges.push({
          family: couple ? family : undefined,
          fromPerson: couple ? undefined : parents[0],
          toPerson: person.handle,
          relation: childRelation(family, person.handle, parents),
        })
      }
    }
  }

  return {groups, groupOfPerson, edges}
}

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
    return {tail: `"${groupName(group)}":"${port}":s`, head}
  }
  const group = model.groupOfPerson.get(edge.fromPerson)
  const port = `p${group.members.indexOf(edge.fromPerson)}`
  return {tail: `"${groupName(group)}":"${port}":s`, head}
}

// Returns the DOT source for a relationship model, with cards of `boxWidth`
// by `boxHeight` pixels
export function relationshipDot(model, options = relationshipLayoutDefaults) {
  const {boxHeight} = options
  const statements = model.groups.map(group => {
    const cells = groupCells(group, options)
      .cells.map(
        cell =>
          `<TD PORT="${cell.port}" FIXEDSIZE="TRUE" WIDTH="${cell.width}" HEIGHT="${boxHeight}"></TD>`
      )
      .join('')
    return `"${groupName(
      group
    )}" [label=<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0"><TR>${cells}</TR></TABLE>>]`
  })
  model.edges.forEach((edge, i) => {
    const {tail, head} = edgeEnds(model, edge, options)
    statements.push(`${tail} -> ${head} [id="e${i}"]`)
  })
  return `digraph gramps {ranksep=2.6 nodesep=0.5 pad=2 splines=polyline nslimit=2.0 charset="UTF-8" node [shape=plain] edge [arrowhead=none] ${statements.join(
    ' '
  )}}`
}

// Returns the nodes, links and bounds of a relationship model from the JSON
// output of Graphviz, with y pointing down and the root person at the origin
function readLayout(output, model, graph, rootHandle, options) {
  const {boxHeight} = options
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
  for (const group of model.groups) {
    const [x, y] = centres.get(groupName(group))
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
        const [markerX, markerY] = familyMarkerPosition(boxHeight)
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
      families.set(groupFamily.family.handle, node)
    }
  }

  // The route of each edge, by its id
  const routes = new Map(
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
  const links = model.edges.map((edge, i) => {
    const source = edge.family
      ? families.get(edge.family.handle)
      : people.get(edge.fromPerson)
    const target = people.get(edge.toPerson)
    return {
      key: `${source.key}->${target.key}`,
      kind: 'child',
      relation: edge.relation,
      source,
      target,
      points: routes.get(`e${i}`) ?? [],
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
  return {
    nodes,
    links,
    bounds: {
      xMin: x0 - originX,
      xMax: x1 - originX,
      yMin: -y1 - originY,
      yMax: -y0 - originY,
    },
    root,
  }
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
// a family or a single parent, to a child `target`, has the `points` of the
// route Graphviz found, a `kind` of `child` and the child's `relation` to the
// linked parents.
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
