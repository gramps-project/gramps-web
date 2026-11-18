import {css, html, LitElement} from 'lit'
import {mdiCheck, mdiContentCopy} from '@mdi/js'
import '@material/web/iconbutton/icon-button.js'

import {sharedStyles, iconButtonColorStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import './GrampsjsDownloadButton.js'
import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'

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
 * program can run to hundreds of lines. With `filename`, the report can be
 * copied, or downloaded as a text file of that name, as the program
 * reported it.
 * Renders nothing when there are no messages.
 */
export class GrampsjsImportExportReport extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      iconButtonColorStyles,
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

        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 0.5em 0;
        }

        h4 {
          margin: 0 0 0.5em 0;
        }

        .header h4 {
          flex: 1;
          margin: 0;
        }

        .actions {
          display: flex;
          margin-left: auto;
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
      filename: {type: String},
      _copied: {state: true},
    }
  }

  constructor() {
    super()
    this.messages = []
    this.heading = ''
    this.warn = false
    this.collapsed = false
    this.filename = ''
    this._copied = false
  }

  get _lines() {
    return (this.messages ?? []).filter(m => m)
  }

  render() {
    const lines = this._lines
    if (lines.length === 0) {
      return ''
    }
    const text = formatMessages(lines.join('\n'))
    const messages = html`<div class="messages">${text}</div>`
    return html`
      <div class="${this.warn ? 'alert warn' : 'card'}">
        ${this._renderHeader()}
        ${this.collapsed
          ? html`<details>
              <summary>${this._('Show Details')}</summary>
              ${messages}
            </details>`
          : messages}
      </div>
    `
  }

  _renderHeader() {
    const heading = this.heading ? html`<h4>${this.heading}</h4>` : ''
    if (!this.filename) {
      return heading
    }
    return html`<div class="header">
      ${heading}
      <span class="actions">
        <md-icon-button
          id="copy-button"
          aria-label="${this._('Copy to clipboard')}"
          @click="${this._copy}"
          ><grampsjs-icon
            path="${this._copied ? mdiCheck : mdiContentCopy}"
            color="currentColor"
          ></grampsjs-icon
        ></md-icon-button>
        <grampsjs-tooltip for="copy-button" .appState="${this.appState}"
          >${this._('Copy to clipboard')}</grampsjs-tooltip
        >
        <grampsjs-download-button
          .appState="${this.appState}"
          filename="${this.filename}"
          mimeType="text/plain"
          .content="${() => this._text()}"
        ></grampsjs-download-button>
      </span>
    </div>`
  }

  // The report as the program wrote it, without the reformatting for display
  _text() {
    return `${this._lines.join('\n')}\n`
  }

  async _copy() {
    try {
      await navigator.clipboard.writeText(this._text())
    } catch (err) {
      fireEvent(this, 'grampsjs:error', {
        message: this._('Failed to copy to clipboard'),
      })
      return
    }
    this._copied = true
    setTimeout(() => {
      this._copied = false
    }, 1000)
  }
}

window.customElements.define(
  'grampsjs-import-export-report',
  GrampsjsImportExportReport
)
