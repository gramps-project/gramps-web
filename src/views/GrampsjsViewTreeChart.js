import {html} from 'lit'
import '@material/mwc-dialog'
import '@material/mwc-button'
import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsTreeChart.js'
import '../components/GrampsjsFormNewPerson.js'

export class GrampsjsViewTreeChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this._setAnc = true
    this.defaults.nAnc = 3
    this._addPersonDialogOpen = false
    this._addPersonDialogData = null
    this._newPersonFormDialogOpen = false
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
    this._addPersonDialogOpen = true
    this._addPersonDialogData = data
    this.requestUpdate()
  }

  _closeAddNewPersonDialog() {
    this._addPersonDialogOpen = false
    this._addPersonDialogData = null
    this.requestUpdate()
  }

  _handleAddPerson(relationship) {
    // Close the first dialog and open the new person form dialog
    this.relationship = relationship
    this._addPersonDialogOpen = false
    this._newPersonFormDialogOpen = true
    this.requestUpdate()
  }

  _closeNewPersonFormDialog() {
    this._newPersonFormDialogOpen = false
    this.requestUpdate()
  }

  _handleAddNewPersonRelation(e) {
    const {data} = e.detail
    this._openAddNewPersonDialog(data)
  }

  renderChart() {
    return html`
      <div @add-new-person-relation="${this._handleAddNewPersonRelation}">
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
      </div>
    `
  }

  render() {
    return html`
      ${this.renderChart()}
      <mwc-dialog
        ?open="${this._addPersonDialogOpen}"
        heading="${this._('Add Person with Relation')}"
        @closed="${() => this._closeAddNewPersonDialog()}"
      >
        <mwc-button @click="${() => this._handleAddPerson('father')}">
          Add Father
        </mwc-button>
        <mwc-button @click="${() => this._handleAddPerson('mother')}">
          Add Mother
        </mwc-button>
        <mwc-button @click="${() => this._handleAddPerson('child')}">
          Add Children(s)
        </mwc-button>
      </mwc-dialog>
      <mwc-dialog
        ?open="${this._newPersonFormDialogOpen}"
        heading="${this._('Add Person')}"
        @closed="${() => this._closeNewPersonFormDialog()}"
      >
        <grampsjs-form-new-person
          .appState="${this.appState}"
        ></grampsjs-form-new-person>
      </mwc-dialog>
    `
  }
}

window.customElements.define('grampsjs-view-tree-chart', GrampsjsViewTreeChart)
