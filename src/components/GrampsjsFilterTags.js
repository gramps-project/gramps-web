import {html} from 'lit'

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

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    return '/api/tags/'
  }
}

window.customElements.define('grampsjs-filter-tags', GrampsjsFilterTags)
