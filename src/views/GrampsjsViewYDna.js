import {html, css} from 'lit'

import '@material/web/select/filled-select'
import {mdiEye, mdiPencil} from '@mdi/js'

import '../components/GrampsjsYtreeLineage.js'
import '../components/GrampsjsFormNewYDna.js'
import '../components/GrampsjsFormEditYDna.js'
import {GrampsjsViewDnaBase} from './GrampsjsViewDnaBase.js'
import {fireEvent, personDisplayName} from '../util.js'

export class GrampsjsViewYDna extends GrampsjsViewDnaBase {
  /* Implemented abstract methods */

  static get styles() {
    return [
      super.styles,
      css`
        strong {
          font-weight: 450;
        }

        md-outlined-text-field {
          width: 100%;
          resize: both;
          min-width: 300px;
        }
      `,
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return ''
  }

  renderFab() {
    return html`<mwc-fab icon="add" @click="${this._handleClickAdd}"></mwc-fab>`
  }

  get _leafCladeName() {
    return this._dnaData?.data?.clade_lineage?.at(-1)?.name
  }

  renderContent() {
    if (this._selectDataLoading || this._dnaDataLoading) {
      return this.renderLoading()
    }
    return html`
      ${this._leafCladeName
        ? html`
            <h3>${this._('Haplogroup')}</h3>
            <p>
              ${this._(
                'Most specific position on the human Y chromosome tree'
              )}:
              <strong>
                <a
                  href="https://yfull.com/tree/${this._leafCladeName}"
                  target="_blank"
                  >${this._leafCladeName}</a
                >
              </strong>
              <br />
              (<a href="https://yfull.com/" target="_blank">YFull</a>${this
                ._dnaData?.data?.tree_version
                ? html` v${this._dnaData?.data?.tree_version}`
                : ''})
            </p>
          `
        : ''}
      <h3>${this._('Paternal Lineage')}</h3>
      <grampsjs-ytree-lineage
        .appState="${this.appState}"
        .data="${this._dnaData?.data?.clade_lineage ?? []}"
        .person="${this._data.find(p => p.gramps_id === this.grampsId) || {}}"
      ></grampsjs-ytree-lineage>
      <h3>${this._('Raw SNP data')}</h3>

      <p>
        <md-text-button @click="${this._showRawSnpData}">
          <grampsjs-icon
            .path="${mdiEye}"
            slot="icon"
            color="var(--md-sys-color-primary)"
          ></grampsjs-icon>
          ${this._('View')}
        </md-text-button>
        ${this.appState.permissions.canEdit
          ? html`
              <md-text-button @click="${this._editRawSnpData}">
                <grampsjs-icon
                  .path="${mdiPencil}"
                  slot="icon"
                  color="var(--md-sys-color-primary)"
                ></grampsjs-icon>
                ${this._('Edit')}
              </md-text-button>
            `
          : ''}
      </p>
    `
  }

  _showRawSnpData() {
    this.dialogContent = html`
      <md-dialog open @cancel="${this._handleCancelDialog}">
        <div slot="headline">${this._('Raw SNP data')}</div>
        <div slot="content">${this._dnaData?.data?.raw_data}</div>
        <div slot="actions">
          <md-text-button @click="${this._handleCancelDialog}"
            >${this._('Close')}</md-text-button
          >
          <md-text-button @click="${this._editRawSnpData}"
            >${this._('Edit')}</md-text-button
          >
        </div>
      </md-dialog>
    `
  }

  _editRawSnpData() {
    const currentPerson = this._data.find(p => p.gramps_id === this.grampsId)
    if (!currentPerson) return

    this.dialogContent = html`
      <grampsjs-form-edit-ydna
        .appState="${this.appState}"
        .data="${{raw_data: this._dnaData?.data?.raw_data || ''}}"
        .personHandle="${currentPerson.handle}"
        @object:save="${this._handleClickSaveYDna}"
        @dialog:cancel="${this._handleCancelDialog}"
      ></grampsjs-form-edit-ydna>
    `
  }

  _handleCancelDialog() {
    this.dialogContent = ''
  }

  _renderNoData() {
    return html`<div>${this._('No Y-DNA data found.')}</div>`
  }

  // eslint-disable-next-line class-methods-use-this
  get page() {
    return 'ydna'
  }

  _renderSelect() {
    if (this._selectDataLoading) {
      return html`<md-filled-select disabled id="placeholder"
        >${this._('Loading items...')}</md-filled-select
      >`
    }
    return html`
      <md-filled-select @change="${this._handleSelectChange}">
        ${this._data.map(
          person => html`
            <md-select-option
              value="${person.gramps_id}"
              ?selected="${person.gramps_id === this.grampsId}"
              >${personDisplayName(person)}</md-select-option
            >
          `
        )}
      </md-filled-select>
    `
  }

  get _selectUrl() {
    const rules = {
      rules: [
        {
          name: 'HasAttribute',
          values: ['Y-DNA', '*'],
          regex: true,
        },
      ],
    }
    const uri = `/api/people/?rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&locale=${
      this.appState.i18n.lang || 'en'
    }&sort=name&extend=event_ref_list`
    return uri
  }

  _dnaUrl() {
    const uri = `/api/people/${this.selectedHandle}/ydna?locale=${
      this.appState.i18n.lang || 'en'
    }&raw=1`
    return uri
  }

  _shouldLoadDnaData() {
    return this._selectDataHasGrampsId() && !this._dnaDataLoading
  }

  _handleClickAdd() {
    this.dialogContent = html`
      <grampsjs-form-new-ydna
        .appState="${this.appState}"
        @object:save="${this._handleClickSaveYDna}"
        @object:cancel="${this._handleCancelDialog}"
        dialogTitle="${this._('Add Y-DNA Data')}"
      >
      </grampsjs-form-new-ydna>
    `
  }

  async _handleClickSaveYDna(e) {
    const personHandle = e?.detail?.data?.person_handle
    const rawSnpData = e?.detail?.data?.raw_data
    await this._saveYdnaData(personHandle, rawSnpData)
    this.dialogContent = ''
  }

  async _saveYdnaData(personHandle, rawData) {
    if (!rawData || !personHandle) return

    // Get the full person data from the API
    const res = await this.appState.apiGet(`/api/people/${personHandle}`)
    if ('error' in res) {
      fireEvent(this, 'grampsjs:error', {message: res.error})
      return
    }

    const personData = res.data ?? {}

    // Update the Y-DNA attribute
    const existingAttrs = personData.attribute_list || []
    const ydnaAttrIndex = existingAttrs.findIndex(
      attr =>
        attr.type === 'Y-DNA' || (attr.type && attr.type.string === 'Y-DNA')
    )

    const ydnaAttribute = {
      type: 'Y-DNA',
      value: rawData,
    }

    if (ydnaAttrIndex >= 0) {
      // Update existing attribute
      existingAttrs[ydnaAttrIndex] = {
        ...existingAttrs[ydnaAttrIndex],
        ...ydnaAttribute,
      }
    } else {
      // Add new attribute
      existingAttrs.push(ydnaAttribute)
    }

    // Update the person with the new/updated attribute
    const updatedPersonData = {
      ...personData,
      _class: 'Person',
      attribute_list: existingAttrs,
    }

    const result = await this.appState.apiPut(
      `/api/people/${personHandle}`,
      updatedPersonData
    )
    if ('error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
    }
    // if we just created Y-DNA for a different person, navigate to that person
    const newGrampsId = result?.data?.[0]?.new?.gramps_id
    if (newGrampsId && newGrampsId !== this.grampsId) {
      fireEvent(this, 'nav', {
        path: `ydna/${newGrampsId}`,
      })
    }
  }
}

window.customElements.define('grampsjs-view-ydna', GrampsjsViewYDna)
