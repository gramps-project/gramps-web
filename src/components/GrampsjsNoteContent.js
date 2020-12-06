import { html, css, LitElement } from 'lit-element';
import { sharedStyles } from '../SharedStyles.js'


export class GrampsjsNoteContent extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      :host {
      }

      .note {
        font-family: Roboto Slab;
        font-weight: 300;
        font-size: 20px;
        line-height: 1.5em;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 8px;
        padding: 20px 25px;
      }

      .note p {
        margin: 2em 0em;
      }

      .note p:first-child {
        margin-top:0;
      }

      .note p:last-child {
        margin-bottom:0;
      }
      `
    ];
  }

  static get properties() {
    return {
      grampsId: { type: String },
      content: { type: String },
    };
  }

  render() {
    return html`
    <p>${this.grampsId}</p>
    <div class="note" id="note-content"></div>
  `
  }

  updated() {
    const noteContent = this.shadowRoot.getElementById("note-content")
    noteContent.innerHTML = this.content
  }


}


window.customElements.define('grampsjs-note-content', GrampsjsNoteContent);
