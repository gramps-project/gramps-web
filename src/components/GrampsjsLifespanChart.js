import {html, css} from 'lit'
import {zoomTransform} from 'd3-zoom'

import {LifespanChart} from '../charts/LifespanChart.js'
import {GrampsjsChartBase} from './GrampsjsChartBase.js'

class GrampsjsLifespanChart extends GrampsjsChartBase {
  static get styles() {
    return [
      super.styles,
      css`
        div#container {
          display: block;
          height: auto;
          max-height: calc(100vh - 165px);
          overflow-y: auto;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      depth: {type: Number},
      familyEvents: {type: Object},
      nameDisplayFormat: {type: String},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.depth = 4
    this.familyEvents = {}
    this.nameDisplayFormat = ''
    this._savedZoom = null
  }

  willUpdate() {
    const svg = this.renderRoot
      ?.getElementById('container')
      ?.querySelector('svg')
    this._savedZoom = svg ? zoomTransform(svg) : null
  }

  renderChart() {
    if (this.data.length === 0 || !this.grampsId) {
      return ''
    }
    return html`
      ${LifespanChart(this.data, {
        grampsId: this.grampsId,
        depth: this.depth,
        familyEvents: this.familyEvents,
        bboxWidth: this.containerWidth,
        bboxHeight: this.containerHeight,
        strings: this.appState.i18n.strings,
        initialZoom: this._savedZoom,
        nameDisplayFormat: this.nameDisplayFormat,
      })}
    `
  }
}

window.customElements.define('grampsjs-lifespan-chart', GrampsjsLifespanChart)
