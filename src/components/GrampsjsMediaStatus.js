import {css, html} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-circular-progress'
import '@material/mwc-dialog'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'

export const iconSucess = html`<mwc-icon class="success"
  >check_circle</mwc-icon
>`

export class GrampsjsMediaStatus extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          font-size: 16px;
          line-height: 28px;
        }

        mwc-icon {
          font-size: 20px;
          color: rgba(0, 0, 0, 0.4);
          top: 3px;
          position: relative;
        }

        .success {
          color: #41ad49;
        }

        .error {
          color: #bf360c;
        }

        .warn {
          color: #f9a825;
        }

        .inline {
          display: inline-block;
          margin-right: 1em;
        }

        mwc-circular-progress {
          top: 3px;
          position: relative;
          --mdc-theme-primary: rgba(0, 0, 0, 0.4);
        }
      `,
    ]
  }

  renderContent() {
    const nTot = this._data.data.length
    const nChecksumMissing = this._data.data.filter(obj => !obj.checksum).length
    return html`
      <h3>${this._('Media file status')}</h3>

      <span class="inline">
        <mwc-icon>photo</mwc-icon> ${nTot} ${this._('Media Objects')}
      </span>
      <span class="inline">
        ${nTot
          ? html`${nChecksumMissing
              ? html`${this.errorMessage(
                  this._data.data.filter(obj => !obj.checksum)
                )}`
              : html`${iconSucess}`}
            ${this._(
              '%s media objects with missing checksum',
              nChecksumMissing
            )}`
          : ''}
      </span>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return html` <h3>${this._('Media file status')}</h3>
      <mwc-icon>photo</mwc-icon>
      <mwc-circular-progress
        indeterminate
        density="-7"
      ></mwc-circular-progress>`
  }

  errorMessage(objects) {
    return html`
      <mwc-icon class="error link" @click="${this._handleErrorClick}"
        >error</mwc-icon
      >
      <mwc-dialog hideActions
        >${objects.map(
          obj =>
            html`<a href="/media/${obj.gramps_id}">${obj.gramps_id}</a></br>`
        )}</mwc-dialog
      >
    `
  }

  _handleErrorClick() {
    this.renderRoot.querySelector('mwc-dialog').open = true
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    return '/api/media/?keys=checksum,gramps_id&sort=gramps_id'
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('media:uploaded', this._boundUpdateData)
  }

  disconnectedCallback() {
    window.removeEventListener('media:uploaded', this._boundUpdateData)
    super.disconnectedCallback()
  }
}

window.customElements.define('grampsjs-media-status', GrampsjsMediaStatus)
