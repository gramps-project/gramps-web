import {html} from 'lit'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {fireEvent} from '../util.js'
import '../components/GrampsjsTreeChart.js'
import '../components/GrampsjsFormNewPerson.js'

export class GrampsjsViewTreeChart extends GrampsjsViewTreeChartBase {
  constructor() {
    super()
    this._setAnc = true
    this.defaults.nAnc = 3
    this._addPersonRelationDialogOpen = false
    this._addPersonRelationDialogData = null
    this._newPersonFormDialogOpen = false
    this.relationship = ''
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

  _openAddPersonRelationDialog(data) {
    this._addPersonRelationDialogOpen = true
    this._addPersonRelationDialogData = data
    this.requestUpdate()
  }

  _closeAddPersonRelationDialog() {
    this._addPersonRelationDialogOpen = false
    this.requestUpdate()
  }

  _handleAddNewPersonRelation(e) {
    const {data} = e.detail
    this._openAddPersonRelationDialog(data)
  }

  _handleAddPerson(relationship) {
    this.relationship = relationship
    this._addPersonRelationDialogOpen = false
    this._newPersonFormDialogOpen = true
    this.requestUpdate()
  }

  _closeNewPersonFormDialog() {
    this._newPersonFormDialogOpen = false
    this.requestUpdate()
  }

  _handleCancelDialog() {
    this._closeNewPersonFormDialog()
  }

  async _handleNewParentSave(e) {
    const relatedPerson = this._addPersonRelationDialogData?.parent
    const {processedData} = e.detail.data

    if (
      !relatedPerson?.data ||
      !['father', 'mother', 'child'].includes(this.relationship)
    ) {
      this._closeNewPersonFormDialog()
      return
    }

    const createPerson = await this.appState.apiPost(
      '/api/objects/',
      processedData
    )

    if ('error' in createPerson) {
      fireEvent(this, 'grampsjs:error', {message: createPerson.error})
      return
    }

    e.preventDefault()
    e.stopPropagation()
    this._closeNewPersonFormDialog()
    this._addPersonRelationDialogData = null
    this._fetchData(this.grampsId)
  }

  _handleAddNewPersonPopup() {
    if (!this._newPersonFormDialogOpen) {
      return ''
    }

    return html`
      <grampsjs-form-new-person
        @object:save="${this._handleNewParentSave}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new person')}"
      >
      </grampsjs-form-new-person>
    `
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
      <md-dialog
        ?open="${this._addPersonRelationDialogOpen}"
        @close="${() => this._closeAddPersonRelationDialog()}"
      >
        <div slot="headline">${this._('Add Person with Relation')}</div>
        <div slot="actions">
          <md-text-button @click="${() => this._handleAddPerson('father')}">
            Add Father
          </md-text-button>
          <md-text-button @click="${() => this._handleAddPerson('mother')}">
            Add Mother
          </md-text-button>
          <md-text-button @click="${() => this._handleAddPerson('child')}">
            Add Child
          </md-text-button>
        </div>
      </md-dialog>
      ${this._handleAddNewPersonPopup()}
    `
  }
}

window.customElements.define('grampsjs-view-tree-chart', GrampsjsViewTreeChart)
