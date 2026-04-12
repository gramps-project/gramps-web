import {html} from 'lit'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {
  fireEvent,
  objectDescription,
  objectDetail,
  objectTypePlural,
  renderIcon,
} from '../util.js'

export class GrampsjsReferences extends GrampsjsEditableList {
  static get properties() {
    return {
      profile: {type: Object},
    }
  }

  constructor() {
    super()
    this.profile = {}
    this.hasAdd = false
  }

  render() {
    if (
      this.data.length === 0 ||
      !this.data[0] ||
      Object.keys(this.data[0]).length === 0
    ) {
      return html``
    }
    return html`
      ${Object.keys(this.data[0]).map(
        type => html`
          <h4>${this._(objectTypePlural[type] || type)}</h4>
          <md-list>
            ${this.data[0][type].map((obj, index) => {
              const merged = {
                ...obj,
                profile: this.profile[type]?.[index] || {},
              }
              const desc = objectDescription(
                type,
                merged,
                this.appState.i18n.strings
              )
              const detail = objectDetail(
                type,
                merged,
                this.appState.i18n.strings
              ).trim()
              return html`
                <md-list-item
                  type="button"
                  @click="${() => this._handleClick(type, obj.gramps_id)}"
                >
                  <span>${desc}</span>
                  <span slot="supporting-text">${detail || obj.gramps_id}</span>
                  ${renderIcon({object: obj, object_type: type}, 'start')}
                </md-list-item>
              `
            })}
          </md-list>
        `
      )}
    `
  }

  _handleClick(type, grampsId) {
    fireEvent(this, 'nav', {path: this._getItemPath(type, grampsId)})
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(type, grampsId) {
    return `${type}/${grampsId}`
  }
}

window.customElements.define('grampsjs-references', GrampsjsReferences)
