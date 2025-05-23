import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewDescendantChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this.nAnc = 1
    this.nDesc = 1
    this._setDesc = true
  }

  _resetLevels() {
    this.nDesc = 1
  }

  renderChart() {
    return html`
      <grampsjs-tree-chart
        descendants
        grampsId=${this.grampsId}
        nAnc=${this.nAnc + 1}
        nDesc=${this.nDesc + 1}
        nameDisplayFormat=${this.nameDisplayFormat}
        .data=${this._data}
        gapX="60"
        .appState="${this.appState}"
      >
      </grampsjs-tree-chart>
    `
  }
}

window.customElements.define(
  'grampsjs-view-descendant-chart',
  GrampsjsViewDescendantChart
)
