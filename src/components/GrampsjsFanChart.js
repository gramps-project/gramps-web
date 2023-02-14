import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {FanChart} from '../charts/FanChart.js'
import {getPersonByGrampsId, getTree} from '../charts/util.js'

class GrampsjsFanChart extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        svg a {
          text-decoration: none !important;
        }

        div#container {
          display: flex;
          justify-content: center;
          align-items: center;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      depth: {type: Number},
      data: {type: Array},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.depth = 5
    this.data = []
  }

  render() {
    if (this.data.length === 0 || !this.grampsId) {
      return ''
    }
    return html`${this.renderChart()}`
  }

  renderChart() {
    const {handle} = getPersonByGrampsId(this.data, this.grampsId)
    if (!handle) {
      return ''
    }
    const data = getTree(this.data, handle, this.depth)
    const radius = this.depth * 60
    const margin = 5
    return html`
      <div id="container">
        ${FanChart(data, {
          margin,
          radius,
          width: 2 * radius + margin,
          height: 2 * radius + margin,
        })}
      </div>
    `
  }
}

window.customElements.define('grampsjs-fan-chart', GrampsjsFanChart)
