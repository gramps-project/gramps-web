import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import '../components/GrampsjsTimeline.js'

export class GrampsjsViewTimeline extends GrampsjsStaleDataMixin(GrampsjsView) {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin-bottom: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      ...super.properties,
      _data: {type: Array},
    }
  }

  constructor() {
    super()
    this._data = []
  }

  async _fetchData() {
    const result = await this.appState.apiGet(
      '/api/events/?keys=gramps_id,handle,date'
    )
    if ('data' in result) {
      this._data = result.data
    }
  }

  firstUpdated() {
    super.firstUpdated()
    this._fetchData()
  }

  handleUpdateStaleData() {
    this._fetchData()
  }

  renderContent() {
    return html`<grampsjs-timeline
      .events="${this._data}"
      .appState="${this.appState}"
    ></grampsjs-timeline>`
  }
}

window.customElements.define('grampsjs-view-timeline', GrampsjsViewTimeline)
