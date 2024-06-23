import {css, html, LitElement} from 'lit'

import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsTooltip.js'
import '@material/mwc-icon-button'

export class GrampsjsSysinfo extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        div.copy {
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 5px;
          padding: 20px;
          max-width: 20em;
          line-height: 26px;
          font-size: 16px;
        }

        div.copy mwc-icon-button {
          color: rgba(0, 0, 0, 0.3);
          --mdc-icon-size: 16px;
          float: right;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  render() {
    const version = '[VI]{version}[/VI]'
    return html`
      <div class="copy" id="copy">
        <mwc-icon-button
          icon="content_copy"
          id="copy-button"
          @click=${this._copyToClipboard}
        ></mwc-icon-button>
        <grampsjs-tooltip for="copy-button" .strings="${this.strings}"
          >${this._('Copy to clipboard')}</grampsjs-tooltip
        >
        Gramps ${this.data?.gramps?.version || '?'}<br />
        Gramps Web API ${this.data?.gramps_webapi?.version || '?'}<br />
        Gramps Web Frontend ${version}<br />
        Gramps QL ${this.data?.gramps_ql?.version || '?'}<br />
        locale: ${this.data?.locale?.language}<br />
        multi-tree: ${this.data?.server?.multi_tree}<br />
        task queue: ${this.data?.server?.task_queue}
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
