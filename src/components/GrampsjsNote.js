import {html, css} from 'lit-element'

import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsNoteContent.js'


export class GrampsjsNote extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }
    `]
  }

  renderProfile() {
    return html`
    <h2>${this.data.name}</h2>
    ${this.data?.type ? html`<p><span class="md">${this._('Type')}:</span> ${this._(this.data.type)}</p>` : ''}

    <grampsjs-note-content
      grampsId="${this.data.gramps_id}"
      content="${this.data?.formatted?.html || this.data?.text?.string || 'Error loading note'}"
      ></grampsjs-note-content>
    <pre>${JSON.stringify(this.data, null, 2)}</pre>
    `
  }

}


window.customElements.define('grampsjs-note', GrampsjsNote)
