import {html} from 'lit'
import {iconSucess, GrampsjsMediaStatus} from './GrampsjsMediaStatus.js'

export class GrampsjsMediaFileStatus extends GrampsjsMediaStatus {
  renderContent() {
    const nTot = this._data.data.length
    return html`
      <span class="inline">
        ${nTot
          ? html`${this.errorMessage(this._data.data)}`
          : html`${iconSucess}`}
        ${this._('%s media objects with missing file', nTot)}
      </span>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return html` <mwc-circular-progress
      indeterminate
      density="-7"
    ></mwc-circular-progress>`
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    return '/api/media/?keys=checksum,gramps_id&sort=gramps_id&filemissing=1'
  }
}

window.customElements.define(
  'grampsjs-media-file-status',
  GrampsjsMediaFileStatus
)
