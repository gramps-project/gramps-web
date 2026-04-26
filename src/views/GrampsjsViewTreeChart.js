import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'
import '../components/GrampsjsTreeChartAddPerson.js'

export class GrampsjsViewTreeChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this._setAnc = true
    this.defaults.nAnc = 3
  }

  get nAnc() {
    return this.appState?.settings?.treeChartAnc ?? this.defaults.nAnc
  }

  set nAnc(value) {
    this.appState.updateSettings({treeChartAnc: value}, false)
  }

  get nameDisplayFormat() {
    return (
      this.appState?.settings?.treeChartNameDisplayFormat ??
      this.defaults.nameDisplayFormat
    )
  }

  set nameDisplayFormat(value) {
    this.appState.updateSettings({treeChartNameDisplayFormat: value}, false)
  }

  _resetLevels() {
    this.nAnc = this.defaults.nAnc
    this.nameDisplayFormat = this.defaults.nameDisplayFormat
  }

  _handleAddPersonRelation(e) {
    const personData = this._data.find(p => p.handle === e.detail.handle)
    if (!personData) {
      return
    }
    const addPersonEl = this.renderRoot.querySelector(
      'grampsjs-tree-chart-add-person'
    )
    if (addPersonEl) {
      addPersonEl.open(personData)
    }
  }

  renderChart() {
    return html`
      <div @add-new-person-relation="${this._handleAddPersonRelation}">
        <grampsjs-tree-chart
          ancestors
          grampsId=${this.grampsId}
          nAnc=${this.nAnc + 1}
          nDesc=${this.nDesc + 1}
          nameDisplayFormat=${this.nameDisplayFormat}
          ?canEdit="${this._editMode}"
          .data=${this._data}
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

window.customElements.define('grampsjs-view-tree-chart', GrampsjsViewTreeChart)
