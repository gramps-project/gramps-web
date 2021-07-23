import {html, css} from 'lit'

import {GrampsjsViewObjectsDetail} from './GrampsjsViewObjectsDetail.js'
import '../components/GrampsjsNoteContent.js'

export class GrampsjsViewObjectNotes extends GrampsjsViewObjectsDetail {

  static get styles() {
    return [
      super.styles,
      css`
      :host {
        margin: 0;
      }

      mwc-button {
        margin-top: 1em;
        margin-bottom: 2em;
      }
      `
    ]
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    if (this.grampsIds.length === 0) {
      return ''
    }
    const rules = {
      function: 'or',
      rules: this.grampsIds.map(grampsId =>({
        name: 'HasIdOf',
        values: [grampsId]
      })
      )
    }
    const options = {
      link_format: '/{obj_class}/{gramps_id}'
    }
    return `/api/notes/?locale=${this.strings?.__lang__ || 'en'}&profile=all&extend=all&formats=html&rules=${encodeURIComponent(JSON.stringify(rules))}&format_options=${encodeURIComponent(JSON.stringify(options))}`
  }

  renderElements() {
    return html`
      ${this._data.map(obj => this.renderNote(obj))}
      `
  }

  // eslint-disable-next-line class-methods-use-this
  renderNote(obj) {
    return html`
    <grampsjs-note-content
      framed
      grampsId="${obj.gramps_id}"
      content="${obj?.formatted?.html || obj?.text?.string}"
      ></grampsjs-note-content>

    <mwc-button
      outlined
      label="${this._('Details')}"
      @click="${() => this._handleButtonClick(obj.gramps_id)}">
    </mwc-button>
    `
  }

  _handleButtonClick(grampsId) {
    this.dispatchEvent(new CustomEvent('nav', {
      bubbles: true, composed: true, detail: {
        path: `note/${grampsId}`
      }
    }))
  }
}


window.customElements.define('grampsjs-view-object-notes', GrampsjsViewObjectNotes)
