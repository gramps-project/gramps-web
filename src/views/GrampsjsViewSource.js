import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsSource.js'


export class GrampsjsViewSource extends GrampsjsViewObject {

  constructor() {
    super()
    this._className = 'source'
  }

  getUrl() {
    return `/api/sources/?gramps_id=${this.grampsId}&locale=${this.strings?.__lang__ || 'en'}&profile=all&backlinks=true&extend=all`
  }

  renderElement() {
    return html`
    <grampsjs-source .data=${this._data} .strings=${this.strings}></grampsjs-source>
    `
  }

}


window.customElements.define('grampsjs-view-source', GrampsjsViewSource)
