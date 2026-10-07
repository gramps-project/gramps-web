import {html} from 'lit'

import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {RelationshipChart} from '../charts/RelationshipChart.js'
import {chartTransitionDuration, getImageUrl} from '../charts/util.js'
import {getSymbols} from '../symbols.js'

class GrampsjsRelationshipChart extends GrampsjsChartBase {
  static get properties() {
    return {
      grampsId: {type: String},
      nameDisplayFormat: {type: String},
      canEdit: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this._chart = new RelationshipChart()
  }

  render() {
    return html`<div id="container"></div>`
  }

  firstUpdated() {
    super.firstUpdated()
    this.renderRoot.getElementById('container').append(this._chart.node)
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    if (!changed.has('data') && !changed.has('grampsId')) {
      return
    }
    // A selected person who is not in the data yet is still being fetched, so
    // the current chart stays until new data arrives. If the new data does not
    // contain them either, the chart is cleared.
    const root = this._graph.personByGrampsId(this.grampsId)
    if (root) {
      this._requestRelationshipLayout(this._graph, root.handle)
    } else if (changed.has('data')) {
      this._clearRelationshipLayout()
    }
  }

  updated() {
    if (!this._layout) {
      this._chart.clear()
      return
    }
    this._chart.update(this._layout, this.chartOptions())
  }

  chartOptions() {
    return {
      getImageUrl: node => getImageUrl(node.person, 100),
      nameDisplayFormat: this.nameDisplayFormat,
      ...getSymbols(this.appState.settings, s => this._(s)),
      canEdit: this.canEdit,
      duration: chartTransitionDuration(),
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
    }
  }
}

window.customElements.define(
  'grampsjs-relationship-chart',
  GrampsjsRelationshipChart
)
