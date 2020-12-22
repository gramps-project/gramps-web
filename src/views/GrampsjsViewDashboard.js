import {html} from 'lit-element'

import {GrampsjsView} from './GrampsjsView.js'


export class GrampsjsViewDashboard extends GrampsjsView {

  constructor() {
    super()
  }


  renderContent() {
    return html`
    Dashboard
    `
  }

}


window.customElements.define('grampsjs-view-dashboard', GrampsjsViewDashboard)
