import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {chartNameDisplayFormat} from '../util.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewHourglassChart extends GrampsjsViewTreeChartBase {
  DefaultNAnc = 2

  DefaultNDesc = 1

  DefaultNameDisplayFormat = chartNameDisplayFormat.surnameThenGiven

  constructor() {
    super()
    this._setAnc = true
    this._setDesc = true
    this.nAnc = this.DefaultNAnc
    this.nDesc = this.DefaultNDesc
    this.nameDisplayFormat = this.DefaultNameDisplayFormat
  }

  _resetLevels() {
    this.nAnc = this.DefaultNAnc
    this.nDesc = this.DefaultNDesc
    this.nameDisplayFormat = this.DefaultNameDisplayFormat
    this.persistAnc()
    this.persistDesc()
    this.persistNameDisplayFormat()
  }

  persistAnc() {
    this.appState.updateSettings({hourglassChartAnc: this.nAnc}, false)
  }

  persistDesc() {
    this.appState.updateSettings({hourglassChartDesc: this.nDesc}, false)
  }

  persistNameDisplayFormat() {
    this.appState.updateSettings(
      {hourglassChartNameDisplayFormat: this.nameDisplayFormat},
      false
    )
  }

  willUpdate() {
    this.nAnc = this.appState.settings.hourglassChartAnc ?? this.DefaultNAnc
    this.nDesc = this.appState.settings.hourglassChartDesc ?? this.DefaultNDesc
    this.nameDisplayFormat =
      this.appState.settings.hourglassChartNameDisplayFormat ??
      this.DefaultNameDisplayFormat
  }

  renderControls() {
    return super.renderControls()
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
