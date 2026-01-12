import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {chartNameDisplayFormat} from '../util.js'
import '../components/GrampsjsTreeChart.js'

export class GrampsjsViewTreeChart extends GrampsjsViewTreeChartBase {
  defaultNAnc = 3

  defaultNameDisplayFormat = chartNameDisplayFormat.surnameThenGiven

  constructor() {
    super()
    this.nDesc = 1
    this._setAnc = true
    this.nAnc = this.defaultNAnc
    this.nameDisplayFormat = this.defaultNameDisplayFormat
  }

  _resetLevels() {
    this.nAnc = this.defaultNAnc
    this.nameDisplayFormat = this.defaultNameDisplayFormat
    this.persistAnc()
    this.persistNameDisplayFormat()
  }

  persistAnc() {
    this.appState.updateSettings({treeChartAnc: this.nAnc}, false)
  }

  persistNameDisplayFormat() {
    this.appState.updateSettings(
      {treeChartNameDisplayFormat: this.nameDisplayFormat},
      false
    )
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('appState')) {
      this.nAnc = this.appState?.settings?.treeChartAnc ?? this.defaultNAnc
      this.nameDisplayFormat =
        this.appState?.settings?.treeChartNameDisplayFormat ??
        this.defaultNameDisplayFormat
    }
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
