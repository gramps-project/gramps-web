import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewHourglassChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this.nAnc = 1
    this.nDesc = 1
    this._setAnc = false
  }

  _resetLevels() {
    this.nDesc = 1
  }

  renderChart() {
    return html`
      <grampsjs-tree-chart
        ancestors
        descendants
        grampsId=${this.grampsId}
        depth=${this.nDesc + 1}
        .data=${this._data}
        gapX="60"
        .strings=${this.strings}
      >
      </grampsjs-tree-chart>
    `
  }
}

window.customElements.define(
  'grampsjs-view-hourglass-chart',
  GrampsjsViewHourglassChart
)
