import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {placeTypeIconPath} from '../util.js'
import {renderIcon} from '../objectRender.js'

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
        type="${this.edit ? 'button' : 'link'}"
        href="${this.edit ? '' : `/place/${obj.gramps_id}`}"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
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
}

window.customElements.define('grampsjs-place-children', GrampsjsPlaceChildren)
