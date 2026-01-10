import {html, css} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {chartNameDisplayFormat} from '../util.js'
import '../components/GrampsjsRelationshipChart.js'

export class GrampsjsViewRelationshipChart extends GrampsjsViewTreeChartBase {
  DefaultNAnc = 8

  DefaultNMaxImages = 100

  DefaultNameDisplayFormat = chartNameDisplayFormat.givenThenSurname

  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
        }
      `,
    ]
  }

  constructor() {
    super()
    this._setSep = true
    this._setMaxImages = true
    this.color = ''
    this._resetLevels()
  }

  _resetLevels() {
    this.nAnc = this.DefaultNAnc
    this.nMaxImages = this.DefaultNMaxImages
    this.nameDisplayFormat = this.DefaultNameDisplayFormat
  }

  _getPersonRules(grampsId) {
    return {
      function: 'or',
      rules: [
        {
          name: 'DegreesOfSeparation',
          values: [grampsId, this.nAnc],
        },
      ],
    }
  }

  renderChart() {
    return html`
      <grampsjs-relationship-chart
        grampsId=${this.grampsId}
        nAnc=${this.nAnc + 1}
        nMaxImages=${this.nMaxImages}
        nameDisplayFormat=${this.nameDisplayFormat}
        .data=${this._data}
      >
      </grampsjs-relationship-chart>
    `
  }
}

window.customElements.define(
  'grampsjs-view-relationship-chart',
  GrampsjsViewRelationshipChart
)
