import {css, html, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

// The GEDCOM importer pads each problem with spaces to a fixed column and
// appends the source line ("Line   144: 1 FILE ..."). Moving the source line
// to its own indented line keeps the report narrow.
function formatMessages(text) {
  return text.replace(/[ \t]{2,}(?=Line +\d+:)/g, '\n    ')
}

/**
 * Shows the messages an exporter or importer reports, one line per entry.
 * With `warn`, renders as a warning alert. With `collapsed`, the messages are
 * hidden behind a disclosure: an importer's raw report of a file from another
 * program can run to hundreds of lines.
 * Renders nothing when there are no messages.
 */
export class GrampsjsImportExportReport extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .messages {
          font-family: var(--grampsjs-mono-font-family);
          white-space: pre;
          max-height: 25em;
          overflow: auto;
          line-height: 1.5em;
        }

        .card .messages {
          font-size: 0.8em;
        }

        h4 {
          margin: 0 0 0.5em 0;
        }

        summary {
          cursor: pointer;
          user-select: none;
        }

        details[open] summary {
          margin-bottom: 0.5em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      messages: {type: Array},
      heading: {type: String},
      warn: {type: Boolean},
      collapsed: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.messages = []
    this.heading = ''
    this.warn = false
    this.collapsed = false
  }

  render() {
    const lines = (this.messages ?? []).filter(m => m)
    if (lines.length === 0) {
      return ''
    }
    const text = formatMessages(lines.join('\n'))
    const messages = html`<div class="messages">${text}</div>`
    return html`
      <div class="${this.warn ? 'alert warn' : 'card'}">
        ${this.heading ? html`<h4>${this.heading}</h4>` : ''}
        ${this.collapsed
          ? html`<details>
              <summary>${this._('Show Details')}</summary>
              ${messages}
            </details>`
          : messages}
      </div>
    `
  }
}

window.customElements.define(
  'grampsjs-import-export-report',
  GrampsjsImportExportReport
)
