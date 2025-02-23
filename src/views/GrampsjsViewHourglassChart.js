import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewHourglassChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this.nAnc = 2
    this.nDesc = 1
    this._setAnc = true
    this._setDesc = true
  }

  _resetLevels() {
    this.nAnc = 2
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
        .appState="${this.appState}"
      >
      </grampsjs-tree-chart>
    `
  }
}

window.customElements.define(
  'grampsjs-view-hourglass-chart',
  GrampsjsViewHourglassChart
)
