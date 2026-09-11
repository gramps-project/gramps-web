import {create, select} from 'd3-selection'
import {zoom} from 'd3-zoom'
import {linkVertical} from 'd3-shape'
import {Graphviz} from '@hpcc-js/wasm'
import {chartNameDisplayFormat} from '../util.js'
import {chartPalette} from './palette.js'
import {appendPersonCard, setPersonCardInteraction} from './personCard.js'

function createGraph(graph) {
  const data = graph.getData()

  // step 1: collect all persons to be shown
  for (const p of data) {
    graph.addPerson(p)
  }

  // step 2: create nodes for relevant families
  for (const p of data) {
    for (const f of p.extended.families) {
      if (graph.known(f.father_handle) && graph.known(f.mother_handle)) {
        graph.addNode(f, f.handle, f.father_handle, f.mother_handle)
      }
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

  // step 5: connect unconnected couples (no parents and more than one family)
  for (const p of data) {
    const fp = p.extended?.primary_parent_family
    // no parents?
    if (
      (!fp?.father_handle || !graph.known(fp?.father_handle)) &&
      (!fp?.mother_handle || !graph.known(fp?.mother_handle))
    ) {
      let np = 0
      for (const f of p.extended.families) {
        let ck = 0
        for (const c of f.child_ref_list) {
          if (graph.known(c.ref)) {
            ck += 1
          }
        }
        if (
          (graph.known(f?.father_handle) && graph.known(f?.mother_handle)) ||
          ck > 0
        ) {
          np += 1
        }
      }
      // occurs more than one time and needs to be connected by fake parent
      if (np > 1) {
        const fakeHandle = `fakeparent${p.handle}`
        graph.addPerson({
          handle: fakeHandle,
          gramps_id: '',
          profile: {
            fake: true,
            name_given: 'FAKE',
            name_surname: p.profile.name_surname,
          },
        })
        graph.addNode({fake: true}, `p_${fakeHandle}`, fakeHandle, false)
        graph.addEdge(`p_${fakeHandle}`, fakeHandle, p.handle)
      }
    }
  }
}

function generateDot(graph) {
  let dot = ''
  // nodes
  for (const n of graph.getNodes()) {
    const pf = n.father
    const pm = n.mother
    const widthInches = n.fake ? 0 : graph.boxWidth / 66
    const heightInches = n.fake ? 0 : graph.boxHeight / 66 - 0.3
    if (pf && pm) {
      dot += `
      subgraph "cluster_${n.handle}" {
        cluster=true
        color=white
        margin="50,0"
        label="."
        "node_${n.handle}x${pf}" [
          class="person_${pf}"
          margin=0
          shape="none"
          fixedsize=true
          width=${widthInches}
          height=${heightInches}
          label=<->
        ]
        "node_${n.handle}" [
          class="family_${n.handle}"
          label=<.>
          shape="none"
          margin=0
          fixedsize=true
          width=0.1
          height=${heightInches}
        ]
        "node_${n.handle}x${pm}" [
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
      subgraph "cluster_${n.handle}" {
        cluster=true
        color=white
        label="."
        "node_${n.handle}x${p}" [
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
        dot += `"node_${e.sourceFamily}x${e.sourcePerson}" -> "node_${targetnode}x${e.targetPerson}" [label="", arrowhead=none, color="#555"]
      `
      } else {
        dot += `"node_${e.sourceFamily}" -> "node_${targetnode}x${e.targetPerson}" [ltail="node_${e.sourceFamily}", label="", arrowhead=none, color="#555"]
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
    this.shrinkToFit = false
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
      data: p,
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
      fake: fdata?.fake,
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

function remasterChart(
  divhidden,
  targetsvg,
  graph,
  boxWidth,
  boxHeight,
  imgPadding,
  getImageUrl,
  maxImages,
  nameDisplayFormat,
  canEdit = false,
  palette = chartPalette
) {
  const gvchartx = divhidden.select('svg')
  const nodedata = []
  gvchartx.selectAll('title').remove()
  // based on graphviz created nodes build array containing node data to be bound to d3 nodes
  let imageCount = 0
  gvchartx.selectAll('.node').each(function () {
    const e = select(this)
    const textElement = e.select('text')
    const x = textElement.attr('x')
    const y = textElement.attr('y')
    const c = e.attr('class')
    const found = c.match(/(?<handletype>family|person)_(?<handle>\S+)/)
    if (found.groups.handletype === 'person') {
      const d = graph.known(found.groups.handle)
      const imageUrl = getImageUrl(d)
      if (imageUrl) {
        imageCount += 1
      }
      nodedata.push({
        nodetype: d.profile.fake ? 'fake' : 'person',
        xCoord: Number(x) + 4,
        yCoord: Number(y),
        profile: d.profile,
        imageUrl: imageCount > maxImages ? '' : imageUrl,
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
  // container for edges
  const edges = targetsvg.append('g').attr('class', 'edges')

  // build d3 based nodes with data bound to them
  const nodes = targetsvg
    .selectAll('.node')
    .data(nodedata)
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.xCoord} ${d.yCoord})`)
    .attr('class', d => `node ${d.nodetype}`)

  const personNodes = nodes.filter(d => d.nodetype === 'person')
  appendPersonCard(personNodes, {
    profile: d => d.profile,
    imageUrl: d => d.imageUrl,
    boxWidth,
    boxHeight,
    imgPadding,
    nameDisplayFormat,
    palette,
  })
  setPersonCardInteraction(personNodes, {
    profile: d => d.profile,
    handle: d => d.handle,
    boxWidth,
    boxHeight,
    canEdit,
    palette,
  })

  nodes
    .filter(d => d.type === 'Married' && d.nodetype === 'family')
    .append('circle')
    .attr('class', 'married')
    .attr('r', 6)
    .attr('cy', boxHeight / 2 - 10)
    .attr('stroke', 'var(--grampsjs-body-font-color-40)')
    .attr('fill', 'var(--grampsjs-color-shade-220)')

  nodes
    .filter(d => d.type === 'Married' && d.nodetype === 'family')
    .insert('line', ':first-child')
    .attr('class', 'married')
    .attr('x1', -11)
    .attr('x2', 11)
    .attr('y1', boxHeight / 2 - 10)
    .attr('y2', boxHeight / 2 - 10)
    .attr('stroke', 'var(--grampsjs-body-font-color-40)')
    .attr('stroke-width', 1)

  const linkGenerator = linkVertical()
    .x(d => d.x)
    .y(d => d.y)
  // copy edges
  gvchartx.selectAll('.edge').each(function () {
    const path = select(this).select('path')
    const pathData = path.attr('d')
    // extract points from path data
    const points = pathData
      ?.match(/-?[\d.]+,-?[\d.]+/g) // Find all "x,y" pairs
      ?.map(d => d.split(',').map(Number)) // Convert to [x, y] arrays
    // we use only the start and end point
    const firstAndLastPoint = [points[0], points[points.length - 1]]
    if (!points) {
      return
    }
    // we replace the polyline with a smooth connector from start to end
    edges
      .append('path')
      .attr('class', 'edge')
      .attr(
        'd',
        linkGenerator({
          source: {x: firstAndLastPoint[0][0], y: firstAndLastPoint[0][1]},
          target: {x: firstAndLastPoint[1][0], y: firstAndLastPoint[1][1]},
        })
      )
      .attr('fill', 'none')
      .attr('stroke', 'var(--grampsjs-body-font-color-40)')
      .attr('stroke-width', 1)
  })
  // edges.selectAll('path').attr('stroke-opacity', '0.4')

  // move root person to center
  nodes
    .filter(d => d.handle === graph.rootPerson?.handle)
    .each(d => {
      const rpc = {
        x: -d.xCoord,
        y: -d.yCoord,
      }
      targetsvg.attr('transform', `translate(${rpc.x} ${rpc.y})`)
    })

  // highlight root person
  nodes
    .filter(d => d.handle === graph.rootPerson?.handle)
    .style('filter', `drop-shadow(0 3px 8px ${palette.shadow})`)

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
    imgPadding = 10,
    getImageUrl = null,
    grampsId = 0,
    maxImages = 50,
    shrinkToFit = false,
    // orientation = 'LTR',
    nameDisplayFormat = chartNameDisplayFormat.surnameThenGiven,
    canEdit = false,
    initialZoom = null,
    palette = chartPalette,
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

  if (initialZoom) {
    svg.node().__zoom = initialZoom
    chartContent.attr('transform', initialZoom.toString())
  }
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
      imgPadding,
      getImageUrl,
      maxImages,
      nameDisplayFormat,
      canEdit,
      palette
    )
    svg.attr('viewBox', [
      -bboxWidth / 2,
      -bboxHeight / 2,
      bboxWidth,
      bboxHeight,
    ])
    if (shrinkToFit) {
      const bbox = svg.node().getBBox()
      if (bbox.height > bboxHeight) {
        svg
          .attr('viewBox', [bbox.x, bbox.y - 20, bbox.width, bbox.height + 40])
          .attr('height', bboxHeight)
          .attr('width', bboxWidth)
      }
    }
  })

  return svg.node()
}
