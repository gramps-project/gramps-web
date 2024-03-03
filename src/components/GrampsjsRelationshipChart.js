import {html, css} from 'lit'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {RelationshipChart} from '../charts/RelationshipChart.js'
import {getImageUrl} from '../charts/util.js'

class GrampsjsRelationshipChart extends GrampsjsChartBase {
  static get styles() {
    return [
      super.styles,
      css`
        svg a {
          text-decoration: none !important;
        }

        mwc-menu {
          --mdc-typography-subtitle1-font-size: 13px;
          --mdc-menu-item-height: 36px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      nAnc: {type: Number},
      gapX: {type: Number},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.nAnc = 5
    this.gapX = 30
  }

  render() {
    return html` <div id="container">${this.renderChart()}</div> `
  }

  renderChart() {
    if (this.data.length === 0 || !this.grampsId) {
      return ''
    }
    return html`
      ${RelationshipChart(this.data, {
        nAnc: this.nAnc,
        getImageUrl: d => getImageUrl(d?.data?.person || {}, 200),
        gapX: this.gapX,
        bboxWidth: this.containerWidth,
        bboxHeight: this.containerHeight,
      })}
    `
  }
}

window.customElements.define(
  'grampsjs-relationship-chart',
  GrampsjsRelationshipChart
)
