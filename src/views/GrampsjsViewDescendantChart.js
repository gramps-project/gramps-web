import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'
import '../components/GrampsjsTreeChartAddPerson.js'

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
      <div @add-new-person-relation="${this._handleAddPersonRelation}">
        <grampsjs-tree-chart
          descendants
          grampsId=${this.grampsId}
          nAnc=${this.nAnc + 1}
          nDesc=${this.nDesc + 1}
          nameDisplayFormat=${this.nameDisplayFormat}
          ?canEdit="${this._editMode}"
          .data=${this._data}
          gapX="60"
          .appState="${this.appState}"
        >
        </grampsjs-tree-chart>
      </div>
    `
  }

  renderContent() {
    return html`
      ${super.renderContent()}
      <grampsjs-tree-chart-add-person
        .appState="${this.appState}"
      ></grampsjs-tree-chart-add-person>
    `
  }
}

window.customElements.define(
  'grampsjs-view-descendant-chart',
  GrampsjsViewDescendantChart
)
