import {html, css} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import {chartNameDisplayFormat} from '../util.js'
import '../components/GrampsjsRelationshipChart.js'

export class GrampsjsViewRelationshipChart extends GrampsjsViewTreeChartBase {
  DefaultNAnc = 2

  DefaultNMaxImages = 50

  DefaultNameDisplayFormat = chartNameDisplayFormat.surnameThenGiven

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
    this.nAnc = this.DefaultNAnc
    this.nMaxImages = this.DefaultNMaxImages
    this.nameDisplayFormat = this.DefaultNameDisplayFormat
  }

  _resetLevels() {
    this.nAnc = this.DefaultNAnc
    this.nMaxImages = this.DefaultNMaxImages
    this.nameDisplayFormat = this.DefaultNameDisplayFormat
    this.persistAnc()
    this.persistMaxImages()
    this.persistNameDisplayFormat()
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

  persistAnc() {
    this.appState.updateSettings({relationshipChartAnc: this.nAnc}, false)
  }

  persistMaxImages() {
    this.appState.updateSettings(
      {relationshipChartMaxImages: this.nMaxImages},
      false
    )
  }

  persistNameDisplayFormat() {
    this.appState.updateSettings(
      {relationshipChartNameDisplayFormat: this.nameDisplayFormat},
      false
    )
  }

  willUpdate() {
    this.nAnc = this.appState.settings.relationshipChartAnc ?? this.DefaultNAnc
    this.nMaxImages =
      this.appState.settings.relationshipChartMaxImages ??
      this.DefaultNMaxImages
    this.nameDisplayFormat =
      this.appState.settings.relationshipChartNameDisplayFormat ??
      this.DefaultNameDisplayFormat
  }

  renderControls() {
    return super.renderControls()
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
