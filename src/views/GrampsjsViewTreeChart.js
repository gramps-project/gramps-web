import {html} from 'lit'
import '@material/mwc-dialog'
import '@material/mwc-button'
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

    // const data = {
    //   relationship: this.relationship,
    //   relatedPersonId: relatedPerson?.data?.person?.gramps_id,
    // }

    const createPerson = await this.appState.apiPost(
      '/api/objects/',
      processedData
    )

    if ('error' in createPerson) {
      fireEvent(this, 'grampsjs:error', {message: createPerson.error})
      return
    }

    // const newPerson = createPerson.data.find(
    //   obj => obj.new?._class === 'Person'
    // )?.new
    // if (!newPerson?.handle) {
    //   fireEvent(this, 'grampsjs:error', {
    //     message: this._('Could not create the new person.'),
    //   })
    //   return
    // }

    // let result = null
    // const parentFamilyHandle =
    //   relatedPerson.extended?.primary_parent_family?.handle

    // if (parentFamilyHandle) {
    //   const family = await this.appState.apiGet(
    //     `/api/families/${parentFamilyHandle}`
    //   )

    //   if ('error' in family) {
    //     fireEvent(this, 'grampsjs:error', {message: family.error})
    //     return
    //   }
    //   result = await this.appState.apiPut(
    //     `/api/families/${parentFamilyHandle}`,
    //     {
    //       ...family.data,
    //       [`${this.relationship}_handle`]: newPerson.handle,
    //     }
    //   )
    // } else {
    //   result = await this.appState.apiPost('/api/families/', {
    //     _class: 'Family',
    //     [`${this.relationship}_handle`]: newPerson.handle,
    //     child_ref_list: [{_class: 'ChildRef', ref: relatedPerson.handle}],
    //   })
    // }

    // if ('error' in result) {
    //   fireEvent(this, 'grampsjs:error', {message: result.error})
    //   return
    // }

    e.preventDefault()
    e.stopPropagation()
    this._closeNewPersonFormDialog()
    this._addPersonRelationDialogData = null
    // this._fetchData(this.grampsId)
    // fireEvent(this, 'grampsjs:db-changed', data)
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
      <mwc-dialog
        ?open="${this._addPersonRelationDialogOpen}"
        heading="${this._('Add Person with Relation')}"
        @closed="${() => this._closeAddPersonRelationDialog()}"
      >
        <mwc-button
          icon="add"
          @click="${() => this._handleAddPerson('father')}"
        >
          Add Father
        </mwc-button>
        <mwc-button
          icon="add"
          @click="${() => this._handleAddPerson('mother')}"
        >
          Add Mother
        </mwc-button>
        <mwc-button icon="add" @click="${() => this._handleAddPerson('child')}">
          Add Child
        </mwc-button>
      </mwc-dialog>
      ${this._handleAddNewPersonPopup()}
    `
  }
}

window.customElements.define('grampsjs-view-tree-chart', GrampsjsViewTreeChart)
