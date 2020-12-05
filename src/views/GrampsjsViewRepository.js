import { html } from 'lit-element';

import { GrampsjsViewObject } from './GrampsjsViewObject.js'
import '../components/GrampsjsRepository.js'


export class GrampsjsViewRepository extends GrampsjsViewObject {

  constructor() {
    super()
    this._className = 'repository'
  }

  getUrl() {
    return `/api/repositories/?gramps_id=${this.grampsId}&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
    <grampsjs-repository .data=${this._data} .strings=${this.strings}></grampsjs-repository>
    `
  }

}


window.customElements.define('grampsjs-view-repository', GrampsjsViewRepository)
