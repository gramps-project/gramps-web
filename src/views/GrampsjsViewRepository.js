import { html } from 'lit';

import { GrampsjsViewObject } from './GrampsjsViewObject.js'
import '../components/GrampsjsRepository.js'


export class GrampsjsViewRepository extends GrampsjsViewObject {

  constructor() {
    super()
    this._className = 'repository'
  }

  getUrl() {
    return `/api/repositories/?gramps_id=${this.grampsId}&locale=${this.strings?.__lang__ || 'en'}&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
    <grampsjs-repository .data=${this._data} .strings=${this.strings} ?edit="${this.edit}"></grampsjs-repository>
    `
  }

}


window.customElements.define('grampsjs-view-repository', GrampsjsViewRepository)
