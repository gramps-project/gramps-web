import {html, css, LitElement} from 'lit'
import {sharedStyles} from '../SharedStyles.js'
import {linkUrls} from '../util.js'

export class GrampsjsNoteContent extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          font-family: var(
            --grampsjs-note-font-family,
            var(--grampsjs-body-font-family)
          );
          font-size: var(--grampsjs-note-font-size, 17px);
          line-height: var(--grampsjs-note-line-height, 1.5em);
          color: var(--grampsjs-note-color, #000000);
        }

        .note {
          font-weight: 300;
          column-width: 30em;
          column-gap: 2em;
        }

        .note.frame {
          border: 1px solid rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          padding: 20px 25px;
        }

        .note.frame p {
          margin: 2em 0em;
        }

        .note.frame p:first-child {
          margin-top: 0;
        }

        .note.frame p:last-child {
          margin-bottom: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      content: {type: String},
      framed: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.framed = false
  }

  render() {
    return html`
      <div class="note ${this.framed ? 'frame' : ''}" id="note-content"></div>
    `
  }

  updated() {
    const noteContent = this.shadowRoot.getElementById('note-content')
    noteContent.innerHTML = linkUrls(this.content)
  }
}

window.customElements.define('grampsjs-note-content', GrampsjsNoteContent)
