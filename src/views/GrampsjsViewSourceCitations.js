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
    const gql = (this.grampsIds || []).map(h => `handle="${h}"`).join(' or ')

    return `/api/citations/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&extend=all&gql=${encodeURIComponent(gql)}`
  }

  renderElements() {
    return html`
      <grampsjs-source-citations
        hasShare
        .data="${this._data}"
        ?edit="${this.edit}"
        .appState="${this.appState}"
      >
      </grampsjs-source-citations>
    `
  }

  renderEdit() {
    if (this._data.length === 0) {
      return this.renderElements()
    }
    return ''
  }
}

window.customElements.define(
  'grampsjs-view-source-citations',
  GrampsjsViewSourceCitations
)
