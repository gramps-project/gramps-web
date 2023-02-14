import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsFanChart.js'

export class GrampsjsViewFanChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this.nAnc = 4
    this.nDesc = 1
    this._setDesc = false
  }

  _resetLevels() {
    this.nAnc = 4
  }

  renderChart() {
    return html`
      <grampsjs-fan-chart
        grampsId=${this.grampsId}
        depth=${this.nAnc + 1}
        .data=${this._data}
        .strings=${this.strings}
      >
      </grampsjs-fan-chart>
    `
  }
}

window.customElements.define('grampsjs-view-fan-chart', GrampsjsViewFanChart)
