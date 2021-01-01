import {html, css} from 'lit-element'

import {GrampsjsView} from './GrampsjsView.js'
import './GrampsjsViewRecentlyChanged.js'
import '../components/GrampsjsStatistics.js'


export class GrampsjsViewDashboard extends GrampsjsView {


  static get properties() {
    return {
      dbInfo: {type: Object},
    }
  }

  constructor() {
    super()
    this.dbInfo = {}
  }

  static get styles() {
    return [
      super.styles,
      css`
      .column {
        float: left;
        width: 50%;
        overflow-x: hidden;
      }

      @media screen and (max-width: 768px) {
        .column {
          width: 100%;
        }
      }
      `
    ]
  }


  renderContent() {
    return html`
    <div class="column">
      <grampsjs-statistics
        .data="${this.dbInfo?.object_counts || {}}"
        id="statistics"
        .strings="${this.strings}">
      </grampsjs-statistics>
    </div>
    <div class="column">
      <grampsjs-view-recently-changed
        active
        id="recently-changed"
        .strings="${this.strings}">
      </grampsjs-view-recently-changed>
    </div>
      `
  }

}


window.customElements.define('grampsjs-view-dashboard', GrampsjsViewDashboard)
