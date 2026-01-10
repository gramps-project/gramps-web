import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {chartNameDisplayFormat} from '../util.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewHourglassChart extends GrampsjsViewTreeChartBase {
  DefaultNAnc = 3

  DefaultNDesc = 2

  DefaultNameDisplayFormat = chartNameDisplayFormat.givenThenSurname

  constructor() {
    super()
    this._setAnc = true
    this._setDesc = true
    this._resetLevels()
  }

  _resetLevels() {
    this.nAnc = this.DefaultNAnc
    this.nDesc = this.DefaultNDesc
    this.nameDisplayFormat = this.DefaultNameDisplayFormat
  }

  renderChart() {
    return html`
      <grampsjs-tree-chart
        ancestors
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
  'grampsjs-view-hourglass-chart',
  GrampsjsViewHourglassChart
)
