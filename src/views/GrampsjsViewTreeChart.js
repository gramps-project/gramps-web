import {html} from 'lit'
import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'
import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {fireEvent} from '../util.js'
import '../components/GrampsjsTreeChart.js'
import '../components/GrampsjsFormNewPerson.js'

export class GrampsjsViewTreeChart extends GrampsjsViewTreeChartBase {
  static get properties() {
    return {
      _addPersonRelationDialogOpen: {type: Boolean},
      _addPersonRelationDialogData: {type: Object},
      _newPersonFormDialogOpen: {type: Boolean},
      relationship: {type: String},
    }
  }

  constructor() {
    super()
    this._setAnc = true
    this.defaults.nAnc = 3
    this._addPersonRelationDialogOpen = false
    this._addPersonRelationDialogData = {}
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

  _selectRelationship(relationship) {
    this.relationship = relationship
    this._addPersonRelationDialogOpen = false
    this._newPersonFormDialogOpen = true
  }

  async _handleNewPersonSave(e) {
    const {processedData} = e.detail.data

    if (!['father', 'mother', 'child'].includes(this.relationship)) {
      this._newPersonFormDialogOpen = false
      return
    }

    // TODO: Update the family relationship for the selected relation after
    // creating the new person. The current implementation only creates the
    // person record and still needs the family linkage logic.
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
    this._newPersonFormDialogOpen = false
    this._addPersonRelationDialogData = {}
    this.relationship = ''
    this._fetchData(this.grampsId)
  }

  renderAddPersonRelationDialog() {
    return html`
      <md-dialog
        ?open="${this._addPersonRelationDialogOpen}"
        @close="${() => {
          this._addPersonRelationDialogOpen = false
          this._addPersonRelationDialogData = {}
        }}"
      >
        <div slot="headline">${this._('Relationship')}</div>
        <md-list slot="content">
          <md-list-item
            type="button"
            @click="${() => this._selectRelationship('father')}"
          >
            ${this._('Father')}
          </md-list-item>
          <md-list-item
            type="button"
            @click="${() => this._selectRelationship('mother')}"
          >
            ${this._('Mother')}
          </md-list-item>
          <md-list-item
            type="button"
            @click="${() => this._selectRelationship('child')}"
          >
            ${this._('Child')}
          </md-list-item>
        </md-list>
      </md-dialog>
    `
  }

  _renderNewPersonDialog() {
    if (!this._newPersonFormDialogOpen) {
      return ''
    }

    return html`
      <grampsjs-form-new-person
        @object:save="${this._handleNewPersonSave}"
        @object:cancel="${() => {
          this._newPersonFormDialogOpen = false
          this.relationship = ''
        }}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new person')}"
      >
      </grampsjs-form-new-person>
    `
  }

  renderChart() {
    return html`
      <div
        @add-new-person-relation="${e => {
          this._addPersonRelationDialogOpen = true
          this._addPersonRelationDialogData = e.detail.data
        }}"
      >
        <grampsjs-tree-chart
          ancestors
          grampsId=${this.grampsId}
          nAnc=${this.nAnc + 1}
          nDesc=${this.nDesc + 1}
          nameDisplayFormat=${this.nameDisplayFormat}
          ?canEdit="${this.appState.permissions.canEdit}"
          .data=${this._data}
          .appState="${this.appState}"
        >
        </grampsjs-tree-chart>
      </div>
    `
  }

  renderContent() {
    return html`
      ${super.renderContent()} ${this.renderAddPersonRelationDialog()}
      ${this._renderNewPersonDialog()}
    `
  }
}

window.customElements.define('grampsjs-view-tree-chart', GrampsjsViewTreeChart)
