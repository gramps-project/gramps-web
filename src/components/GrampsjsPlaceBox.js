import {html, css} from 'lit'

import '@material/web/button/text-button.js'

import './GrampsjsGallery.js'
import './GrampsjsIcon.js'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import {fireEvent} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'
import {mdiMapMarkerOff} from '@mdi/js'

export class GrampsjsPlaceBox extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      sharedStyles,
      css`
        h2,
        h3,
        h4 {
          font-family: var(--grampsjs-body-font-family);
        }

        h2 {
          font-weight: 500;
          font-size: 22px;
          margin-top: 10px;
          margin-bottom: 0;
        }

        h3 {
          font-weight: 400;
          font-size: 18px;
          margin-top: 8px;
          margin-bottom: 7px;
        }

        h4 {
          margin-top: 2px;
          font-weight: 300;
          font-size: 15px;
        }

        :host {
          font-size: 16px;
        }

        .right {
          text-align: right;
          position: sticky;
          bottom: 0;
          background: var(--md-sys-color-surface-container-high);
          margin-top: 4px;
        }

        p {
          margin-top: 0.6em;
          margin-bottom: 0.6em;
        }

        p.no-coords {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 4px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      handle: {type: String},
      name: {type: String},
    }
  }

  constructor() {
    super()
    this.handle = ''
    this.name = ''
  }

  getUrl() {
    if (!this.handle) return ''
    const lang = this.appState?.i18n?.lang || 'en'
    return `/api/places/${this.handle}?extend=all&profile=self&locale=${lang}`
  }

  renderContent() {
    const place = this._data?.data
    if (!place) return ''
    const lat = place.lat
    const long = place.long
    const hasCoords =
      lat != null &&
      lat !== '' &&
      long != null &&
      long !== '' &&
      !(parseFloat(lat) === 0 && parseFloat(long) === 0)
    return html`
      <h2>${place.name?.value || place.title || this._('Place')}</h2>
      ${place.profile?.parent_places?.length > 0
        ? html`<h4>
            ${place.profile.parent_places.map(obj => obj.name).join(', ')}
          </h4>`
        : ''}
      ${hasCoords
        ? ''
        : html`<p class="no-coords">
            <grampsjs-icon
              path="${mdiMapMarkerOff}"
              height="16"
              width="16"
            ></grampsjs-icon>
            ${this._('No coordinates')}
          </p>`}
      ${place.media_list?.length
        ? html`
            <h3>${this._('Gallery')}</h3>
            <grampsjs-gallery
              .appState="${this.appState}"
              .media="${place.extended?.media || []}"
              .mediaRef="${place.media_list}"
            ></grampsjs-gallery>
          `
        : ''}
      <div class="right">
        <md-text-button @click="${this._handleDetailClick}"
          >${this._('Show Details')}</md-text-button
        >
      </div>
    `
  }

  renderLoading() {
    return html`
      <h2>
        ${this.name || html`<span class="skeleton skeleton-text">&nbsp;</span>`}
      </h2>
      <span class="skeleton skeleton-text" style="width:60%">&nbsp;</span>
      <span class="skeleton skeleton-text" style="width:80%">&nbsp;</span>
    `
  }

  _handleDetailClick() {
    const id = this._data?.data?.gramps_id
    if (id) fireEvent(this, 'nav', {path: `place/${id}`})
  }
}

window.customElements.define('grampsjs-place-box', GrampsjsPlaceBox)
