import { create, select } from 'd3-selection'
import { zoom } from 'd3-zoom'
import { Graphviz } from '@hpcc-js/wasm'

class Relgraph {
  constructor() {
    this.nodes = {}
    this.edges = {}
    this.edge_seen = {}
    this.person_node_map = {}
    this.persons = {}
  }

  addPerson(p) {
    const me = p.handle
    this.persons[me] = {
      handle: me,
    }
  }

  known(me) {
    return this.persons[me] || false
  }

  addNode(family, father, mother) {
    const n = {
      handle: family,
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
    // const sourcefamily = sourcefamily ? sourcefamily : `p_${sourceperson}`
    const key = `${sourcefamily}__${sourceperson}__${targetperson}`
    this.edges[key] = {
      "sourcefamily": sourcefamily,
      "sourceperson": sourceperson,
      "targetperson": targetperson,
    }
  }

  getEdges() {
    return Object.values(this.edges)
  }
}

function createGraph(data) {
  const graph = new Relgraph()

  // step 1: collect all persons to be shown
  for (const p of data) {
    graph.addPerson(p)
  }

  // step 2: create nodes for relevant families
  for (const p of data) {
    for (const f of p.extended.families) {
      graph.addNode(f.handle, f.father_handle, f.mother_handle)
    }
    if (
      p.extended.primary_parent_family &&
      p.extended.primary_parent_family.handle
    ) {
      const f = p.extended.primary_parent_family
      graph.addNode(f.handle, f.father_handle, f.mother_handle)
    }
  }

  // step 3: add nodes for remaining persons not part of any families
  for (const p of data) {
    const nnodes = graph.getNodesOfPerson(p.handle).length
    if (nnodes < 1) {
      graph.addNode(`p_${p.handle}`, p.handle, false)
      console.log(
        `add node for ${p.profile.name_surname}, ${p.profile.name_given}`
      )
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
    } else {
      console.log(
        `No parent family found for ${p.profile.name_surname}, ${p.profile.name_given}`
      )
    }
  }

  return graph
}

function generateDot(data, boxWidth, boxHeight) {
  const graph = createGraph(data)
  let dot = ''
  // nodes
  for (const n of graph.getNodes()) {
    const pf = n.father
    const pm = n.mother
    const widthInches = boxWidth / 66
    const heightInches = boxHeight / 66
    if (pf && pm) {
      dot += `
      subgraph cluster_${n.handle} {
        cluster=true
        color=white
        //labelloc="b"
        margin="50,0"
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
          label=""
          shape="none"
          margin=0
          fixedsize=true
          width=0.1
          height=${heightInches}
        ]
        node_${n.handle}x${pm} [
          class="person_${pf}"
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
        labelloc="b"
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
    for (const targetnode of graph.getNodesOfPerson(e.targetperson)) {
      if (e.sourceperson) {
        // one-person node as source
        dot += `node_${e.sourcefamily}x${e.sourceperson} -> node_${targetnode}x${e.targetperson} [ label=""]
      `
      } else {
        dot += `node_${e.sourcefamily} -> node_${targetnode}x${e.targetperson} [ltail=node_${e.sourcefamily}, label=""]
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
      nodesep=0
      ${dot}
    }
  `
  return dot
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

function remasterChart(divhidden, targetsvg, data, boxWidth, boxHeight) {
  const gvchart = {}
  const gvchartx = divhidden.select('svg')
  gvchart.width = gvchartx.attr('width')
  gvchart.height = gvchartx.attr('height')
  gvchart.chart = gvchartx.html()
  gvchartx.remove()
  targetsvg.html(gvchart.chart)
  for (const p of data) {
    targetsvg.selectAll(`.person_${p.handle}`).each(function () {
      const e = select(this)
      e.selectAll('text').attr('font-family', null)
      const textElement = e.select('text')
      const offsetX = textElement.attr('x') - boxWidth / 2 + 2
      const offsetY = textElement.attr('y') - boxHeight / 2
      e.select('title').remove()
      e.attr('transform', `translate(${offsetX} ${offsetY})`)
      e.selectAll('text').remove()

      e.append('rect')
        .attr(
          'fill',
          p.profile?.sex === 'F' ? 'var(--color-girl)' : 'var(--color-boy)'
        )
        .attr('width', 24)
        .attr('height', boxHeight - 1)
        .attr('x', -4)
        .attr('y', 0)
        .attr('rx', 12)
        .attr('ry', 12)

      e.append('rect', ':first-child')
        .attr('width', boxWidth)
        .attr('height', boxHeight)
        .attr('class', 'personBox')
        .attr('x', 0)
        .attr('y', 0)
        .attr('rx', 8)
        .attr('ry', 8)

      e.append('text')
        .attr('text-anchor', 'start')
        .attr('font-weight', '500')
        .attr('fill', 'rgba(0, 0, 0, 0.9)')
        .attr('paint-order', 'stroke')
        .attr('x', 20)
        .attr('y', 25)
        .text(clipString(`${p.profile.name_surname},`, boxWidth))

      if (p.profile?.name_given) {
        e.append('text')
          .attr('text-anchor', 'start')
          .attr('font-weight', '500')
          .attr('fill', 'rgba(0, 0, 0, 0.9)')
          .attr('paint-order', 'stroke')
          .attr('text-overflow', 'ellipsis')
          .attr('overflow', 'hidden')
          .attr('x', 20)
          .attr('y', 25 + 17)
          .text(clipString(p.profile.name_given, boxWidth))
      }
      if (p.profile?.birth?.date) {
        e.append('text')
          .attr('text-anchor', 'start')
          .attr('font-weight', '350')
          .attr('fill', 'rgba(0, 0, 0, 0.9)')
          .attr('paint-order', 'stroke')
          .attr('x', 20)
          .attr('y', 25 + 17 * 2)
          .text(clipString(`*${p.profile.birth.date}`, boxWidth))
      }

      if (p.profile?.death?.date) {
        e.append('text')
          .attr('text-anchor', 'start')
          .attr('font-weight', '350')
          .attr('fill', 'rgba(0, 0, 0, 0.9)')
          .attr('paint-order', 'stroke')
          .attr('x', 20)
          .attr('y', 25 + 17 * 3)
          .text(clipString(`†${p.profile.death.date}`, boxWidth))
      }
    })
  }
}

export function RelationshipChart(
  data,
  {
    bboxWidth = 300,
    bboxHeight = 150,
    boxWidth = 190,
    boxHeight = 90,
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
  const dot = generateDot(data, boxWidth, boxHeight)
  Graphviz.load().then(graphviz => {
    graphviz.dot(dot)
    divhidden.html(graphviz.layout(dot, 'svg', 'dot'))
    remasterChart(divhidden, chartContent, data, boxWidth, boxHeight)
  })

  const w = 230
  const h = 150
  svg.attr('viewBox', [-w / 2, -h / 2, bboxWidth, bboxHeight])

  return resultnode.node()
}
