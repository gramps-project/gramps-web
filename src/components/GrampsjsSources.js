import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiBookOpenVariant} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsIcon.js'
import './GrampsjsImg.js'
import {renderIcon} from '../objectRender.js'

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
        type="${this.edit ? 'button' : 'link'}"
        href="${this.edit ? '' : `/${this._getItemPath(obj.gramps_id)}`}"
        class="${classMap({selected: i === this._selectedIndex})}"
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

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `source/${grampsId}`
  }
}

window.customElements.define('grampsjs-sources', GrampsjsSources)
