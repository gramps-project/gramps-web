import {html} from 'lit'

import '@material/web/select/filled-select'

import '../components/GrampsjsTasks.js'
import '../components/GrampsjsDnaMatches.js'
import '../components/GrampsjsDnaMatch.js'
import '../components/GrampsjsFormNewMatch.js'
import '../components/GrampsjsChromosomeBrowser.js'
import '../components/GrampsjsBreadcrumbs.js'

import {GrampsjsViewDnaBase} from './GrampsjsViewDnaBase.js'

import {personDisplayName} from '../util.js'

export class GrampsjsViewYDna extends GrampsjsViewDnaBase {
  /* Implemented abstract methods */

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return ''
  }

  renderContent() {
    if (this._selectDataLoading || this._dnaDataLoading) {
      return this.renderLoading()
    }
    return html` <pre>${JSON.stringify(this._dnaData.data, null, 2)}</pre> `
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
