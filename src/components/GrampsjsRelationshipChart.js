import {html, css} from 'lit'
import {select} from 'd3-selection'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {RelationshipChart} from '../charts/RelationshipChart.js'
import {appendAddPersonButton} from '../charts/addPersonButton.js'
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
      canEdit: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.gapX = 30
    // key used to detect when chart needs to be fully re-rendered
    this._chartKey = ''
  }

  render() {
    return html` <div id="container"></div> `
  }

  // Returns a string that identifies the current chart configuration (excluding canEdit).
  // When this changes, the chart is re-rendered from scratch.
  _getChartKey() {
    return [
      this.grampsId,
      this.nAnc,
      this.nMaxImages,
      this.nameDisplayFormat,
      this.containerWidth,
      this.containerHeight,
      this.data.length,
    ].join('|')
  }

  updated(changedProps) {
    super.updated(changedProps)
    const needsFullRender =
      this.data.length > 0 &&
      this.grampsId &&
      this._getChartKey() !== this._chartKey

    if (needsFullRender) {
      this._chartKey = this._getChartKey()
      this._renderChartImperatively()
    } else if (changedProps.has('canEdit') && !needsFullRender) {
      // Chart is already rendered — just add or remove the + buttons
      this._updateAddPersonButtons()
    }
  }

  _renderChartImperatively() {
    const container = this.renderRoot.getElementById('container')
    if (!container) {
      return
    }
    container.innerHTML = ''
    const svgNode = RelationshipChart(this.data, {
      nAnc: this.nAnc,
      maxImages: this.nMaxImages,
      grampsId: this.grampsId,
      getImageUrl: d => getImageUrl(d?.data || {}, 100),
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
      nameDisplayFormat: this.nameDisplayFormat,
      // Always render without buttons first; buttons are added via
      // _updateAddPersonButtons after Graphviz resolves.
      canEdit: false,
      onReady: () => {
        if (this.canEdit) {
          this._updateAddPersonButtons()
        }
      },
    })
    container.appendChild(svgNode)
  }

  _updateAddPersonButtons() {
    const container = this.renderRoot.getElementById('container')
    if (!container) {
      return
    }
    const svg = container.querySelector('svg')
    if (!svg) {
      return
    }
    const svgSel = select(svg)
    // Remove any existing buttons first to avoid duplicates
    svgSel.selectAll('.add-person-btn, .add-person-text').remove()
    if (this.canEdit) {
      const personNodes = svgSel.selectAll('g.node.person')
      appendAddPersonButton(personNodes, 190 - 13, 90 - 13, d => d.handle)
    }
  }
}

window.customElements.define(
  'grampsjs-relationship-chart',
  GrampsjsRelationshipChart
)
