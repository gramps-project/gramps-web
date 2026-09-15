import {html, css} from 'lit'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {GrampsjsChartBase} from './GrampsjsChartBase.js'
import {RelationshipChart} from '../charts/RelationshipChart.js'
import {layoutRelationships} from '../charts/layout/relationshipLayout.js'
import {getImageUrl} from '../charts/util.js'
import {getSymbols} from '../symbols.js'
import {fireEvent} from '../util.js'

// Duration of the transition between two layouts, in milliseconds
const transitionDuration = 400

class GrampsjsRelationshipChart extends GrampsjsChartBase {
  static get styles() {
    return [
      super.styles,
      css`
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
    this._chart = new RelationshipChart()
    this._layout = null
    this._layoutRequest = 0
  }

  render() {
    return html`<div id="container"></div>`
  }

  firstUpdated() {
    super.firstUpdated()
    this.renderRoot.getElementById('container').append(this._chart.node)
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    if (!changed.has('data') && !changed.has('grampsId')) {
      return
    }
    // A selected person who is not in the data yet is still being fetched, so
    // the current chart stays until new data arrives. If the new data does not
    // contain them either, the chart is cleared.
    const root = this._graph.personByGrampsId(this.grampsId)
    if (root) {
      this._requestLayout(root.handle)
    } else if (changed.has('data')) {
      this._layoutRequest += 1
      this._layout = null
    }
  }

  updated() {
    if (!this._layout) {
      this._chart.clear()
      return
    }
    this._chart.update(this._layout, {
      getImageUrl: node => getImageUrl(node.person, 100),
      maxImages: this.nMaxImages,
      nameDisplayFormat: this.nameDisplayFormat,
      canEdit: this.canEdit,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : transitionDuration,
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
    })
  }

  // Lays out the chart in the background. The current chart stays until the
  // layout is ready, and a layout that is ready after a newer one was
  // requested is ignored. If the layout fails, the chart is cleared and an
  // error is reported.
  async _requestLayout(rootHandle) {
    this._layoutRequest += 1
    const request = this._layoutRequest
    let layout = null
    try {
      layout = await layoutRelationships(this._graph, rootHandle)
    } catch (error) {
      if (request === this._layoutRequest) {
        fireEvent(this, 'grampsjs:error', {message: error.message})
      }
    }
    if (request === this._layoutRequest) {
      this._layout = layout
      this.requestUpdate()
    }
  }
}

window.customElements.define(
  'grampsjs-relationship-chart',
  GrampsjsRelationshipChart
)
