import {html, css} from 'lit-element'
import '@material/mwc-slider'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsPedigree.js'
import {apiGet} from '../api.js'


export class GrampsjsViewTree extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
      .label {
        font-size: 0.8em;
      }

      mwc-slider {
        --mdc-theme-secondary: #4FC3F7;
      }

      #slider-block {
        line-height: 48px;
      }

      #slider-block span {
        vertical-align: middle;
        display: inline-block;
        padding-right: 1em;
      }

      .slider-container {
        height: 48px;
      }
    `]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      _data: {type: Array},
      _depth: {type: Number}
    }
  }

  constructor() {
    super()
    this._data = []
    this._depth = 4
    this._zoom = 1
  }

  renderContent() {
    if (this._data.length === 0) {
      return html``
    }
    return html`
    <section id="pedigree-section">
      <div id="slider-block">
        <span class="label">${this._('Number of generations:')}</span>
        <span class="slider-container"><mwc-slider
            value="${this._depth}"
            min="2"
            max="6"
            step="1"
            @change="${this._updateDepth}"
            pin
            ></mwc-slider></span>
      </div>
      <div style="transform: scale(${this._zoom}); transform-origin: top left;" id="pedigree-container">
        <grampsjs-pedigree
          .ancestors="${this._data}"
          grampsId="${this.grampsId}"
          depth="${this._depth}"
          id="pedigree"
          ></grampsjs-pedigree>
      </div>
    </section>
  `
  }

  update(changed) {
    super.update(changed)
    if (changed.has('grampsId') && this.active) {
      this._fetchData(this.grampsId)
    }
    if (changed.has('_depth')) {
      this.setZoom()
    }

  }

  async _fetchData(grampsId) {
    this.loading = true
    const rules = {
      function: 'or',
      rules: [
        {
          name: 'IsLessThanNthGenerationAncestorOf',
          values: [grampsId, (this._depth || 1)]
        },
        {
          name: 'IsLessThanNthGenerationDescendantOf',
          values: [grampsId, 1]
        },
      ]}
    const data = await apiGet(`/api/people/?rules=${encodeURIComponent(JSON.stringify(rules))}&profile=self,families`)
    this.loading = false
    if ('data' in data) {
      this._data = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _updateDepth(event) {
    if (event.detail.value) {
      this._depth = event.detail.value
    }
  }

  getZoom() {
    const sec = this.shadowRoot.getElementById('pedigree-section')
    if (sec === null) {
      return 1
    }
    const secWidth = sec.offsetWidth
    const treeWidth = this._depth * 230 * this._zoom
    const newZoom = (secWidth - 24) / treeWidth * this._zoom
    if (newZoom > 1) {
      return 1
    }
    if (newZoom < 0.2) {
      return 0.2
    }
    return newZoom
  }

  setZoom() {
    this._zoom = this.getZoom()
  }

  _resizeHandler() {
    clearTimeout(this._resizeTimer)
    this._resizeTimer = setTimeout(this.setZoom.bind(this), 250)
  }

  firstUpdated() {
    window.addEventListener('resize', this._resizeHandler.bind(this))
    window.addEventListener('pedigree:person-selected', this._selectPerson.bind(this))
    this.setZoom()
  }

  async _selectPerson(event) {
    const {grampsId} = event.detail
    await this._fetchData(grampsId)
    this.grampsId = grampsId
  }

}


window.customElements.define('grampsjs-view-tree', GrampsjsViewTree)
