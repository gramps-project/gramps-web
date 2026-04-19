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

  // Link an existing or newly-created handle as father/mother of the child
  // person shown as the D3 parent of the clicked node.
  async _linkParent(parentHandle) {
    const childPerson = this._addPersonRelationDialogData?.parent?.data?.person
    const parentFamily = childPerson?.extended?.primary_parent_family

    if (parentFamily?.handle) {
      // Family already exists — update the appropriate parent slot.
      const {extended, profile, backlinks, formatted, ...familyClean} =
        parentFamily
      const result = await this.appState.apiPut(
        `/api/families/${parentFamily.handle}`,
        {
          _class: 'Family',
          ...familyClean,
          [`${this._relationship}_handle`]: parentHandle,
        }
      )
      if ('error' in result) {
        fireEvent(this, 'grampsjs:error', {message: result.error})
      }
    } else {
      // No family yet — create one with the child already linked.
      const childRefList = childPerson
        ? [{_class: 'ChildRef', ref: childPerson.handle}]
        : []
      const result = await this.appState.apiPost('/api/families/', {
        _class: 'Family',
        [`${this._relationship}_handle`]: parentHandle,
        child_ref_list: childRefList,
      })
      if ('error' in result) {
        fireEvent(this, 'grampsjs:error', {message: result.error})
      }
    }
  }

  // Link an existing or newly-created handle as a child of the clicked person.
  // A new family is created; the clicked person is placed as father or mother
  // based on the gender stored in the relationship selection.
  async _linkChild(childHandle) {
    const parentPerson = this._addPersonRelationDialogData?.data?.person
    if (!parentPerson?.handle) {
      return
    }
    // Determine whether the parent goes in the father or mother slot.
    // gender: 1 = male (father), 0 = female (mother), 2 = unknown → father slot.
    const parentSlot =
      parentPerson.gender === 0 ? 'mother_handle' : 'father_handle'
    const result = await this.appState.apiPost('/api/families/', {
      _class: 'Family',
      [parentSlot]: parentPerson.handle,
      child_ref_list: [{_class: 'ChildRef', ref: childHandle}],
    })
    if ('error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
    }
  }

  async _handleExistingPersonSave(e) {
    const selectedHandle = e.detail.data?.ref
    this._personRefFormDialogOpen = false
    if (!selectedHandle) {
      this._reset()
      return
    }

    if (['father', 'mother'].includes(this._relationship)) {
      await this._linkParent(selectedHandle)
    } else if (['son', 'daughter'].includes(this._relationship)) {
      await this._linkChild(selectedHandle)
    }

    this._reset()
  }

  async _handleNewPersonSave(e) {
    const {processedData} = e.detail.data

    if (!['father', 'mother', 'son', 'daughter'].includes(this._relationship)) {
      this._newPersonFormDialogOpen = false
      return
    }

    const createResult = await this.appState.apiPost(
      '/api/objects/',
      processedData
    )

    if ('error' in createResult) {
      fireEvent(this, 'grampsjs:error', {message: createResult.error})
      return
    }

    // Extract the handle of the newly created person.
    const newPersonHandle = processedData
      .filter(obj => obj._class === 'Person')
      .map(obj => obj.handle)[0]

    if (newPersonHandle) {
      if (['father', 'mother'].includes(this._relationship)) {
        await this._linkParent(newPersonHandle)
      } else if (['son', 'daughter'].includes(this._relationship)) {
        await this._linkChild(newPersonHandle)
      }
    }

    e.preventDefault()
    e.stopPropagation()
    this._newPersonFormDialogOpen = false
    this._reset()
  }

  _reset() {
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
    const parentFamily =
      this._addPersonRelationDialogData?.parent?.data?.person?.extended
        ?.primary_parent_family
    const hasFather = !!parentFamily?.father_handle
    const hasMother = !!parentFamily?.mother_handle
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
          ${hasFather
            ? ''
            : this._renderRelationRow(this._('Father'), 'father')}
          ${hasMother
            ? ''
            : this._renderRelationRow(this._('Mother'), 'mother')}
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
