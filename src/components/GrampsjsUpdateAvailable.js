import {PwaUpdateAvailable} from 'pwa-helper-components/pwa-update-available/PwaUpdateAvailable.js'

import '@material/mwc-snackbar'
import '@material/mwc-button'

export class GrampsjsUpdateAvailable extends PwaUpdateAvailable {
  async connectedCallback () {
    super.connectedCallback()
    this.removeEventListener('click', this._postMessage.bind(this))
    this.addEventListener('update:reload', this._postMessage.bind(this))
  }
}

window.customElements.define('grampsjs-update-available', GrampsjsUpdateAvailable)
