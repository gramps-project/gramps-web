import {html} from 'lit'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import './GrampsjsGallery.js'
import {objectTypeToEndpoint} from '../util.js'

export class GrampsjsConnectedGallery extends GrampsjsConnectedComponent {
  static get properties() {
    return {
      objectType: {type: String},
      handle: {type: String},
      radius: {type: Number},
      size: {type: Number},
      square: {type: Boolean},
      count: {type: Number},
    }
  }

  constructor() {
    super()
    this.objectType = ''
    this.handle = ''
    this.radius = 0
    this.size = 200
    this.square = false
    this.count = 1
  }

  getUrl() {
    return `/api/${objectTypeToEndpoint[this.objectType]}/${
      this.handle
    }?extend=all&profile=all&locale=${this.appState.i18n.lang || 'en'}`
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return [...Array(this.count).keys()].map(
      () => html`<span
        class="skeleton"
        style="width:${this.size}px;height:${this
          .size}px;margin:3px;border-radius:${this.radius};"
        >&nbsp;</span
      >`
    )
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
        radius="${this.radius}"
        size="${this.size}"
        ?square="${this.square}"
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
