import {html, css} from 'lit-element'
import '@material/mwc-slider'
import '@material/mwc-button'
import '@material/mwc-icon'

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
        float: left;
        margin-right: 20px;
      }

      #button-block {
        float: left;
        position: relative;
        top: 10px;
      }

      #pedigree-container {
        clear: left;
      }

      #slider-block span {
        vertical-align: middle;
        display: inline-block;
        padding-right: 1em;
      }

      .slider-container {
        height: 48px;
      }

      mwc-button {
        --mdc-ripple-focus-opacity: 0;
        --mdc-theme-primary: rgba(0, 0, 0, 0.7);
      }

      #outer-container {
        clear: left;
        padding-top: 30px;
      }
    `]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      _data: {type: Array},
      _depth: {type: Number},
      _zoom: {type: Number},
      _history: {type: Array}
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this._data = []
    this._depth = 3
    this._zoom = 1
    this._history = []
  }

  renderContent() {
    if (this.grampsId === '') {
      // This should actually never happen, so don't bother translating!
      return html`
      No home person selected. <a href="/settings">Settings</a>
      `
    }
    if (this._data.length === 0) {
      return html``
    }
    return html`
    <section id="pedigree-section">

      <div id="controls">
        <div id="slider-block">
          <span class="label">${this._('Number of generations:')}</span>
          <span class="slider-container"><mwc-slider
              value="${this._depth}"
              min="2"
              max="6"
              step="1"
              @change="${this._updateDepth}"
              id="slider"
              pin
              ></mwc-slider></span>
        </div>
        <div id="button-block">
          <mwc-button outlined
            id="btn-back"
            @click="${this._prevPerson}"
            ?disabled="${this._history.length < 2}"
            icon="undo"></mwc-button>
          <mwc-button outlined id="btn-home"
            @click="${this._backToHomePerson}"
            ?disabled="${this.grampsId === this.settings.homePerson}"
            >${this._('Home Person')}</mwc-button>
        </div>
      </div>
      <div id="outer-container">
        <div style="transform: scale(${this._zoom}); transform-origin: top left;" id="pedigree-container">
          <grampsjs-pedigree
            .people="${this._data}"
            grampsId="${this.grampsId}"
            depth="${this._depth}"
            id="pedigree"
            ></grampsjs-pedigree>
        </div>
      </div>
    </section>
  `
  }

  _prevPerson() {
    this._history.pop()
    this.grampsId = this._history.pop()
  }

  _backToHomePerson() {
    this.grampsId = this.settings.homePerson
  }

  update(changed) {
    super.update(changed)
    if (changed.has('grampsId')) {
      this._fetchData(this.grampsId)
      this._history.push(this.grampsId)
      // limit history to 100 people
      this._history = this._history.slice(-100)
    }
    if (changed.has('_depth')) {
      this.setZoom()
      this._fetchData(this.grampsId)
    }
    if (changed.has('active')) {
      this.setZoom()
      const slider = this.shadowRoot.getElementById('slider')
      if (slider){
        slider.layout()
      }
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
    const data = await apiGet(`/api/people/?rules=${encodeURIComponent(JSON.stringify(rules))}&locale=${this.strings?.__lang__ || 'en'}&profile=self,families`)
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
    this._fetchData(this.grampsId)
  }

  async _selectPerson(event) {
    const {grampsId} = event.detail
    await this._fetchData(grampsId)
    this.grampsId = grampsId
  }

}


window.customElements.define('grampsjs-view-tree', GrampsjsViewTree)
