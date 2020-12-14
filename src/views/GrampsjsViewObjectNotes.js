import {html, css} from 'lit-element'

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
    const rules = {
      function: 'or',
      rules: this.grampsIds.map(grampsId =>{
        return {
          name: 'HasIdOf',
          values: [grampsId]
        }
      }

      )
    }
    return `/api/notes/?profile=all&extend=all&formats=html&rules=${encodeURIComponent(JSON.stringify(rules))}`
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
