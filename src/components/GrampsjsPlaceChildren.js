import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {fireEvent, renderIcon, placeTypeIconPath} from '../util.js'

export class GrampsjsPlaceChildren extends GrampsjsEditableList {
  constructor() {
    super()
    this.hasAdd = false
    this.objType = 'Place'
  }

  row(obj, i) {
    const name = obj.name?.value || obj.title || ''
    const type = obj.place_type
    return html`
      <md-list-item
        type="button"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          } else {
            this._handleClick(obj.gramps_id)
          }
        }}"
      >
        ${name}
        ${type ? html`<span slot="supporting-text">${this._(type)}</span>` : ''}
        ${renderIcon(
          {object: obj, object_type: 'place'},
          'start',
          placeTypeIconPath[type] || null
        )}
      </md-list-item>
    `
  }

  _handleClick(grampsId) {
    fireEvent(this, 'nav', {path: `place/${grampsId}`})
  }
}

window.customElements.define('grampsjs-place-children', GrampsjsPlaceChildren)
