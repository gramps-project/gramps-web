import {PwaUpdateAvailable} from 'pwa-helper-components/pwa-update-available/PwaUpdateAvailable.js'

// Reports a waiting service worker with the pwa-update-available event and
// activates it with applyUpdate(), which reloads the page
export class GrampsjsUpdateAvailable extends PwaUpdateAvailable {
  constructor() {
    super()
    // The app shows the update in its snackbar, so drop the fallback button
    this.shadowRoot.innerHTML = ''
  }

  // Use a fresh registration instead of the stored _newWorker reference, which
  // can be stale if the component rendered before the waiting worker arrived.
  async applyUpdate() {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg?.waiting) {
        console.log('[GrampsjsUpdateAvailable] posting SKIP_WAITING')
        reg.waiting.postMessage({type: 'SKIP_WAITING'})
        return
      }
    }
    this._newWorker?.postMessage({type: 'SKIP_WAITING'})
  }

  _postMessage(e) {
    e.preventDefault()
    return this.applyUpdate()
  }
}

window.customElements.define(
  'grampsjs-update-available',
  GrampsjsUpdateAvailable
)
