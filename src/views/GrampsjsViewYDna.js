import {html, css} from 'lit'

import '@material/web/select/filled-select'

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
    return html` ${this._leafCladeName
        ? html`
            <p>
              Most specific position on the
              <a href="https://yfull.com/" target="_blank">YFull</a>
              ${this._dnaData?.data?.tree_version
                ? html`v${this._dnaData?.data?.tree_version}`
                : ''}
              Y tree:
              <strong>
                <a
                  href="https://yfull.com/tree/${this._leafCladeName}"
                  target="_blank"
                  >${this._leafCladeName}</a
                >
              </strong>
            </p>
          `
        : ''}
      <h3>Direct male ancestors</h3>
      <grampsjs-ytree-lineage
        .appState="${this.appState}"
        .data="${this._dnaData?.data?.clade_lineage ?? []}"
      ></grampsjs-ytree-lineage>`
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
    )}&locale=${this.appState.i18n.lang || 'en'}&sort=name`
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
