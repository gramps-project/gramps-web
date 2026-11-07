import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {renderIcon} from '../objectRender.js'

export class GrampsjsCitations extends GrampsjsEditableList {
  constructor() {
    super()
    this.objType = 'Citation'
  }

  row(obj, i) {
    return html`
      <md-list-item
        type="${this.edit ? 'button' : 'link'}"
        href="${this.edit ? '' : `/${this._getItemPath(obj.gramps_id)}`}"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
      >
        ${obj.page || this._('Citation')}
        <span slot="supporting-text"> ${obj.gramps_id} </span>
        ${renderIcon({object: obj, object_type: 'citation'}, 'start')}
      </md-list-item>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `citation/${grampsId}`
  }
}

window.customElements.define('grampsjs-citations', GrampsjsCitations)
