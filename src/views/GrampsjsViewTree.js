import {css, html} from 'lit'

import '@material/mwc-icon-button'
import '@material/mwc-icon'

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

      .with-margin {
        margin: 25px 40px;
      }

      #outer-container {
        height: calc(100vh - 68px);
      }

      #select {
        z-index: 1;
        position: absolute;
        top: 85px;
        right: 25px;
        border-radius: 5px;
        background-color: rgba(255, 255, 255, 0.9);
        color: #b1b1b1;
        --mdc-theme-text-disabled-on-light: #666;
        --mdc-icon-size: 32px;
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
    this._history = this.grampsId ? [this.grampsId] : []
  }

  renderContent () {
    if (this.grampsId === '') {
      // This should actually never happen, so don't bother translating!
      return html`
      <div class="with-margin">
        <p>${this._('No Home Person set.')} <a href="/settings">${this._('User settings')}</a></p>
      </div>
      `
    }
    return html`
    ${this.view === 'pedigree' ? this._renderPedigree() : ''}
    ${this.view === 'graph' ? this._renderGraph() : ''}
    ${this._renderSelect()}
    `
  }

  _renderSelect () {
    return html`
    <div id="select">
      <mwc-icon-button
        ?disabled=${this.view === 'pedigree'}
        @click=${() => { this.view = 'pedigree' }}
        icon="text_rotation_none"
        style="margin-left: -5px;"
      ></mwc-icon-button>
      <mwc-icon-button
        ?disabled=${this.view === 'graph'}
        @click=${() => { this.view = 'graph' }}
        icon="text_rotate_vertical"
        ></mwc-icon-button>
    </div>
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

  _handleSelect (event) {
    if (event.detail.index === 0) {
      this.view = 'pedigree'
    } else if (event.detail.index === 1) {
      this.view = 'graph'
    }
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

  connectedCallback () {
    super.connectedCallback()
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
