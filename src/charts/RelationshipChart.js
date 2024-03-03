import {create} from 'd3-selection'
import {zoom} from 'd3-zoom'
import {Graphviz} from '@hpcc-js/wasm'

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
    const name = `${p.profile.name_surname.replace(
      /"[<>]/g,
      ''
    )}, ${p.profile.name_given.replace(/<>/g, '')}`
    this.persons[me] = {
      handle: me,
      name: name,
      birth: p.profile.birth.date ? `*${p.profile.birth.date}` : '&nbsp;',
      death: p.profile.death.date
        ? `&dagger;${p.profile.death.date}`
        : '&nbsp;',
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

  addEdge(from, to) {
    const key = `${from}__${to}`
    this.edges[key] = {parent: from, child: to}
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
    }
  }

  // step 4: create edges
  for (const p of data) {
    const f = p.extended.primary_parent_family
    const me = p.handle
    let family = false
    const father = f.father_handle
    const mother = f.mother_handle
    if (graph.known(father) && graph.known(mother)) {
      family = f.handle
    } else if (graph.known(father)) {
      family = `p_${father}`
    } else if (graph.known(mother)) {
      family = `p_${mother}`
    }
    if (family) {
      graph.addEdge(family, me)
    } else {
      console.log('No parent family found')
    }
  }

  return graph
}

function generateDot(data) {
  const graph = createGraph(data)
  let dot = ''
  // nodes
  for (const n of graph.getNodes()) {
    const pf = n.father
    const pm = n.mother
    if (pf && pm) {
      dot += `
      subgraph cluster_${n.handle} {
        cluster=true
        color=white
        labelloc="b"
        margin="50,0"
        node_${n.handle}x${pf} [
          fontname="sans-serif"
          margin=0.25
          shape="rect"
          style="filled"
          fillcolor="#e6e6e6"
          label=<<TABLE BORDER="0">
          <TR><TD ALIGN="LEFT"><B>${n.fatherdata.name}  </B></TD></TR>
          <TR><TD ALIGN="LEFT">${n.fatherdata.birth}</TD></TR>
          <TR><TD ALIGN="LEFT">${n.fatherdata.death}</TD></TR>
          </TABLE>
          >
        ]
        node_${n.handle} [
          label=""
          shape="none"
          margin=0
          fixedsize=true
          width=0.1
          height=1.5
        ]
        node_${n.handle}x${pm} [
          fontname="sans-serif"
          margin=0.25
          shape="rect"
          style="filled"
          fillcolor="#e6e6e6"
          label=<<TABLE BORDER="0">
          <TR><TD ALIGN="LEFT"><B>${n.motherdata.name}  </B></TD></TR>
          <TR><TD ALIGN="LEFT">${n.motherdata.birth}</TD></TR>
          <TR><TD ALIGN="LEFT">${n.motherdata.death}</TD></TR>
          </TABLE>
          >
        ]
      }
    `
    } else {
      const p = pf || pm
      const name = pf ? n.fatherdata.name : n.motherdata.name
      const birth = pf ? n.fatherdata.birth : n.motherdata.birth
      const death = pf ? n.fatherdata.death : n.motherdata.death
      dot += `
      subgraph cluster_${n.handle} {
        cluster=true
        color=white
        labelloc="b"
        node_${n.handle}x${p} [
          fontname="sans-serif"
          margin=0.25
          shape="rect"
          style="filled"
          fillcolor="#e6e6e6"
          label=<<TABLE BORDER="0">
          <TR><TD ALIGN="LEFT"><B>${name}  </B></TD></TR>
          <TR><TD ALIGN="LEFT">${birth}</TD></TR>
          <TR><TD ALIGN="LEFT">${death}</TD></TR>
          </TABLE>
          >
        ]
      }
    `
    }
  }
  // edges
  for (const e of graph.getEdges()) {
    for (const target of graph.getNodesOfPerson(e.child)) {
      dot += `node_${e.parent} -> node_${target}x${e.child} [ltail=node_${e.parent}, label=""]
      `
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

function fixit(divhidden, targetsvg) {
  const gvchart = {}
  const gvchartx = divhidden.select('svg')
  gvchart.width = gvchartx.attr('width')
  gvchart.height = gvchartx.attr('height')
  gvchart.chart = gvchartx.html()
  gvchartx.remove()
  targetsvg.html(gvchart.chart)
}

export function RelationshipChart(
  data,
  {
    bboxWidth = 190,
    bboxHeight = 90,
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
  const chartContent = svg.append('g').attr('id', 'chart-content')
  const dot = generateDot(data)
  Graphviz.load().then(graphviz => {
    graphviz.dot(dot)
    divhidden.html(graphviz.layout(dot, 'svg', 'dot'))
    fixit(divhidden, chartContent)
  })

  const w = 230
  const h = 150
  svg.attr('viewBox', [-w / 2, -h / 2, bboxWidth, bboxHeight])

  return resultnode.node()
}
