import {html, css} from 'lit'

import '@material/web/select/filled-select'

import {mdiOpenInNew, mdiPencil} from '@mdi/js'

import '../components/GrampsjsYtreeLineage.js'

import {GrampsjsViewDnaBase} from './GrampsjsViewDnaBase.js'

import {personDisplayName} from '../util.js'

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
            .path="${mdiOpenInNew}"
            slot="icon"
            color="var(--md-sys-color-primary)"
          ></grampsjs-icon>
          Show
        </md-text-button>
        ${this.appState.permissions.canEdit
          ? html`
              <md-text-button @click="${this._editRawSnpData}">
                <grampsjs-icon
                  .path="${mdiPencil}"
                  slot="icon"
                  color="var(--md-sys-color-primary)"
                ></grampsjs-icon>
                Edit
              </md-text-button>
            `
          : ''}
      </p>
    `
  }

  _showRawSnpData() {
    this.dialogContent = html`
      XXX
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
    this.dialogContent = html`
      <md-dialog open @cancel="${this._handleCancelDialog}">
        <div slot="headline">${this._('Edit Y-SNP data')}</div>
        <div slot="content">
          <md-outlined-text-field
            type="textarea"
            value="${this._dnaData?.data?.raw_data}"
            rows="5"
          ></md-outlined-text-field>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._handleCancelDialog}"
            >${this._('Close')}</md-text-button
          >
          <md-text-button @click="${this._saveEditedRawSnpData}"
            >${this._('Save')}</md-text-button
          >
        </div>
      </md-dialog>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _saveEditedRawSnpData() {}

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
}

window.customElements.define('grampsjs-view-ydna', GrampsjsViewYDna)
