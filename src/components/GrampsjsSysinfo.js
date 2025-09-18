import {css, html, LitElement} from 'lit'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsTooltip.js'
import '@material/mwc-icon-button'

export class GrampsjsSysinfo extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        div.copy {
          border: 1px solid var(--grampsjs-body-font-color-20);
          border-radius: 5px;
          padding: 20px;
          max-width: 20em;
          line-height: 26px;
          font-size: 16px;
        }

        div.copy mwc-icon-button {
          color: var(--grampsjs-body-font-color-30);
          --mdc-icon-size: 16px;
          float: right;
        }
      `,
    ]
  }

  render() {
    const version = '[VI]{version}[/VI]'
    const data = this.appState.dbInfo
    return html`
      <div class="copy">
        <mwc-icon-button
          icon="content_copy"
          id="copy-button"
          @click=${this._copyToClipboard}
        ></mwc-icon-button>
        <grampsjs-tooltip for="copy-button" .appState="${this.appState}"
          >${this._('Copy to clipboard')}</grampsjs-tooltip
        >
        <span id="copy">
          Gramps ${data?.gramps?.version || '?'}<br />
          Gramps Web API ${data?.gramps_webapi?.version || '?'}<br />
          Gramps Web Frontend ${version}<br />
          Gramps QL ${data?.gramps_ql?.version || '?'}<br />
          Sifts ${data?.search?.sifts?.version || '?'}<br />
          locale: ${data?.locale?.language}<br />
          multi-tree: ${data?.server?.multi_tree}<br />
          task queue: ${data?.server?.task_queue}<br />
          OCR: ${data?.server?.ocr}<br />
          chat: ${data?.server?.chat}<br />
        </span>
      </div>
    `
  }

  _copyToClipboard() {
    const myDiv = this.renderRoot.getElementById('copy')
    const textToCopy = myDiv.innerText

    const tempTextarea = document.createElement('textarea')
    tempTextarea.value = textToCopy

    document.body.appendChild(tempTextarea)

    tempTextarea.select()
    tempTextarea.setSelectionRange(0, 99999)
    navigator.clipboard.writeText(tempTextarea.value)

    document.body.removeChild(tempTextarea)

    const btn = this.renderRoot.getElementById('copy-button')
    btn.icon = 'done'
    setTimeout(() => {
      btn.icon = 'content_copy'
    }, 1000)
  }
}

window.customElements.define('grampsjs-sysinfo', GrampsjsSysinfo)
