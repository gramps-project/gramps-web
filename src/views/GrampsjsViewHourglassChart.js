import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {chartNameDisplayFormat} from '../util.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewHourglassChart extends GrampsjsViewTreeChartBase {
  defaultNAnc = 2

  defaultNDesc = 1

  defaultNameDisplayFormat = chartNameDisplayFormat.surnameThenGiven

  constructor() {
    super()
    this._setAnc = true
    this._setDesc = true
    this.nAnc = this.defaultNAnc
    this.nDesc = this.defaultNDesc
    this.nameDisplayFormat = this.defaultNameDisplayFormat
  }

  _resetLevels() {
    this.nAnc = this.defaultNAnc
    this.nDesc = this.defaultNDesc
    this.nameDisplayFormat = this.defaultNameDisplayFormat
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

  willUpdate(changedProperties) {
    if (changedProperties.has('appState')) {
      this.nAnc = this.appState?.settings?.hourglassChartAnc ?? this.defaultNAnc
      this.nDesc =
        this.appState?.settings?.hourglassChartDesc ?? this.defaultNDesc
      this.nameDisplayFormat =
        this.appState?.settings?.hourglassChartNameDisplayFormat ??
        this.defaultNameDisplayFormat
    }
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
