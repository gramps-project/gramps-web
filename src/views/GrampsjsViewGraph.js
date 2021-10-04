import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsGraph.js'
import {apiGet} from '../api.js'
import {fireEvent} from '../util.js'

export class GrampsjsViewGraph extends GrampsjsView {
  static get styles () {
    return [
      super.styles,
      css`
      :host {
        margin: 0;
        margin-top: -4px;
      }

      #outer-container {
        height: calc(100vh - 68px);
      }
    `]
  }

  static get properties () {
    return {
      grampsId: {type: String},
      disableBack: {type: Boolean},
      disableHome: {type: Boolean},
      _data: {type: Array},
      _graph: {type: String}
    }
  }

  constructor () {
    super()
    this.grampsId = ''
    this._data = []
    this.disableBack = false
    this.disableHome = false
    this._graph = ''
  }

  renderContent () {
    if (this.grampsId === '') {
      // This should actually never happen, so don't bother translating!
      return html`
      No home person selected. <a href="/settings">Settings</a>
      `
    }
    return html`
    <div id="outer-container">
      <grampsjs-graph
        src="${this._graph}"
        ?disableBack="${this.disableBack}"
        ?disableHome="${this.disableHome}"
      >
      </grampsjs-graph>
    </div>
  `
  }

  _goToPerson () {
    fireEvent(this, 'nav', {path: `person/${this.grampsId}`})
  }

  update (changed) {
    super.update(changed)
    if (changed.has('grampsId')) {
      this._fetchData(this.grampsId)
    }
  }

  async _fetchData (grampsId) {
    this.loading = true
    const options = {
      off: 'dot',
      ratio: 'compress',
      papermb: '0',
      papermt: '0',
      paperml: '0',
      papermr: '0',
      pid: grampsId,
      maxascend: '4',
      maxdescend: '1',
      color: 'colored',
      colormales: '#64B5F6',
      colorfemales: '#EF9A9A',
      colorfamilies: '#000000',
      roundcorners: 'True',
      papers: 'A0',
      arrow: ''
      // ranksep: '0.3'
    }
    const data = await apiGet(`/api/reports/hourglass_graph/file?options=${encodeURIComponent(JSON.stringify(options))}`, false)
    this.loading = false
    if ('data' in data) {
      this._graph = data.data.replace('()', '')
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
      this._graph = ''
    }
  }

  _resizeHandler () {
    clearTimeout(this._resizeTimer)
  }

  firstUpdated () {
    window.addEventListener('resize', this._resizeHandler.bind(this))
    this._fetchData(this.grampsId)
  }
}

window.customElements.define('grampsjs-view-graph', GrampsjsViewGraph)
