import {css, html} from 'lit'
import '@material/mwc-circular-progress'
import '@material/web/dialog/dialog.js'

import {mdiAlertCircle, mdiCheckCircle} from '@mdi/js'

import './GrampsjsIcon.js'
import {objectIconPath} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'

export const iconSucess = html`<grampsjs-icon
  class="success"
  path="${mdiCheckCircle}"
  color="currentColor"
></grampsjs-icon>`

export class GrampsjsMediaStatus extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          font-size: 16px;
          line-height: 28px;
        }

        grampsjs-icon {
          width: 20px;
          height: 20px;
          color: var(--grampsjs-body-font-color-40);
        }

        .inline {
          display: inline-block;
          margin-right: 1em;
        }

        mwc-circular-progress {
          top: 3px;
          position: relative;
          --mdc-theme-primary: var(--grampsjs-body-font-color-40);
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
        <grampsjs-icon path="${objectIconPath.media}" color="currentColor">
        </grampsjs-icon>
        ${nTot} ${this._('Media Objects')}
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
      <grampsjs-icon path="${objectIconPath.media}" color="currentColor">
      </grampsjs-icon>
      <mwc-circular-progress
        indeterminate
        density="-7"
      ></mwc-circular-progress>`
  }

  errorMessage(objects) {
    return html`
      <grampsjs-icon
        class="error link"
        path="${mdiAlertCircle}"
        color="currentColor"
        @click="${this._handleErrorClick}"
      ></grampsjs-icon>
      <md-dialog>
        <div slot="content">
          ${objects.map(
            obj =>
              html`<a href="/media/${obj.gramps_id}">${obj.gramps_id}</a><br />`
          )}
        </div>
      </md-dialog>
    `
  }

  _handleErrorClick() {
    this.renderRoot.querySelector('md-dialog').show()
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
