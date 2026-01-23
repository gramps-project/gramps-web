import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewHourglassChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this._setAnc = true
    this._setDesc = true
    this.defaults.nAnc = 2
  }

  get nAnc() {
    return this.appState?.settings?.hourglassChartAnc ?? this.defaults.nAnc
  }

  set nAnc(value) {
    this.appState.updateSettings({hourglassChartAnc: value}, false)
  }

  get nDesc() {
    return this.appState?.settings?.hourglassChartDesc ?? this.defaults.nDesc
  }

  set nDesc(value) {
    this.appState.updateSettings({hourglassChartDesc: value}, false)
  }

  get nameDisplayFormat() {
    return (
      this.appState?.settings?.hourglassChartNameDisplayFormat ??
      this.defaults.nameDisplayFormat
    )
  }

  set nameDisplayFormat(value) {
    this.appState.updateSettings(
      {hourglassChartNameDisplayFormat: value},
      false
    )
  }

  _resetLevels() {
    this.nAnc = this.defaults.nAnc
    this.nDesc = this.defaults.nDesc
    this.nameDisplayFormat = this.defaults.nameDisplayFormat
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
