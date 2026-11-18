import {html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsImport.js'
import '../components/GrampsjsImportMedia.js'

// Importing a family tree file and the media files that belong to it
export class GrampsjsViewImport extends GrampsjsView {
  static get properties() {
    return {
      ...super.properties,
      homePersonDetails: {type: Object},
      homePersonMissing: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.homePersonDetails = {}
    this.homePersonMissing = false
  }

  renderContent() {
    return html`
      <grampsjs-import
        .appState="${this.appState}"
        .homePersonDetails=${this.homePersonDetails}
        .homePersonMissing=${this.homePersonMissing}
      ></grampsjs-import>
      <grampsjs-import-media
        .appState="${this.appState}"
      ></grampsjs-import-media>
    `
  }
}

window.customElements.define('grampsjs-view-import', GrampsjsViewImport)
