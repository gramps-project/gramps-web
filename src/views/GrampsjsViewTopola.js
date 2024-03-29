import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import {getExporterDownloadUrl} from '../api.js'

/**
 * Gramps Web View displaying the Topola Viewer.
 *
 * Topola Viewer is loaded from the official deployment at
 * https://pewu.github.io/topola-viewer and displayed in an iframe.
 *
 * Data is loaded from the Gramps Web API as a full GEDCOM file and is passed
 * to Topola Viewer using JS messaging between iframes. The GEDCOM file is
 * generated and passed only once. Navigating away from the Topola tab and back
 * does not cause the GEDCOM file to be regenerated. This means that edits will
 * not be visible in Topola Viewer without reloading the page.
 * No data is sent to any Topola Viewer server (it's a statically serverd app
 * without a backend), all communication with Topola Viewer happens inside the
 * browser.
 *
 * The home person is passed to Topola Viewer in the iframe URL.
 */
export class GrampsjsViewTopola extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
          margin-top: -4px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
    }
  }

  constructor() {
    super()
    /** Gramps Web home person */
    this.grampsId = ''
    /** Set to true when the iframe reports to be ready. */
    this.ready = false
    /** The GEDCOM file loaded from the Gramps Web API. */
    this.gedcom = null
  }

  renderContent() {
    const indiParam = this.grampsId ? `&indi=${this.grampsId}` : ''
    return html`<iframe
      id="topolaFrame"
      style="width: calc(100vw - 234px); height: calc(100vh - 72px);"
      src="https://pewu.github.io/topola-viewer/#/view?utm_source=grampsweb&embedded=true${indiParam}"
    ></iframe>`
  }

  /** Initializes communication with the iframe. */
  async firstUpdated() {
    window.addEventListener('message', this._onMessage.bind(this))

    const url = '/api/exporters/ged/file'
    const downloadUrl = getExporterDownloadUrl(url)
    const response = await fetch(downloadUrl)
    const gedcom = await response.text()
    this.gedcom = gedcom
    this._maybeSendData()
  }

  /** Handles incoming messages. */
  _onMessage(message) {
    if (message.data.message === 'ready') {
      this.ready = true
      this._maybeSendData()
    }
  }

  /**
   * Sends data to the iframe when both the iframe is ready and the data is
   * present.
   */
  _maybeSendData() {
    if (!this.ready || !this.gedcom) {
      return
    }
    const frame = this.shadowRoot.getElementById('topolaFrame')
    frame.contentWindow.postMessage(
      {message: 'gedcom', gedcom: this.gedcom},
      '*'
    )
  }

  /** Registers listening for home person changes. */
  connectedCallback() {
    super.connectedCallback()
    window.addEventListener(
      'pedigree:person-selected',
      this._selectPerson.bind(this)
    )
  }

  /** Sets the home person based on a received event. */
  async _selectPerson(event) {
    const {grampsId} = event.detail
    this.grampsId = grampsId
  }
}

window.customElements.define('grampsjs-view-topola', GrampsjsViewTopola)
