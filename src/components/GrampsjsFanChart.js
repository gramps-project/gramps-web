import {html, css} from 'lit'

import {FanChart} from '../charts/FanChart.js'
import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {getPersonByGrampsId, getTree} from '../charts/util.js'

class GrampsjsFanChart extends GrampsjsChartBase {
  static get styles() {
    return [
      super.styles,
      css`
        svg a {
          text-decoration: none !important;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      depth: {type: Number},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.depth = 5
  }

  renderChart() {
    if (this.data.length === 0 || !this.grampsId) {
      return ''
    }
    const {handle} = getPersonByGrampsId(this.data, this.grampsId)
    if (!handle) {
      return ''
    }
    const data = getTree(this.data, handle, this.depth)
    const arcRadius = 60
    return html`
      ${FanChart(data, {
        depth: this.depth,
        arcRadius,
        bboxWidth: this.containerWidth,
        bboxHeight: this.containerHeight,
      })}
    `
  }
}

window.customElements.define('grampsjs-fan-chart', GrampsjsFanChart)
