/*
Element for selecting a Gramps type
*/

import {html, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFormObjectList.js'


class GrampsjsFormSelectObjectList extends LitElement {
  static get styles() {
    return [
      sharedStyles
    ]
  }

  static get properties() {
    return {
      strings: {type: Object},
      objectType: {type: String},
      label: {type: String},
      multiple: {type: Boolean}
    }
  }


  constructor() {
    super()
    this.strings = {}
    this.objectType = ''
    this.label = ''
    this.multiple = false
  }

  render() {
    return html`
    <p>
      <grampsjs-form-object-list
        @object-list:changed="${this._handleObjectListChanged}"
        .strings="${this.strings}"
        id="${this.id}-list"
        ?reorder="${this.multiple}"
      ></grampsjs-form-object-list>
    </p>
    <p>
      <grampsjs-form-select-object
        @select-object:changed="${this._handleSelectObjectsChanged}"
        objectType="${this.objectType}"
        .strings="${this.strings}"
        id="${this.id}-select"
        label="${this.label}"
        ?multiple="${this.multiple}"
      ></grampsjs-form-select-object>
    </p>
`
  }

  // sync element data
  _handleSelectObjectsChanged(e) {
    const objList = this.shadowRoot.querySelector('grampsjs-form-object-list')
    objList.objects = e.detail.objects
  }

  // sync element data
  _handleObjectListChanged(e) {
    const selectObject = this.shadowRoot.querySelector('grampsjs-form-select-object')
    selectObject.objects = e.detail.objects
  }

  reset() {
    this.shadowRoot.querySelectorAll(
      'grampsjs-form-object-list, grampsjs-form-select-object'
    ).forEach(element => element.reset())

  }

}

window.customElements.define('grampsjs-form-select-object-list', GrampsjsFormSelectObjectList)
