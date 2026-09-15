import {Graphviz} from '@hpcc-js/wasm'

// Layout of the relationship chart. The people are turned into a Graphviz
// graph with a cluster for each couple, laid out by the dot engine and read
// back from its JSON output.

// Size of the person cards the layout makes room for, in pixels
export const relationshipLayoutDefaults = {
  boxWidth: 190,
  boxHeight: 90,
}

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

// Returns the Graphviz model of the relationship chart of all people in
// `graph`. A family with both partners known, and each parent family of a
// person, gets a cluster with its known partners; every other person gets a
// cluster of their own. Edges link children to their parent families. People
// without known parents who appear in more than one family get a placeholder
// parent, which keeps their clusters together.
export function relationshipModel(graph) {
  const people = graph.people()
  const known = handle => Boolean(handle) && graph.person(handle) !== undefined
  const clusters = new Map()
  const clustersOfPerson = new Map()
  const edges = new Map()

  const addCluster = (key, family, partners, placeholder = false) => {
    const members = partners.filter(handle => placeholder || known(handle))
    if (members.length === 0) {
      return
    }
    clusters.set(key, {key, family, members, placeholder})
    for (const handle of members) {
      const keys = clustersOfPerson.get(handle) ?? new Set()
      keys.add(key)
      clustersOfPerson.set(handle, keys)
    }
  }

  // `fromPerson` is the parent the edge starts at, or undefined to start at
  // the family between two partners
  const addEdge = (familyKey, fromPerson, toPerson, link) => {
    edges.set(`${familyKey}__${fromPerson}__${toPerson}`, {
      familyKey,
      fromPerson,
      toPerson,
      ...link,
    })
  }

  for (const person of people) {
    for (const family of graph.partnerFamilies(person.handle)) {
      if (known(family.father_handle) && known(family.mother_handle)) {
        addCluster(family.handle, family, [
          family.father_handle,
          family.mother_handle,
        ])
      }
    }
    for (const family of graph.parentFamilies(person.handle)) {
      addCluster(family.handle, family, [
        family.father_handle,
        family.mother_handle,
      ])
    }
  }

  for (const person of people) {
    if (!clustersOfPerson.has(person.handle)) {
      addCluster(`p_${person.handle}`, undefined, [person.handle])
    }
  }

  // Children are linked from the family when both parents are known, and
  // from the known parent otherwise
  for (const person of people) {
    for (const family of graph.parentFamilies(person.handle)) {
      const parents = [family.father_handle, family.mother_handle].filter(known)
      if (parents.length > 0) {
        addEdge(
          family.handle,
          parents.length === 2 ? undefined : parents[0],
          person.handle,
          {
            kind: 'child',
            relation: childRelation(family, person.handle, parents),
          }
        )
      }
    }
  }

  for (const person of people) {
    const hasKnownParents = graph
      .parentFamilies(person.handle)
      .some(
        family => known(family.father_handle) || known(family.mother_handle)
      )
    const shownFamilies = graph
      .partnerFamilies(person.handle)
      .filter(
        family =>
          (known(family.father_handle) && known(family.mother_handle)) ||
          (family.child_ref_list ?? []).some(childRef => known(childRef.ref))
      )
    if (!hasKnownParents && shownFamilies.length > 1) {
      const placeholder = `fakeparent${person.handle}`
      addCluster(`p_${placeholder}`, undefined, [placeholder], true)
      addEdge(`p_${placeholder}`, placeholder, person.handle, {
        kind: 'placeholder',
      })
    }
  }

  return {
    clusters: [...clusters.values()],
    clustersOfPerson,
    edges: [...edges.values()],
  }
}

// Returns the name of a node in the DOT source: a person's box in a cluster,
// or the family between the two partners of a cluster
const nodeName = (clusterKey, handle) =>
  handle === undefined ? `node_${clusterKey}` : `node_${clusterKey}x${handle}`

// Returns the DOT source for a relationship model, with person boxes sized
// for cards of `boxWidth` by `boxHeight` pixels
export function relationshipDot(
  model,
  {boxWidth, boxHeight} = relationshipLayoutDefaults
) {
  const statements = []
  for (const cluster of model.clusters) {
    const width = cluster.placeholder ? 0 : boxWidth / 66
    const height = cluster.placeholder ? 0 : boxHeight / 66 - 0.3
    const personNode = (handle, margin) =>
      `"${nodeName(
        cluster.key,
        handle
      )}" [margin=${margin} shape="none" fixedsize=true width=${width} height=${height} label=<->]`
    const [first, second] = cluster.members
    if (second === undefined) {
      statements.push(
        `subgraph "cluster_${
          cluster.key
        }" {cluster=true color=white label="." ${personNode(first, 0.25)}}`
      )
    } else {
      statements.push(
        `subgraph "cluster_${
          cluster.key
        }" {cluster=true color=white margin="50,0" label="." ${personNode(
          first,
          0
        )} "${nodeName(
          cluster.key
        )}" [label=<.> shape="none" margin=0 fixedsize=true width=0.1 height=${height}] ${personNode(
          second,
          0.25
        )}}`
      )
    }
  }
  for (const edge of model.edges) {
    for (const clusterKey of model.clustersOfPerson.get(edge.toPerson) ?? []) {
      const target = nodeName(clusterKey, edge.toPerson)
      const source = nodeName(edge.familyKey, edge.fromPerson)
      const tail = edge.fromPerson === undefined ? `ltail="${source}", ` : ''
      statements.push(
        `"${source}" -> "${target}" [${tail}label="", arrowhead=none, color="#555"]`
      )
    }
  }
  return `digraph gramps {compound=true ranksep=2.8 labelloc="t" charset="UTF-8" pad=2 splines=polyline nslimit=2.0 nodesep=0 ${statements.join(
    ' '
  )}}`
}

// Returns the nodes, links and bounds of a relationship model from the JSON
// output of Graphviz, with y pointing down and the first node of the person
// with `rootHandle` at the origin
function readLayout(output, model, graph, rootHandle) {
  const centres = new Map(
    (output.objects ?? [])
      .filter(object => object.pos)
      .map(object => {
        const [x, y] = object.pos.split(',').map(Number)
        return [object.name, [x, -y]]
      })
  )
  const nodes = []
  const nodesByName = new Map()
  const addNode = (name, node) => {
    const [x, y] = centres.get(name)
    const positioned = {...node, x, y}
    nodes.push(positioned)
    nodesByName.set(name, positioned)
  }
  for (const cluster of model.clusters) {
    const [first, second] = cluster.members
    if (cluster.placeholder) {
      addNode(nodeName(cluster.key, first), {
        key: `placeholder:${first}`,
        kind: 'placeholder',
      })
    } else {
      const personNode = handle => ({
        key: `${cluster.key}:${handle}`,
        kind: 'person',
        handle,
        person: graph.person(handle),
        family: cluster.family,
      })
      addNode(nodeName(cluster.key, first), personNode(first))
      if (second !== undefined) {
        addNode(nodeName(cluster.key), {
          key: `family:${cluster.key}`,
          kind: 'family',
          family: cluster.family,
        })
        addNode(nodeName(cluster.key, second), personNode(second))
      }
    }
  }

  // The route of each edge, by the names of its tail and head nodes
  const names = (output.objects ?? []).map(object => object.name)
  const routes = new Map(
    (output.edges ?? []).map(edge => [
      `${names[edge.tail]}->${names[edge.head]}`,
      (edge.pos ?? '')
        .split(' ')
        .filter(token => token && !/^[se],/.test(token))
        .map(token => {
          const [x, y] = token.split(',').map(Number)
          return [x, -y]
        }),
    ])
  )

  const links = model.edges.flatMap(edge => {
    const sourceName = nodeName(edge.familyKey, edge.fromPerson)
    const source = nodesByName.get(sourceName)
    return [...(model.clustersOfPerson.get(edge.toPerson) ?? [])].map(
      clusterKey => {
        const targetName = nodeName(clusterKey, edge.toPerson)
        const target = nodesByName.get(targetName)
        return {
          key: `${source.key}->${target.key}`,
          kind: edge.kind,
          relation: edge.relation,
          source,
          target,
          points: routes.get(`${sourceName}->${targetName}`) ?? [],
        }
      }
    )
  })

  const root = nodes.find(
    node => node.kind === 'person' && node.handle === rootHandle
  )
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
// in pixels, with y pointing down and `root`, the first node of the root
// person, at the origin.
//
// Each node has a unique `key`, a `kind` and its centre `x`, `y`. A `person`
// node has the person's `handle` and `person` object and the `family` of the
// cluster it is drawn in; a person in several families has one node per
// family. A `family` node lies between the two partners of its `family`. A
// `placeholder` node is an invisible parent that keeps a person's families
// together. Each link has a `source` and a `target` node, the `points` of the
// route Graphviz found from source to target, and a `kind`: `child`, with the
// child's `relation` to the linked parents, or `placeholder`.
export async function layoutRelationships(graph, rootHandle, options = {}) {
  const model = relationshipModel(graph)
  const dot = relationshipDot(model, {
    ...relationshipLayoutDefaults,
    ...options,
  })
  graphvizLoading ??= Graphviz.load().catch(error => {
    // A failed load is tried again by the next layout
    graphvizLoading = undefined
    throw error
  })
  const graphviz = await graphvizLoading
  const output = JSON.parse(graphviz.layout(dot, 'json', 'dot'))
  return readLayout(output, model, graph, rootHandle)
}
