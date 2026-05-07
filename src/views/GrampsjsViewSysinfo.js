import {html} from 'lit'

import '../components/GrampsjsSysinfo.js'
import {GrampsjsView} from './GrampsjsView.js'

export class GrampsjsViewSysinfo extends GrampsjsView {
  renderContent() {
    return html`
      <h3>${this._('System Information')}</h3>

      <grampsjs-sysinfo .appState="${this.appState}"></grampsjs-sysinfo>
      <h3>${this._('Tree Information')}</h3>
      <p class="small">
        ID: <span class="monospace">${this.appState.auth.claims.tree}</span>
      </p>
      ${this.appState.dbInfo?.database?.name
        ? html`<p class="small">
            ${this._('Family Tree name')}: ${this.appState.dbInfo.database.name}
          </p>`
        : ''}
      ${this.appState.dbInfo?.database?.type
        ? html`<p class="small">
            ${this._('Type')}:
            <span class="monospace">${this.appState.dbInfo.database.type}</span>
          </p>`
        : ''}
    `
  }
}

window.customElements.define('grampsjs-view-sysinfo', GrampsjsViewSysinfo)
