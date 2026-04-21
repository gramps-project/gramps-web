import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiBookOpenVariant} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsIcon.js'
import './GrampsjsImg.js'
import {fireEvent, renderIcon} from '../util.js'

export class GrampsjsSources extends GrampsjsEditableList {
  static get properties() {
    return {
      handle: {type: String},
    }
  }

  constructor() {
    super()
    this.objType = 'Source'
    this.handle = ''
    this.hasAdd = false
  }

  _getRepoRef(obj) {
    if (!this.handle) return {}
    return obj.reporef_list?.find(r => r.ref === this.handle) || {}
  }

  row(obj, i) {
    const repoRef = this._getRepoRef(obj)
    return html`
      <md-list-item
        type="button"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => this._handleClick(obj.gramps_id)}"
      >
        ${obj.title}
        ${repoRef.call_number || repoRef.media_type
          ? html`<span slot="supporting-text"
              >${[repoRef.call_number, this._(repoRef.media_type ?? '')]
                .filter(Boolean)
                .join(' • ')}</span
            >`
          : ''}
        ${renderIcon(
          {object: obj, object_type: 'source'},
          'start',
          mdiBookOpenVariant
        )}
      </md-list-item>
    `
  }

  _handleClick(grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `source/${grampsId}`
  }
}

window.customElements.define('grampsjs-sources', GrampsjsSources)
