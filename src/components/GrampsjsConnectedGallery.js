import {html, css} from 'lit'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import './GrampsjsGallery.js'
import {objectTypeToEndpoint} from '../util.js'

export class GrampsjsConnectedGallery extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      ...super.styles,
      css`
        .skeleton-gallery {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(max(100px, 15%), 1fr)
          );
          gap: 4px;
          margin-top: 8px;
        }

        .skeleton-tile {
          aspect-ratio: 1;
          border-radius: 6px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      objectType: {type: String},
      handle: {type: String},
      count: {type: Number},
    }
  }

  constructor() {
    super()
    this.objectType = ''
    this.handle = ''
    this.count = 1
  }

  getUrl() {
    return `/api/${objectTypeToEndpoint[this.objectType]}/${
      this.handle
    }?extend=all&profile=all&locale=${this.appState.i18n.lang || 'en'}`
  }

  renderLoading() {
    return html`
      <div class="skeleton-gallery">
        ${Array(this.count)
          .fill(0)
          .map(() => html`<span class="skeleton skeleton-tile">&nbsp;</span>`)}
      </div>
    `
  }

  renderContent() {
    const object = this._data.data
    if (!object?.media_list?.length) {
      return ''
    }
    return html`
      <grampsjs-gallery
        .appState="${this.appState}"
        .media=${object?.extended?.media}
        .mediaRef=${object?.media_list}
      ></grampsjs-gallery>
    `
  }

  update(changed) {
    super.update(changed)
    if (changed.has('handle')) {
      this._updateData()
    }
  }
}

window.customElements.define(
  'grampsjs-connected-gallery',
  GrampsjsConnectedGallery
)
