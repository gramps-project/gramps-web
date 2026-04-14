import {html} from 'lit'

import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import './GrampsjsChildren.js'

export class GrampsjsConnectedChildren extends GrampsjsConnectedComponent {
  static get properties() {
    return {
      ...super.properties,
      familyGrampsId: {type: String},
      profile: {type: Array},
      data: {type: Array},
      highlightId: {type: String},
      edit: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.familyGrampsId = ''
    this.profile = []
    this.data = []
    this.highlightId = ''
    this.edit = false
  }

  getUrl() {
    if (!this.familyGrampsId) return ''
    return `/api/families/?gramps_id=${this.familyGrampsId}&extend=child_ref_list`
  }

  _renderChildrenList(extended) {
    return html`<grampsjs-children
      .profile=${this.profile}
      .data=${this.data}
      .extended=${extended}
      .appState="${this.appState}"
      highlightId="${this.highlightId}"
      ?edit=${this.edit}
    ></grampsjs-children>`
  }

  renderContent() {
    return this._renderChildrenList(
      this._data?.data?.[0]?.extended?.children || []
    )
  }

  // Show the full list immediately with icons; thumbnails patch in after fetch
  renderLoading() {
    return this._renderChildrenList([])
  }
}

window.customElements.define(
  'grampsjs-connected-children',
  GrampsjsConnectedChildren
)
