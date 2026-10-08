import {html} from 'lit'

import {TreeChart} from '../charts/TreeChart.js'
import {
  layoutAncestors,
  layoutDescendants,
  layoutHourglass,
} from '../charts/layout/treeLayout.js'
import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {rootRelatives} from './GrampsjsChartRelativesMenu.js'
import {chartTransitionDuration, getImageUrl} from '../charts/util.js'
import {getSymbols} from '../symbols.js'

// Properties that change the layout of the chart
const layoutProperties = [
  'data',
  'grampsId',
  'ancestors',
  'descendants',
  'nAnc',
  'nDesc',
  'gapX',
  'vertical',
  'expanded',
]

class GrampsjsTreeChart extends GrampsjsChartBase {
  static get properties() {
    return {
      grampsId: {type: String},
      nAnc: {type: Number},
      nDesc: {type: Number},
      ancestors: {type: Boolean},
      descendants: {type: Boolean},
      gapX: {type: Number},
      vertical: {type: Boolean},
      expanded: {type: Object},
      nameDisplayFormat: {type: String},
      canEdit: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.nAnc = 5
    this.nDesc = 5
    this.gapX = 30
    this.vertical = false
    // The handles of the people who show one more generation
    this.expanded = new Set()
    this._chart = new TreeChart()
  }

  render() {
    return html`
      <div
        @pedigree:show-children="${this._openMenu}"
        style="position:relative;"
      >
        <div id="container"></div>
        <grampsjs-chart-relatives-menu
          id="relatives-menu"
          .relatives=${this._relatives()}
          nameDisplayFormat=${this.nameDisplayFormat}
          .appState=${this.appState}
        ></grampsjs-chart-relatives-menu>
      </div>
    `
  }

  firstUpdated() {
    super.firstUpdated()
    this.renderRoot.getElementById('container').append(this._chart.node)
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    if (!layoutProperties.some(name => changed.has(name))) {
      return
    }
    // A selected person who is not in the data yet is still being fetched, so
    // the current chart stays until new data arrives. If the new data does not
    // contain them either, the chart is cleared.
    const layout = this._computeLayout()
    if (layout || changed.has('data')) {
      this._layout = layout
    }
  }

  updated() {
    this._drawChart()
  }

  _computeLayout() {
    const {handle} = this._graph.personByGrampsId(this.grampsId) ?? {}
    if (!handle) {
      return null
    }
    if (this.ancestors && this.descendants) {
      return layoutHourglass(this._graph, handle, {
        ancestorDepth: this.nAnc,
        descendantDepth: this.nDesc,
        gapX: this.gapX,
        vertical: this.vertical,
        expanded: this.expanded,
      })
    }
    if (this.descendants) {
      return layoutDescendants(this._graph, handle, {
        depth: this.nDesc,
        gapX: this.gapX,
        vertical: this.vertical,
        expanded: this.expanded,
      })
    }
    return layoutAncestors(this._graph, handle, {
      depth: this.nAnc,
      gapX: this.gapX,
      vertical: this.vertical,
      expanded: this.expanded,
    })
  }

  _drawChart() {
    if (!this._layout) {
      this._chart.clear()
      return
    }
    this._chart.update(this._layout, this.chartOptions())
  }

  chartOptions() {
    return {
      childrenTriangle: this._relatives().length > 0,
      triangleLabel: this.descendants ? this._('Parents') : this._('Children'),
      expandLabels: {
        ancestors: this._('Parents'),
        descendants: this._('Children'),
      },
      getImageUrl: d => getImageUrl(d.person, 100),
      menuSide: this._menuSide(),
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
      nameDisplayFormat: this.nameDisplayFormat,
      ...getSymbols(this.appState.settings, s => this._(s)),
      canEdit: this.canEdit,
      duration: chartTransitionDuration(),
    }
  }

  // The menu of relatives is on the side of the root person's card that
  // faces away from the chart
  _menuSide() {
    if (this.vertical) {
      return this.descendants ? 'top' : 'bottom'
    }
    return this.descendants ? 'right' : 'left'
  }

  // Returns the relatives in the menu of the root person's triangle: the
  // parents in a descendant chart and the children in an ancestor
  // chart. Hourglass charts show both, so they have no menu.
  _relatives() {
    if (this.ancestors && this.descendants) {
      return []
    }
    return rootRelatives(
      this._graph,
      this.grampsId,
      this.descendants ? 'parents' : 'children'
    )
  }

  _openMenu(e) {
    this.renderRoot.getElementById('relatives-menu').open(e.target)
  }
}

window.customElements.define('grampsjs-tree-chart', GrampsjsTreeChart)
