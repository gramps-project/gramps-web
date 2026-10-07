import {html, css, LitElement} from 'lit'
import {mdiDownload} from '@mdi/js'

import '@material/web/iconbutton/icon-button.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {iconButtonColorStyles} from '../SharedStyles.js'
import {downloadSvg} from '../charts/svgExport.js'
import {fireEvent} from '../util.js'
import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'

// An icon button that saves the SVG document returned by `svgDocument()`, or
// by the promise it returns, as a file named `filename`. Nothing is saved for
// null. The button is disabled while the document is being prepared. The icon
// colour is set with `--grampsjs-icon-button-color`.
export class GrampsjsSvgDownloadButton extends GrampsjsAppStateMixin(
  LitElement
) {
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
      svgDocument: {attribute: false},
      _preparing: {state: true},
    }
  }

  constructor() {
    super()
    this.filename = 'chart.svg'
    this.svgDocument = () => null
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
    const {filename} = this
    this._preparing = true
    try {
      const content = await this.svgDocument()
      if (content) {
        downloadSvg(content, filename)
      }
    } catch (error) {
      fireEvent(this, 'grampsjs:error', {message: error.message})
    } finally {
      this._preparing = false
    }
  }
}

window.customElements.define(
  'grampsjs-svg-download-button',
  GrampsjsSvgDownloadButton
)
