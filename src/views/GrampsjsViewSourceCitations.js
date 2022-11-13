import {html, css} from 'lit'

import '@material/mwc-icon-button'

import {GrampsjsViewObjectsDetail} from './GrampsjsViewObjectsDetail.js'
import '../components/GrampsjsSourceCitations.js'

export class GrampsjsViewSourceCitations extends GrampsjsViewObjectsDetail {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
        }
      `,
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    const rules = {
      function: 'or',
      rules: this.grampsIds.map(grampsId => ({
        name: 'HasIdOf',
        values: [grampsId],
      })),
    }
    return `/api/citations/?locale=${
      this.strings?.__lang__ || 'en'
    }&profile=all&extend=all&rules=${encodeURIComponent(JSON.stringify(rules))}`
  }

  renderElements() {
    return html`
      <grampsjs-source-citations
        hasShare
        .data="${this._data}"
        ?edit="${this.edit}"
        .strings="${this.strings}"
      >
      </grampsjs-source-citations>
    `
  }
}

window.customElements.define(
  'grampsjs-view-source-citations',
  GrampsjsViewSourceCitations
)
