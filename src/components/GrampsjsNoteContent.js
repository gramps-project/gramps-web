import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
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
          color: var(--grampsjs-note-color);
        }

        .note {
          font-weight: 300;
        }

        .note.columns {
          column-width: 30em;
          column-gap: 2em;
          orphans: 2;
          widows: 2;
        }

        .note-container.frame {
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 6px;
          padding: 20px 25px;
        }

        .note-container.frame p {
          margin: 2em 0em;
        }

        .note-container.frame p:first-child {
          margin-top: 0;
        }

        .note-container.frame p:last-child {
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
      columns: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.framed = false
    this.columns = false
  }

  render() {
    return html`
      <div class="note-container ${this.framed ? 'frame' : ''}">
        <div
          id="note-content"
          class="${classMap({note: true, columns: this.columns})}"
        ></div>
        <slot></slot>
      </div>
    `
  }

  updated() {
    const noteContent = this.shadowRoot.getElementById('note-content')
    noteContent.innerHTML = linkUrls(this.content)
    this.columns = noteContent.textContent.length > 1000
  }
}

window.customElements.define('grampsjs-note-content', GrampsjsNoteContent)
