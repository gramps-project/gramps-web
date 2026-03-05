import {html} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'

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

  _openAddNewPersonDialog(data) {
    console.log('open add new person dialog', data)
    this.dialogContent = html`
      <grampsjs-add-person-to-tree
        data=${data}
        @object:save="${this._handleSave}"
        @object:cancel="${this._handleCancel}"
      >
      </grampsjs-add-person-to-tree>
    `
  }

  _handleAddNewPersonRelation(e) {
    console.log('handle add new person relation', e)
    const {data} = e.detail
    console.log('handle add new person relation', data)
    this._openAddNewPersonDialog(data)
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
        @add-new-person-relation="${this._handleAddNewPersonRelation}"
      >
      </grampsjs-tree-chart>
    `
  }
}

window.customElements.define('grampsjs-view-tree-chart', GrampsjsViewTreeChart)
