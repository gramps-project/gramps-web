import {html} from 'lit'

import {FanChart} from '../charts/FanChart.js'
import {layoutFan} from '../charts/layout/fanLayout.js'
import {chartTransitionDuration} from '../charts/util.js'
import {GrampsjsChartBase} from './GrampsjsChartBase.js'

// Properties that change the layout of the chart
const layoutProperties = ['data', 'grampsId', 'depth']

class GrampsjsFanChart extends GrampsjsChartBase {
  static get properties() {
    return {
      grampsId: {type: String},
      depth: {type: Number},
      color: {type: String},
      nameDisplayFormat: {type: String},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.depth = 5
    this.color = ''
    this._chart = new FanChart()
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
    if (!layoutProperties.some(name => changed.has(name))) {
      return
    }
    // A selected person who is not in the data yet is still being fetched, so
    // the current chart stays until new data arrives. If the new data does not
    // contain them either, the chart is cleared.
    const {handle} = this._graph.personByGrampsId(this.grampsId) ?? {}
    if (handle) {
      this._layout = layoutFan(this._graph, handle, {depth: this.depth})
    } else if (changed.has('data')) {
      this._layout = null
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
      color: this.color || 'default',
      nameDisplayFormat: this.nameDisplayFormat,
      otherLabel: this._('Other'),
      duration: chartTransitionDuration(),
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
    }
  }
}

window.customElements.define('grampsjs-fan-chart', GrampsjsFanChart)
