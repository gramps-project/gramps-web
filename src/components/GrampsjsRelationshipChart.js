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
        svg .personBox {
          fill: var(--grampsjs-color-shade-230);
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
      nMaxImages: {type: Number},
      gapX: {type: Number},
      nameDisplayFormat: {type: String},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
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
        maxImages: this.nMaxImages,
        grampsId: this.grampsId,
        getImageUrl: d => getImageUrl(d?.data || {}, 200),
        gapX: this.gapX,
        bboxWidth: this.containerWidth,
        bboxHeight: this.containerHeight,
        nameDisplayFormat: this.nameDisplayFormat,
      })}
    `
  }
}

window.customElements.define(
  'grampsjs-relationship-chart',
  GrampsjsRelationshipChart
)
