import {html} from 'lit'
import {iconSuccess, GrampsjsMediaStatus} from './GrampsjsMediaStatus.js'

export class GrampsjsMediaFileStatus extends GrampsjsMediaStatus {
  renderContent() {
    const nTot = this._data.data.length
    return html`
      <span class="inline">
        ${nTot
          ? html`${this.errorMessage(this._data.data)}`
          : html`${iconSuccess}`}
        ${this._('%s media objects with missing file', nTot)}
        ${nTot && this.appState.permissions.canImport
          ? html`&middot; <a href="/import">${this._('Import Media Files')}</a>`
          : ''}
      </span>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return html`<md-circular-progress indeterminate></md-circular-progress>`
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    // the path tells users which file to look for
    return '/api/media/?keys=checksum,gramps_id,path&sort=gramps_id&filemissing=1'
  }
}

window.customElements.define(
  'grampsjs-media-file-status',
  GrampsjsMediaFileStatus
)
