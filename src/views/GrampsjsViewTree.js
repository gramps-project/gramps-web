import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../views/GrampsjsViewGraph.js'
import '../views/GrampsjsViewPedigree.js'
import {fireEvent} from '../util.js'

export class GrampsjsViewTree extends GrampsjsView {
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
      view: {type: String},
      _history: {type: Array}
    }
  }

  constructor () {
    super()
    this.grampsId = ''
    this.view = 'pedigree'
    this._history = []
  }

  renderContent () {
    return html`
    ${this.view === 'pedigree' ? this._renderPedigree() : ''}
    ${this.view === 'graph' ? this._renderGraph() : ''}
    `
  }

  _renderPedigree () {
    return html`
    <grampsjs-view-pedigree
      @tree:back="${this._prevPerson}"
      @tree:person="${this._goToPerson}"
      @tree:home="${this._backToHomePerson}"
      grampsId=${this.grampsId}
      ?active=${this.active}
      .strings=${this.strings}
      .settings=${this.settings}
      ?disableBack=${this._history.length < 2}
      ?disableHome=${this.grampsId === this.settings.homePerson}
    >
    </grampsjs-view-pedigree>
    `
  }

  _renderGraph () {
    return html`
    <grampsjs-view-graph
      @tree:back="${this._prevPerson}"
      @tree:person="${this._goToPerson}"
      @tree:home="${this._backToHomePerson}"
      grampsId=${this.grampsId}
      ?active=${this.active}
      .strings=${this.strings}
      .settings=${this.settings}
      ?disableBack=${this._history.length < 2}
      ?disableHome=${this.grampsId === this.settings.homePerson}
    >
    </grampsjs-view-graph>
    `
  }

  _prevPerson () {
    this._history.pop()
    this.grampsId = this._history.pop()
  }

  _backToHomePerson () {
    this.grampsId = this.settings.homePerson
  }

  _goToPerson () {
    fireEvent(this, 'nav', {path: `person/${this.grampsId}`})
  }

  firstUpdated () {
    window.addEventListener('pedigree:person-selected', this._selectPerson.bind(this))
  }

  update (changed) {
    super.update(changed)
    if (changed.has('grampsId')) {
      this._history.push(this.grampsId)
      // limit history to 100 people
      this._history = this._history.slice(-100)
    }
  }

  async _selectPerson (event) {
    const {grampsId} = event.detail
    this.grampsId = grampsId
  }
}

window.customElements.define('grampsjs-view-tree', GrampsjsViewTree)
