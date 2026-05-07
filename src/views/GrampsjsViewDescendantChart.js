import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewDescendantChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this._setDesc = true
  }

  get nDesc() {
    return this.appState?.settings?.descendantChartDesc ?? this.defaults.nDesc
  }

  set nDesc(value) {
    this.appState.updateSettings({descendantChartDesc: value}, false)
  }

  get nameDisplayFormat() {
    return (
      this.appState?.settings?.descendantChartNameDisplayFormat ??
      this.defaults.nameDisplayFormat
    )
  }

  set nameDisplayFormat(value) {
    this.appState.updateSettings(
      {descendantChartNameDisplayFormat: value},
      false
    )
  }

  _resetLevels() {
    this.nDesc = this.defaults.nDesc
    this.nameDisplayFormat = this.defaults.nameDisplayFormat
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
