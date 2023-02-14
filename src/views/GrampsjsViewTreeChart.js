import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewTreeChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this.nAnc = 3
    this.nDesc = 1
    this._setDesc = false
  }

  _resetLevels() {
    this.nAnc = 3
  }

  renderChart() {
    return html`
      <grampsjs-tree-chart
        grampsId=${this.grampsId}
        depth=${this.nAnc + 1}
        .data=${this._data}
        .strings=${this.strings}
      >
      </grampsjs-tree-chart>
    `
  }
}

window.customElements.define('grampsjs-view-tree-chart', GrampsjsViewTreeChart)
