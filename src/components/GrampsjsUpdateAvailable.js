import {PwaUpdateAvailable} from 'pwa-helper-components/pwa-update-available/PwaUpdateAvailable.js'

import '@material/mwc-snackbar'
import '@material/mwc-button'

export class GrampsjsUpdateAvailable extends PwaUpdateAvailable {
  async connectedCallback() {
    super.connectedCallback()
    this.addEventListener('update:reload', this._postMessage.bind(this))
  }

  // The parent attaches a click listener via .bind(), so it can't be removed (new
  // reference each time). Ignore clicks; only 'update:reload' should trigger an update.
  async _postMessage(e) {
    if (e?.type === 'click') return

    // Get fresh registration instead of relying on stored _newWorker reference
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg?.waiting) {
        e.preventDefault()
        reg.waiting.postMessage({type: 'SKIP_WAITING'})
        return
      }
    }

    // Fallback to parent implementation
    super._postMessage(e)
  }
}

window.customElements.define(
  'grampsjs-update-available',
  GrampsjsUpdateAvailable
)
