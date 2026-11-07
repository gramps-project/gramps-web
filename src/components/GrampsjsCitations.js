import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {handleAppLinkClick} from '../util.js'
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
        @click="${e => {
          if (this.edit) {
            this._handleSelected(i)
          } else {
            this._handleClick(e, obj.gramps_id)
          }
        }}"
      >
        ${obj.page || this._('Citation')}
        <span slot="supporting-text"> ${obj.gramps_id} </span>
        ${renderIcon({object: obj, object_type: 'citation'}, 'start')}
      </md-list-item>
    `
  }

  _handleClick(e, grampsId) {
    if (!this.edit) {
      handleAppLinkClick(e, this._getItemPath(grampsId))
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `citation/${grampsId}`
  }
}

window.customElements.define('grampsjs-citations', GrampsjsCitations)
