import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {chartNameDisplayFormat} from '../util.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewTreeChart extends GrampsjsViewTreeChartBase {
  DefaultNAnc = 4

  DefaultNameDisplayFormat = chartNameDisplayFormat.givenThenSurname

  constructor() {
    super()
    this.nDesc = 1
    this._setAnc = true
    this._resetLevels()
  }

  _resetLevels() {
    this.nAnc = this.DefaultNAnc
    this.nameDisplayFormat = this.DefaultNameDisplayFormat
  }

  renderChart() {
    return html`
      <grampsjs-tree-chart
        ancestors
        grampsId=${this.grampsId}
        nAnc=${this.nAnc + 1}
        nDesc=${this.nDesc + 1}
        nameDisplayFormat=${this.nameDisplayFormat}
        .data=${this._data}
        .appState="${this.appState}"
      >
      </grampsjs-tree-chart>
    `
  }
}

window.customElements.define('grampsjs-view-tree-chart', GrampsjsViewTreeChart)
