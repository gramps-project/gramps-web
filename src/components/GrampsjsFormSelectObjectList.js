/*
Element for selecting a Gramps type
*/

import {html, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFormObjectList.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

class GrampsjsFormSelectObjectList extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [sharedStyles]
  }

  static get properties() {
    return {
      objectType: {type: String},
      objectsInitial: {type: Array},
      label: {type: String},
      multiple: {type: Boolean},
      notDeletable: {type: Boolean},
      fixedMenuPosition: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.objectType = ''
    this.objectsInitial = []
    this.label = ''
    this.multiple = false
    this.notDeletable = false
    this.fixedMenuPosition = false
  }

  render() {
    return html`
      <p>
        <grampsjs-form-object-list
          @object-list:changed="${this._handleObjectListChanged}"
          .strings="${this.strings}"
          id="${this.id}-list"
          ?reorder="${this.multiple}"
          ?deletable="${!this.notDeletable}"
        ></grampsjs-form-object-list>
      </p>
      <p>
        <grampsjs-form-select-object
          ?fixedMenuPosition="${this.fixedMenuPosition}"
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

  firstUpdated() {
    const objList = this.shadowRoot.querySelector('grampsjs-form-object-list')
    if (this.objectsInitial.length > 0) {
      objList.objects = this.objectsInitial
    }
  }

  // sync element data
  _handleSelectObjectsChanged(e) {
    const objList = this.shadowRoot.querySelector('grampsjs-form-object-list')
    objList.objects = e.detail.objects
  }

  // sync element data
  _handleObjectListChanged(e) {
    const selectObject = this.shadowRoot.querySelector(
      'grampsjs-form-select-object'
    )
    selectObject.objects = e.detail.objects
  }

  reset() {
    this.shadowRoot
      .querySelectorAll(
        'grampsjs-form-object-list, grampsjs-form-select-object'
      )
      .forEach(element => element.reset())
  }
}

window.customElements.define(
  'grampsjs-form-select-object-list',
  GrampsjsFormSelectObjectList
)
