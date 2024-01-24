import {html, css} from 'lit'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'

export class GrampsjsViewRelationshipChart extends GrampsjsViewTreeChartBase {
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
    this.nAnc = 1
    this._setDesc = false
    this.color = ''
  }

  _resetLevels() {
    this.nAnc = 1
  }

  _getPersonRules(grampsId) {
    return {
      function: 'or',
      rules: [
        {
          name: 'DegreesOfSeparation',
          values: [grampsId, this.nAnc + 1],
        },
      ],
    }
  }

  renderChart() {
    return html`${this._data.length}
      <pre>${JSON.stringify(this._data, null, 2)}</pre> `
  }
}

window.customElements.define(
  'grampsjs-view-relationship-chart',
  GrampsjsViewRelationshipChart
)
