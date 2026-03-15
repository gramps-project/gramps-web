/*
Form for adding a new person to family tree
*/

import {html} from 'lit'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import './GrampsjsFormNewPerson.js'

class GrampsjsAddPersonToTree extends GrampsjsObjectForm {
  constructor() {
    super()
    console.log('data GrampsjsAddPersonToTree')
  }

  render() {
    return html`
      <grampsjs-form-new-person
        .appState="${this.appState}"
      ></grampsjs-form-new-person>
    `
  }
}

window.customElements.define(
  'grampsjs-add-person-to-tree',
  GrampsjsAddPersonToTree
)
