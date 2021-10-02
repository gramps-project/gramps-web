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
      }

      #outer-container {
        height: calc(100vh - 68px);
      }
    `]
  }

  static get properties () {
    return {
      grampsId: {type: String},
      _data: {type: Array},
      // _depth: {type: Number},
      // _zoom: {type: Number},
      _history: {type: Array},
      _graph: {type: String}
    }
  }

  constructor () {
    super()
    this.grampsId = ''
    this._data = []
    // this._depth = 3
    // this._zoom = 1
    this._history = []
    this._graph = ''
  }

  renderContent () {
    if (this.grampsId === '') {
      // This should actually never happen, so don't bother translating!
      return html`
      No home person selected. <a href="/settings">Settings</a>
      `
    }
    if (this._graph === '') {
      return html``
    }
    console.log(this._history.length)
    return html`
    <div id="outer-container">
      <grampsjs-graph
        src="${this._graph}"
        @graph:back="${this._prevPerson}"
        @graph:person="${this._goToPerson}"
        @graph:home="${this._backToHomePerson}"
        ?disableBack="${this._history.length <= 1}"
      >
      </grampsjs-graph>
    </div>
  `
  }

  _goToPerson () {
    fireEvent(this, 'nav', {path: `person/${this.grampsId}`})
  }

  _prevPerson () {
    this._history.pop()
    this.grampsId = this._history.pop()
  }

  _backToHomePerson () {
    this.grampsId = this.settings.homePerson
  }

  update (changed) {
    super.update(changed)
    if (changed.has('grampsId')) {
      this._fetchData(this.grampsId)
      this._history.push(this.grampsId)
      // limit history to 100 people
      this._history = this._history.slice(-100)
    }
    // if (changed.has('_depth')) {
    //   this.setZoom()
    //   this._fetchData(this.grampsId)
    // }
    if (changed.has('active')) {
      // this.setZoom()
      // const slider = this.shadowRoot.getElementById('slider')
      // if (slider) {
      //   slider.layout()
      // }
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
      papers: 'A0'
    }
    const data = await apiGet(`/api/reports/hourglass_graph/file?options=${encodeURIComponent(JSON.stringify(options))}`, false)
    this.loading = false
    if ('data' in data) {
      this._graph = data.data.replace('()', '')
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  // _updateDepth (event) {
  //   if (event.detail.value) {
  //     this._depth = event.detail.value
  //   }
  // }

  // setZoom () {
  //   this._zoom = this.getZoom()
  // }

  _resizeHandler () {
    clearTimeout(this._resizeTimer)
    // this._resizeTimer = setTimeout(this.setZoom.bind(this), 250)
  }

  firstUpdated () {
    window.addEventListener('resize', this._resizeHandler.bind(this))
    window.addEventListener('pedigree:person-selected', this._selectPerson.bind(this))
    // this.setZoom()
    this._fetchData(this.grampsId)
  }

  async _selectPerson (event) {
    const {grampsId} = event.detail
    await this._fetchData(grampsId)
    this.grampsId = grampsId
  }
}

window.customElements.define('grampsjs-view-graph', GrampsjsViewGraph)
