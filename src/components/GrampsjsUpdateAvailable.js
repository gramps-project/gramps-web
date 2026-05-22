import {PwaUpdateAvailable} from 'pwa-helper-components/pwa-update-available/PwaUpdateAvailable.js'

import '@material/mwc-snackbar'
import '@material/mwc-button'

export class GrampsjsUpdateAvailable extends PwaUpdateAvailable {
  // Use a fresh registration instead of the stored _newWorker reference, which
  // can be stale if the component rendered before the waiting worker arrived.
  // The parent's connectedCallback registers a controllerchange listener that
  // calls window.location.reload() — that's what actually reloads the page.
  async _postMessage(e) {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg?.waiting) {
        console.log('[GrampsjsUpdateAvailable] posting SKIP_WAITING')
        reg.waiting.postMessage({type: 'SKIP_WAITING'})
        return
      }
    }
    return super._postMessage(e)
  }
}

window.customElements.define(
  'grampsjs-update-available',
  GrampsjsUpdateAvailable
)
