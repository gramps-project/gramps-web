import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewHourglassChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this.nAnc = 2
    this.nDesc = 2
  }

  _resetLevels() {
    this.nAnc = 1
    this.nDesc = 1
  }

  renderChart() {
    return html`
      <grampsjs-tree-chart
        ancestors
        descendants
        grampsId=${this.grampsId}
        nAnc=${this.nAnc + 1}
        nDesc=${this.nDesc + 1}
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
