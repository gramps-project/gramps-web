import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'
import {mdiLinkPlus, mdiPlus} from '@mdi/js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import './GrampsjsFormNewPerson.js'
import './GrampsjsFormPersonRef.js'
import './GrampsjsIcon.js'

export class GrampsjsTreeChartAddPerson extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return css`
      .relation-row {
        display: flex;
        align-items: center;
        padding: 4px 0;
      }
      .relation-row span {
        flex: 1;
      }
    `
  }

  static get properties() {
    return {
      _addPersonRelationDialogOpen: {type: Boolean},
      _addPersonRelationDialogData: {type: Object},
      _newPersonFormDialogOpen: {type: Boolean},
      _personRefFormDialogOpen: {type: Boolean},
      _relationship: {type: String},
    }
  }

  constructor() {
    super()
    this._addPersonRelationDialogOpen = false
    this._addPersonRelationDialogData = {}
    this._newPersonFormDialogOpen = false
    this._personRefFormDialogOpen = false
    this._relationship = ''
  }

  open(nodeData) {
    this._addPersonRelationDialogData = nodeData
    this._addPersonRelationDialogOpen = true
  }

  _selectRelationship(relationship, mode) {
    this._relationship = relationship
    this._addPersonRelationDialogOpen = false
    if (mode === 'link') {
      this._personRefFormDialogOpen = true
    } else {
      this._newPersonFormDialogOpen = true
    }
  }

  async _handleExistingPersonSave(e) {
    // TODO: Implement family linkage logic for linking an existing person
    // as father, mother, or child. The handle is available via e.detail.data.ref
    this._personRefFormDialogOpen = false
    this._addPersonRelationDialogData = {}
    this._relationship = ''
  }

  async _handleNewPersonSave(e) {
    const {processedData} = e.detail.data

    if (!['father', 'mother', 'son', 'daughter'].includes(this._relationship)) {
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
    this._relationship = ''
  }

  _renderRelationRow(label, relationship) {
    return html`
      <div class="relation-row">
        <span>${label}</span>
        <md-icon-button
          @click="${() => this._selectRelationship(relationship, 'link')}"
        >
          <grampsjs-icon
            path="${mdiLinkPlus}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <md-icon-button
          @click="${() => this._selectRelationship(relationship, 'new')}"
        >
          <grampsjs-icon
            path="${mdiPlus}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
      </div>
    `
  }

  _renderRelationDialog() {
    return html`
      <md-dialog
        ?open="${this._addPersonRelationDialogOpen}"
        @cancel="${() => {
          this._addPersonRelationDialogOpen = false
          this._addPersonRelationDialogData = {}
        }}"
      >
        <div slot="headline">${this._('Add Family Member')}</div>
        <div slot="content">
          ${this._renderRelationRow(this._('Father'), 'father')}
          ${this._renderRelationRow(this._('Mother'), 'mother')}
          ${this._renderRelationRow(this._('Son'), 'son')}
          ${this._renderRelationRow(this._('Daughter'), 'daughter')}
        </div>
      </md-dialog>
    `
  }

  _renderPersonRefDialog() {
    if (!this._personRefFormDialogOpen) {
      return ''
    }

    return html`
      <grampsjs-form-personref
        @object:save="${this._handleExistingPersonSave}"
        @object:cancel="${() => {
          this._personRefFormDialogOpen = false
          this._addPersonRelationDialogOpen = true
          this._relationship = ''
        }}"
        .appState="${this.appState}"
        dialogTitle="${this._('Select an existing person')}"
      >
      </grampsjs-form-personref>
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
          this._addPersonRelationDialogOpen = true
          this._relationship = ''
        }}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new person')}"
      >
      </grampsjs-form-new-person>
    `
  }

  render() {
    return html`
      ${this._renderRelationDialog()} ${this._renderPersonRefDialog()}
      ${this._renderNewPersonDialog()}
    `
  }
}

window.customElements.define(
  'grampsjs-tree-chart-add-person',
  GrampsjsTreeChartAddPerson
)
