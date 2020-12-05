import { html } from 'lit-element';

import { GrampsjsViewObject } from './GrampsjsViewObject.js'
import '../components/GrampsjsPerson.js'


export class GrampsjsViewPerson extends GrampsjsViewObject {


  getUrl() {
    return `/api/people/?gramps_id=${this.grampsId}&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
    <grampsjs-person .data=${this._data} .strings=${this.strings}></grampsjs-person>
    `
  }

}


window.customElements.define('grampsjs-view-person', GrampsjsViewPerson);
