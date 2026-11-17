import {html, css, LitElement} from 'lit'
import {mdiDownload} from '@mdi/js'

import '@material/web/iconbutton/icon-button.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {iconButtonColorStyles} from '../SharedStyles.js'
import {downloadFile} from '../charts/svgExport.js'
import {fireEvent} from '../util.js'
import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'

// An icon button that saves the document returned by `content()`, or by the
// promise it returns, as a file of MIME type `mimeType` named `filename`.
// Nothing is saved for null. The button is disabled while the document is
// being prepared. The icon colour is set with `--grampsjs-icon-button-color`.
export class GrampsjsDownloadButton extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      iconButtonColorStyles,
      css`
        :host {
          display: inline-flex;
        }
      `,
    ]
  }

  static get properties() {
    return {
      filename: {type: String},
      mimeType: {type: String},
      content: {attribute: false},
      _preparing: {state: true},
    }
  }

  constructor() {
    super()
    this.filename = 'download'
    this.mimeType = 'application/octet-stream'
    this.content = () => null
    this._preparing = false
  }

  render() {
    return html`
      <md-icon-button
        id="button"
        aria-label="${this._('Download')}"
        ?disabled=${this._preparing}
        @click=${this._download}
        ><grampsjs-icon
          path="${mdiDownload}"
          color="currentColor"
        ></grampsjs-icon
      ></md-icon-button>
      <grampsjs-tooltip for="button" .appState="${this.appState}"
        >${this._('Download')}</grampsjs-tooltip
      >
    `
  }

  // The file gets the name the button had when the chart was captured
  async _download() {
    const {filename, mimeType} = this
    this._preparing = true
    try {
      const content = await this.content()
      if (content) {
        downloadFile(content, filename, mimeType)
      }
    } catch (error) {
      fireEvent(this, 'grampsjs:error', {message: error.message})
    } finally {
      this._preparing = false
    }
  }
}

window.customElements.define('grampsjs-download-button', GrampsjsDownloadButton)
