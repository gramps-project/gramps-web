import {html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../views/GrampsjsViewPedigree.js'

export class GrampsjsViewTree extends GrampsjsView {
  static get properties () {
    return {
      grampsId: {type: String},
      _history: {type: Array}
    }
  }

  constructor () {
    super()
    this.grampsId = ''
    this._history = []
  }

  renderContent () {
    return html`
      <grampsjs-view-pedigree
        grampsId=${this.grampsId}
        ?active=${this.active}
        .strings=${this.strings}
        .settings=${this.settings}
      >
      </grampsjs-view-pedigree>
    `
  }

  _prevPerson () {
    this._history.pop()
    this.grampsId = this._history.pop()
  }

  _backToHomePerson () {
    this.grampsId = this.settings.homePerson
  }

  firstUpdated () {
    window.addEventListener('pedigree:person-selected', this._selectPerson.bind(this))
  }

  async _selectPerson (event) {
    const {grampsId} = event.detail
    this.grampsId = grampsId
  }
}

window.customElements.define('grampsjs-view-tree', GrampsjsViewTree)
