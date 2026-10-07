import {html, css, LitElement} from 'lit'
import {mdiDownload} from '@mdi/js'

import '@material/web/iconbutton/icon-button.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {iconButtonColorStyles} from '../SharedStyles.js'
import {downloadSvg} from '../charts/svgExport.js'
import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'

// An icon button that saves the SVG document returned by `svgDocument()` as a
// file named `filename`. Nothing is saved while `svgDocument()` returns null.
// The icon colour is set with `--grampsjs-icon-button-color`.
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
    }
  }

  constructor() {
    super()
    this.filename = 'chart.svg'
    this.svgDocument = () => null
  }

  render() {
    return html`
      <md-icon-button
        id="button"
        aria-label="${this._('Download')}"
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

  _download() {
    const content = this.svgDocument()
    if (content) {
      downloadSvg(content, this.filename)
    }
  }
}

window.customElements.define(
  'grampsjs-svg-download-button',
  GrampsjsSvgDownloadButton
)
