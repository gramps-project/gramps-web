import {html, css, LitElement} from 'lit'
import '@material/web/dialog/dialog.js'
import '@material/web/iconbutton/icon-button.js'
import {mdiLinkPlus, mdiPlus} from '@mdi/js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import {linkParent, linkChild, linkSpouse} from '../util/familyLinks.js'
import './GrampsjsFormNewPerson.js'
import './GrampsjsFormNewChild.js'
import './GrampsjsFormPersonRef.js'
import './GrampsjsFormChildRef.js'
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
      _pickerOpen: {type: Boolean},
      _formOpen: {type: Boolean},
      _personData: {type: Object},
      _relationship: {type: String},
      _mode: {type: String},
    }
  }

  constructor() {
    super()
    this._pickerOpen = false
    this._formOpen = false
    this._personData = null
    this._relationship = ''
    this._mode = ''
  }

  open(nodeData) {
    this._personData = nodeData.data?.person ?? null
    this._pickerOpen = true
  }

  _selectRelationship(relationship, mode) {
    this._relationship = relationship
    this._mode = mode
    this._pickerOpen = false
    this._formOpen = true
  }

  async _dispatch(handle, frel, mrel) {
    const personData = this._personData
    let result
    if (this._relationship === 'father' || this._relationship === 'mother') {
      result = await linkParent(
        this.appState,
        personData,
        handle,
        this._relationship
      )
    } else if (this._relationship === 'child') {
      result = await linkChild(this.appState, personData, handle, frel, mrel)
    } else if (this._relationship === 'spouse') {
      result = await linkSpouse(this.appState, personData, handle)
    }
    if (result && 'error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
    }
  }

  async _handleExistingPersonSave(e) {
    const handle = e.detail.data?.ref
    this._formOpen = false
    if (!handle) {
      this._reset()
      return
    }
    await this._dispatch(handle, e.detail.data?.frel, e.detail.data?.mrel)
    this._reset()
  }

  async _handleNewPersonSave(e) {
    const {processedData, frel, mrel} = e.detail.data
    this._formOpen = false
    const createResult = await this.appState.apiPost(
      '/api/objects/',
      processedData,
      {dbChanged: false}
    )
    if ('error' in createResult) {
      fireEvent(this, 'grampsjs:error', {message: createResult.error})
      return
    }
    const handle = processedData.find(o => o._class === 'Person')?.handle
    if (handle) {
      await this._dispatch(handle, frel, mrel)
    }
    this._reset()
  }

  _reset() {
    this._personData = null
    this._relationship = ''
    this._mode = ''
  }

  _cancelForm() {
    this._formOpen = false
    this._pickerOpen = true
    this._relationship = ''
    this._mode = ''
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

  _renderPickerDialog() {
    const primaryFamily = this._personData?.extended?.primary_parent_family
    const hasFather = !!primaryFamily?.father_handle
    const hasMother = !!primaryFamily?.mother_handle
    const hasSpouse = (this._personData?.extended?.family_list ?? []).length > 0

    return html`
      <md-dialog
        ?open="${this._pickerOpen}"
        @cancel="${() => {
          this._pickerOpen = false
          this._reset()
        }}"
      >
        <div slot="headline">${this._('Add Family Member')}</div>
        <div slot="content">
          ${hasFather
            ? ''
            : this._renderRelationRow(this._('Father'), 'father')}
          ${hasMother
            ? ''
            : this._renderRelationRow(this._('Mother'), 'mother')}
          ${this._renderRelationRow(this._('Child'), 'child')}
          ${hasSpouse
            ? ''
            : this._renderRelationRow(this._('Spouse'), 'spouse')}
        </div>
      </md-dialog>
    `
  }

  _renderFormDialog() {
    if (!this._formOpen) {
      return ''
    }

    const isChild = this._relationship === 'child'
    const isNew = this._mode === 'new'

    if (isNew && isChild) {
      return html`
        <grampsjs-form-new-child
          @object:save="${this._handleNewPersonSave}"
          @object:cancel="${this._cancelForm}"
          .appState="${this.appState}"
          dialogTitle="${this._('Add a new person')}"
        ></grampsjs-form-new-child>
      `
    }

    if (!isNew && isChild) {
      return html`
        <grampsjs-form-childref
          @object:save="${this._handleExistingPersonSave}"
          @object:cancel="${this._cancelForm}"
          .appState="${this.appState}"
          dialogTitle="${this._('Select an existing person')}"
        ></grampsjs-form-childref>
      `
    }

    if (isNew) {
      return html`
        <grampsjs-form-new-person
          @object:save="${this._handleNewPersonSave}"
          @object:cancel="${this._cancelForm}"
          .appState="${this.appState}"
          dialogTitle="${this._('Add a new person')}"
        ></grampsjs-form-new-person>
      `
    }

    return html`
      <grampsjs-form-personref
        @object:save="${this._handleExistingPersonSave}"
        @object:cancel="${this._cancelForm}"
        .appState="${this.appState}"
        dialogTitle="${this._('Select an existing person')}"
      ></grampsjs-form-personref>
    `
  }

  render() {
    return html`${this._renderPickerDialog()} ${this._renderFormDialog()}`
  }
}

window.customElements.define(
  'grampsjs-tree-chart-add-person',
  GrampsjsTreeChartAddPerson
)
