import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet} from '../api.js'
import '../components/GrampsjsChromosomeBrowser.js'
import '../components/GrampsjsDnaMatches.js'

export class GrampsjsViewPersonDna extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
        }

        h3 {
          margin: 1.2em 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      handle: {type: String},
      _data: {type: Array},
      person: {type: Object},
    }
  }

  constructor() {
    super()
    this.handle = ''
    this._data = []
    this.person = {}
  }

  renderContent() {
    return this.renderElements()
  }

  renderElements() {
    return html`
      <h3>${this._('Matches')}</h3>
      <grampsjs-dna-matches
        .data="${this._data}"
        .strings="${this.strings}"
        .person="${this.person}"
      ></grampsjs-dna-matches>
      <h3>${this._('Chromosome Browser')}</h3>
      <grampsjs-chromosome-browser
        .data="${this._data}"
        .strings="${this.strings}"
        .person="${this.person}"
        ?loading="${this.loading}"
      ></grampsjs-chromosome-browser>
    `
  }

  update(changed) {
    super.update(changed)
    if (this.active && changed.has('handle')) {
      this._updateData()
    }
  }

  get _url() {
    return `/api/people/${this.handle}/dna/matches?locale=${
      this.strings.__lang__ || 'en'
    }`
  }

  _updateData() {
    if (this.handle) {
      this._data = []
      this.loading = true
      apiGet(this._url).then(data => {
        this.loading = false
        if ('data' in data) {
          this.error = false
          this._data = data.data
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }
}

window.customElements.define('grampsjs-view-person-dna', GrampsjsViewPersonDna)
