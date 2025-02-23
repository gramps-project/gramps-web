import {html, LitElement} from 'lit'

import './GrampsjsTable.js'
import {
  personTitleFromProfile,
  familyTitleFromProfile,
  fireEvent,
} from '../util.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

const columns = [{name: 'Role'}, {name: 'Name'}]

export class GrampsjsParticipants extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {
      data: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  render() {
    return html`
      <grampsjs-table
        naturalWidth
        linked
        .columns=${columns}
        .appState=${this.appState}
        .data=${this._formatData()}
        @table:row-click="${this._handleRowClick}"
      ></grampsjs-table>
    `
  }

  _getData() {
    const familyData = this.data[0].families.map(obj => ({
      link: `family/${obj.family.gramps_id}`,
      role: this._(obj.role),
      objName: familyTitleFromProfile(obj.family) || '',
    }))
    const peopleData = this.data[0].people.map(obj => ({
      link: `person/${obj.person.gramps_id}`,
      role: this._(obj.role),
      objName: personTitleFromProfile(obj.person) || '',
    }))
    return familyData.concat(peopleData)
  }

  _formatData() {
    return this._getData().map(obj => [obj.role, obj.objName])
  }

  _handleRowClick(e) {
    e.preventDefault()
    e.stopPropagation()
    const link = this._getData()?.[e.detail.rowNumber]?.link
    if (link) {
      fireEvent(this, 'nav', {path: link})
    }
  }
}

window.customElements.define('grampsjs-participants', GrampsjsParticipants)
