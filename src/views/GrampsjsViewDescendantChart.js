import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {chartNameDisplayFormat} from '../util.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewDescendantChart extends GrampsjsViewTreeChartBase {
  DefaultNDesc = 2

  DefaultNameDisplayFormat = chartNameDisplayFormat.givenThenSurname

  constructor() {
    super()
    this.nAnc = 1
    this._setDesc = true
    this._resetLevels()
  }

  _resetLevels() {
    this.nDesc = this.DefaultNDesc
    this.nameDisplayFormat = this.DefaultNameDisplayFormat
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
