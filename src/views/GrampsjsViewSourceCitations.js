import {html, css} from 'lit'

import '@material/mwc-icon-button'

import {GrampsjsViewObjectsDetail} from './GrampsjsViewObjectsDetail.js'
import '../components/GrampsjsSourceCitations.js'
import '../components/GrampsjsFormNewCitation.js'
import {fireEvent, makeHandle} from '../util.js'

export class GrampsjsViewSourceCitations extends GrampsjsViewObjectsDetail {
  static get styles () {
    return [
      super.styles,
      css`
      :host {
        margin: 0;
      }
      `
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl () {
    const rules = {
      function: 'or',
      rules: this.grampsIds.map(grampsId => {
        return {
          name: 'HasIdOf',
          values: [grampsId]
        }
      }

      )
    }
    return `/api/citations/?locale=${this.strings?.__lang__ || 'en'}&profile=all&extend=all&rules=${encodeURIComponent(JSON.stringify(rules))}`
  }

  renderElements () {
    return html`
      <grampsjs-source-citations
        .data="${this._data}"
        ?edit="${this.edit}"
        .strings="${this.strings}">
      </grampsjs-source-citations>
      `
  }

  renderEdit () {
    return html`
      <div>
        <mwc-icon-button
          class="edit large"
          icon="add_circle"
          @click="${this._handleAddClick}"
        ></mwc-icon-button>
        ${this.dialogContent}
      </div>
      `
  }

  _handleAddClick () {
    this.dialogContent = html`
      <grampsjs-form-new-citation
        new
        @object:save="${this._handleCitSave}"
        @object:cancel="${this._handleCitCancel}"
        .strings="${this.strings}"
      >
      </grampsjs-form-new-citation>
      `
  }

  _handleCitSave (e) {
    const handle = makeHandle()
    fireEvent(this, 'edit:action', {action: 'addCitation', data: {handle, ...e.detail.data}})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleCitCancel () {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-view-source-citations', GrampsjsViewSourceCitations)
