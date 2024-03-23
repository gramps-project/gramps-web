import {create, select} from 'd3-selection'
import {zoom} from 'd3-zoom'
import {Graphviz} from '@hpcc-js/wasm'

function createGraph(graph) {
  const data = graph.getData()

  // step 1: collect all persons to be shown
  for (const p of data) {
    graph.addPerson(p)
  }

  // step 2: create nodes for relevant families
  for (const p of data) {
    for (const f of p.extended.families) {
      graph.addNode(f, f.handle, f.father_handle, f.mother_handle)
    }
    if (p.extended?.primary_parent_family?.handle) {
      const f = p.extended.primary_parent_family
      graph.addNode(f, f.handle, f.father_handle, f.mother_handle)
    }
  }

  // step 3: add nodes for remaining persons not part of any families
  for (const p of data) {
    const nnodes = graph.getNodesOfPerson(p.handle).length
    if (nnodes < 1) {
      graph.addNode(undefined, `p_${p.handle}`, p.handle, false)
    }
  }

  // step 4: create edges
  for (const p of data) {
    const f = p.extended.primary_parent_family
    const me = p.handle
    const father = f.father_handle
    const mother = f.mother_handle
    if (graph.known(father) && graph.known(mother)) {
      graph.addEdge(f.handle, false, me)
    } else if (graph.known(father)) {
      graph.addEdge(f.handle, father, me)
    } else if (graph.known(mother)) {
      graph.addEdge(f.handle, mother, me)
    }
  }
}

function generateDot(graph) {
  let dot = ''
  // nodes
  for (const n of graph.getNodes()) {
    const pf = n.father
    const pm = n.mother
    const widthInches = graph.boxWidth / 66
    const heightInches = graph.boxHeight / 66
    if (pf && pm) {
      dot += `
      subgraph cluster_${n.handle} {
        cluster=true
        color=white
        margin="50,0"
        label="."
        node_${n.handle}x${pf} [
          class="person_${pf}"
          margin=0
          shape="none"
          fixedsize=true
          width=${widthInches}
          height=${heightInches}
          label=<->
        ]
        node_${n.handle} [
          class="family_${n.handle}"
          label=<.>
          shape="none"
          margin=0
          fixedsize=true
          width=0.1
          height=${heightInches}
        ]
        node_${n.handle}x${pm} [
          class="person_${pm}"
          margin=0.25
          shape="none"
          fixedsize=true
          width=${widthInches}
          height=${heightInches}
          label=<->
        ]
      }
    `
    } else {
      const p = pf || pm
      dot += `
      subgraph cluster_${n.handle} {
        cluster=true
        color=white
        label="."
        node_${n.handle}x${p} [
          class="person_${p}"
          margin=0.25
          shape="none"
          fixedsize=true
          width=${widthInches}
          height=${heightInches}
          label=<->
        ]
      }
    `
    }
  }
  // edges
  for (const e of graph.getEdges()) {
    for (const targetnode of graph.getNodesOfPerson(e.targetPerson)) {
      if (e.sourcePerson) {
        // one-person node as source
        dot += `node_${e.sourceFamily}x${e.sourcePerson} -> node_${targetnode}x${e.targetPerson} [label="", arrowhead=none, color="#555"]
      `
      } else {
        dot += `node_${e.sourceFamily} -> node_${targetnode}x${e.targetPerson} [ltail=node_${e.sourceFamily}, label="", arrowhead=none, color="#555"]
      `
      }
    }
  }

  // frame dot code with global commands
  dot = `
    digraph gramps {
      compound=true
      ranksep=2.8
      labelloc="t"
      charset="UTF-8"
      pad=2
      splines=polyline
      //splines=ortho
      //splines=spline
      // this controls the number of iterations = nslimit * no_nodes
      nslimit=2.0
      nodesep=0
      ${dot}
    }
  `
  return dot
}

class Relgraph {
  constructor(data, boxWidth, boxHeight, grampsId) {
    this.data = data
    this.boxWidth = boxWidth
    this.boxHeight = boxHeight
    this.rootPersonGrampsId = grampsId
    this.rootPerson = undefined
    this.nodes = {}
    this.edges = {}
    this.edge_seen = {}
    this.person_node_map = {}
    this.persons = {}
    this.dot = undefined
    createGraph(this)
  }

  getData() {
    return this.data
  }

  getDot() {
    if (!this.dot) {
      this.dot = generateDot(this)
    }
    return this.dot
  }

  addPerson(p) {
    const me = p.handle
    this.persons[me] = {
      handle: me,
      profile: p.profile,
    }
    if (p.gramps_id === this.rootPersonGrampsId) {
      this.rootPerson = this.persons[me]
    }
  }

  getRootPerson() {
    return this.rootPerson
  }

  getPersons() {
    return Object.values(this.persons)
  }

  known(me) {
    return this.persons[me] || false
  }

  addNode(fdata, family, father, mother) {
    const n = {
      handle: family,
      type: fdata?.type,
    }
    if (father && this.known(father)) {
      n.father = father
      // remember in which nodes these person can be found
      this.person_node_map[father] = this.person_node_map[father] ?? {}
      this.person_node_map[father][family] = true
      // map persondata into node
      n.fatherdata = this.known(father)
    }
    if (mother && this.known(mother)) {
      n.mother = mother
      // remember in which nodes these person can be found
      this.person_node_map[mother] = this.person_node_map[mother] ?? {}
      this.person_node_map[mother][family] = true
      // map persondata into node
      n.motherdata = this.known(mother)
    }
    if (n.father || n.mother) {
      this.nodes[family] = n
    }
  }

  getNode(family) {
    return this.nodes[family] || false
  }

  getNodes() {
    return Object.values(this.nodes)
  }

  getNodesOfPerson(me) {
    if (this.person_node_map[me]) {
      const x = Object.keys(this.person_node_map[me])
      return x
    }
    return []
  }

  addEdge(sourcefamily, sourceperson, targetperson) {
    const key = `${sourcefamily}__${sourceperson}__${targetperson}`
    this.edges[key] = {
      sourceFamily: sourcefamily,
      sourcePerson: sourceperson,
      targetPerson: targetperson,
    }
  }

  getEdges() {
    return Object.values(this.edges)
  }
}

const clipString = (s, length) => {
  if (!s) {
    return ''
  }
  const fontSize = 13
  const nChar = length / (fontSize * 0.6)
  if (s.length <= nChar) {
    return s
  }
  if (nChar < 2) {
    return ''
  }
  return `${s.slice(0, nChar - 2)}…`
}

function clicked(event, d) {
  dispatchEvent(
    new CustomEvent('pedigree:person-selected', {
      bubbles: true,
      composed: true,
      detail: {grampsId: d.profile?.gramps_id},
    })
  )
}
function remasterChart(divhidden, targetsvg, graph, boxWidth, boxHeight) {
  const gvchartx = divhidden.select('svg')
  const nodedata = []
  gvchartx.selectAll('title').remove()
  // based on graphviz created nodes build array containing node data to be bound to d3 nodes
  gvchartx.selectAll('.node').each(function () {
    const e = select(this)
    const textElement = e.select('text')
    const x = textElement.attr('x')
    const y = textElement.attr('y')
    const c = e.attr('class')
    const found = c.match(/(?<handletype>family|person)_(?<handle>\S+)/)
    if (found.groups.handletype === 'person') {
      const d = graph.known(found.groups.handle)
      nodedata.push({
        nodetype: 'person',
        xCoord: x - boxWidth / 2 + 4,
        yCoord: y - boxHeight / 2,
        profile: d.profile,
        handle: found.groups.handle,
      })
    } else if (found.groups.handletype === 'family') {
      const d = graph.getNode(found.groups.handle)
      nodedata.push({
        nodetype: 'family',
        xCoord: x,
        yCoord: y,
        type: d.type,
        handle: found.groups.handle,
      })
    }
  })
  // build d3 based nodes with data bound to them
  const nodes = targetsvg
    .selectAll('.node')
    .data(nodedata)
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.xCoord} ${d.yCoord})`)
    .attr('class', d => `node ${d.nodetype}`)

  nodes
    .filter(d => d.nodetype === 'person')
    .append('rect')
    .attr('fill', d =>
      d.profile?.sex === 'F' ? 'var(--color-girl)' : 'var(--color-boy)'
    )
    .attr('width', 24)
    .attr('height', boxHeight - 1)
    .attr('x', -4)
    .attr('y', 0)
    .attr('rx', 12)
    .attr('ry', 12)

  nodes
    .filter(d => d.nodetype === 'person')
    .append('rect', ':first-child')
    .attr('width', boxWidth)
    .attr('height', boxHeight)
    .attr('class', 'personBox')
    .attr('x', 0)
    .attr('y', 0)
    .attr('rx', 8)
    .attr('ry', 8)

  nodes
    .filter(d => d.nodetype === 'person')
    .append('text')
    .attr('text-anchor', 'start')
    .attr('font-weight', '500')
    .attr('fill', 'rgba(0, 0, 0, 0.9)')
    .attr('paint-order', 'stroke')
    .attr('x', 20)
    .attr('y', 25)
    .text(d => clipString(`${d.profile.name_surname},`, boxWidth))

  nodes
    .filter(d => d.profile?.name_given && d.nodetype === 'person')
    .append('text')
    .attr('text-anchor', 'start')
    .attr('font-weight', '500')
    .attr('fill', 'rgba(0, 0, 0, 0.9)')
    .attr('paint-order', 'stroke')
    .attr('text-overflow', 'ellipsis')
    .attr('overflow', 'hidden')
    .attr('x', 20)
    .attr('y', 25 + 17)
    .text(d => clipString(d.profile.name_given, boxWidth))

  nodes
    .filter(d => d.profile?.birth?.date && d.nodetype === 'person')
    .append('text')
    .attr('text-anchor', 'start')
    .attr('font-weight', '350')
    .attr('fill', 'rgba(0, 0, 0, 0.9)')
    .attr('paint-order', 'stroke')
    .attr('x', 20)
    .attr('y', 25 + 17 * 2)
    .text(d => clipString(`*${d.profile.birth.date}`, boxWidth))

  nodes
    .filter(d => d.profile?.death?.date && d.nodetype === 'person')
    .append('text')
    .attr('text-anchor', 'start')
    .attr('font-weight', '350')
    .attr('fill', 'rgba(0, 0, 0, 0.9)')
    .attr('paint-order', 'stroke')
    .attr('x', 20)
    .attr('y', 25 + 17 * 3)
    .text(d => clipString(`†${d.profile.death.date}`, boxWidth))

  nodes
    .filter(d => d.type === 'Married' && d.nodetype === 'family')
    .append('circle')
    .attr('r', 5)
    .attr('class', 'married')

  nodes
    .filter(d => d.nodetype === 'person')
    .style('cursor', 'pointer')
    .on('click', clicked)

  // copy edges
  const edges = targetsvg.append('g').attr('class', 'edges')
  gvchartx.selectAll('.edge').each(function () {
    edges.append('g').attr('class', 'edge').html(select(this).html())
  })
  edges.selectAll('path').attr('stroke-opacity', '0.4')

  // move root person to center
  nodes
    .filter(d => d.handle === graph.rootPerson?.handle)
    .each(d => {
      const rpc = {
        x: -1 * d.xCoord - boxWidth / 2,
        y: -1 * d.yCoord - boxHeight / 2,
      }
      targetsvg.attr('transform', `translate(${rpc.x} ${rpc.y})`)
    })

  // kill hidden graphviz generated svg
  gvchartx.remove()
}

export function RelationshipChart(
  data,
  {
    bboxWidth = 300,
    bboxHeight = 150,
    boxWidth = 190,
    boxHeight = 90,
    grampsId = 0,
    // orientation = 'LTR',
  }
) {
  const resultnode = create('div').style('width', '100%')
  const divhidden = resultnode.append('div').style('display', 'none')
  const svg = resultnode
    .append('svg')
    .call(
      zoom().on('zoom', e =>
        svg.select('#chart-content').attr('transform', e.transform)
      )
    )
    .attr('font-family', 'Inter var')
    .attr('font-size', 13)

  const chartContent = svg.append('g').attr('id', 'chart-content')
  const graph = new Relgraph(data, boxWidth, boxHeight, grampsId)
  const dot = graph.getDot()
  Graphviz.load().then(graphviz => {
    graphviz.dot(dot)
    divhidden.html(graphviz.layout(dot, 'svg', 'dot'))
    remasterChart(
      divhidden,
      chartContent.append('g'),
      graph,
      boxWidth,
      boxHeight,
      grampsId
    )
    svg.attr('viewBox', [
      -bboxWidth / 2,
      -bboxHeight / 2,
      bboxWidth,
      bboxHeight,
    ])
  })

  return resultnode.node()
}
