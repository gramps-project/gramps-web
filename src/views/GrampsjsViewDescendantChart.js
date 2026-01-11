import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {chartNameDisplayFormat} from '../util.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewDescendantChart extends GrampsjsViewTreeChartBase {
  DefaultNDesc = 1

  DefaultNameDisplayFormat = chartNameDisplayFormat.surnameThenGiven

  constructor() {
    super()
    this.nAnc = 1
    this._setDesc = true
    this.nDesc = this.DefaultNDesc
    this.nameDisplayFormat = this.DefaultNameDisplayFormat
  }

  _resetLevels() {
    this.nDesc = this.DefaultNDesc
    this.nameDisplayFormat = this.DefaultNameDisplayFormat
    this.persistDesc()
    this.persistNameDisplayFormat()
  }

  persistDesc() {
    this.appState.updateSettings({descendantChartDesc: this.nDesc}, false)
  }

  persistNameDisplayFormat() {
    this.appState.updateSettings(
      {descendantChartNameDisplayFormat: this.nameDisplayFormat},
      false
    )
  }

  willUpdate() {
    this.nDesc = this.appState.settings.descendantChartDesc ?? this.DefaultNDesc
    this.nameDisplayFormat =
      this.appState.settings.descendantChartNameDisplayFormat ??
      this.DefaultNameDisplayFormat
  }

  renderControls() {
    return super.renderControls()
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
