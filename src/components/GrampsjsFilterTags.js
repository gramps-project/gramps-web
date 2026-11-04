import {html} from 'lit'
import '@material/web/button/outlined-button'

import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import './GrampsjsFilterCheckboxes.js'

export class GrampsjsFilterTags extends GrampsjsConnectedComponent {
  static get properties() {
    return {
      section: {type: Object},
      rules: {type: Array},
    }
  }

  constructor() {
    super()
    this.section = {}
    this.rules = []
  }

  renderContent() {
    const entries = (this._data.data ?? []).map(tag => ({
      label: tag.name,
      rule: {name: this.section.rule, values: [tag.name]},
    }))
    return html`
      <grampsjs-filter-checkboxes
        .section="${{...this.section, entries}}"
        .rules="${this.rules}"
      ></grampsjs-filter-checkboxes>
    `
  }

  render() {
    if (this.error) {
      return html`
        <p role="alert">${this._('Could not load tags.')}</p>
        <md-outlined-button @click="${() => this._updateData()}">
          ${this._('Retry')}
        </md-outlined-button>
      `
    }
    if (this.loading)
      return html`<p aria-live="polite">${this._('Loading...')}</p>`
    return this.renderContent()
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    return '/api/tags/'
  }
}

window.customElements.define('grampsjs-filter-tags', GrampsjsFilterTags)
