import {html, css} from 'lit-element'
import '@material/mwc-button'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet} from '../api.js'


export class GrampsjsViewStatistics extends GrampsjsView {


  static get styles() {
    return [
      super.styles,
      css`
      :host {
        margin: 0;
      }
      `
    ]
  }

  static get properties() {
    return {
      data: {type: Object}
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  renderContent() {
    return html`
    <h2>${this._('Statistics')}</h2>
    `
  }

  async _fetchData() {
    this.loading = true
    const query = 'changed:\'-1 year to now\''
    const data = await apiGet(`/api/search/?sort=-changed&query=${query}&locale=${this.strings?.__lang__ || 'en'}&profile=all&page=1&pagesize=10`)
    this.loading = false
    if ('data' in data) {
      this._searchResult = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  firstUpdated() {
    this._fetchData()
  }
}


window.customElements.define('grampsjs-view-statistics', GrampsjsViewStatistics)
