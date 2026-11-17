import {css, html} from 'lit'
import {select} from 'd3-selection'

import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import {RelationshipChart} from '../charts/RelationshipChart.js'
import {FamilyGraph} from '../charts/model/FamilyGraph.js'
import {GrampsjsChartCanvasMixin} from '../mixins/GrampsjsChartCanvasMixin.js'
import {GrampsjsResizeContainerMixin} from '../mixins/GrampsjsResizeContainerMixin.js'
import {getImageUrl} from '../charts/util.js'
import {chartPalette} from '../charts/palette.js'
import {fitMargin} from '../charts/ChartViewport.js'
import {fireEvent} from '../util.js'

const palette = {
  ...chartPalette,
  personBox: 'var(--grampsjs-connection-chart-person-box)',
}

// Height in pixels of a container `width` pixels wide that shows the whole
// chart with `bounds` when fitted, between `minHeight` and `maxHeight`
export function fittedHeight(bounds, width, {minHeight, maxHeight}) {
  const chartWidth = bounds.xMax - bounds.xMin + 2 * fitMargin
  const chartHeight = bounds.yMax - bounds.yMin + 2 * fitMargin
  const scale = Math.min(1, width / chartWidth)
  return Math.round(
    Math.min(maxHeight, Math.max(minHeight, chartHeight * scale))
  )
}

// The chart is part of a scrolling page: it is as high as its content and
// does not zoom or pan, so that the page scrolls over it
export class GrampsjsConnectionChart extends GrampsjsChartCanvasMixin(
  GrampsjsResizeContainerMixin(GrampsjsConnectedComponent)
) {
  static get styles() {
    return [
      super.styles,
      css`
        div#container {
          overflow: hidden;
          width: 100%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId1: {type: String},
      grampsId2: {type: String},
      initialHeight: {type: Number},
      minHeight: {type: Number},
    }
  }

  constructor() {
    super()
    this.grampsId1 = ''
    this.grampsId2 = ''
    this.initialHeight = 400
    this.minHeight = 100
    // The height of the container, fitted to the chart
    this._height = null
    this._chart = new RelationshipChart()
    // No zoom or pan with the wheel, mouse or touch
    select(this._chart.node).on('.zoom', null).style('touch-action', null)
    this._otherHandle = null
  }

  renderContent() {
    if (this._data?.data?.length === 0 || !this.grampsId1 || !this.grampsId2) {
      return ''
    }
    // A card click opens the person's page, like a link
    return html`
      <div
        id="container"
        style="height: ${this._containerHeight()}"
        @pedigree:person-selected="${this._handlePersonSelected}"
      ></div>
    `
  }

  renderLoading() {
    return html` <div
      id="container"
      style="height: ${this._containerHeight()}"
      class="skeleton"
    ></div>`
  }

  _handlePersonSelected(e) {
    e.stopPropagation()
    fireEvent(this, 'nav', {path: `person/${e.detail.grampsId}`})
  }

  _containerHeight() {
    return this._height ?? `${this.initialHeight}px`
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    if (!['_data', 'grampsId1', 'grampsId2'].some(name => changed.has(name))) {
      return
    }
    const graph = new FamilyGraph(this._data?.data ?? [])
    const root = graph.personByGrampsId(this.grampsId1)
    this._otherHandle = graph.personByGrampsId(this.grampsId2)?.handle ?? null
    if (root) {
      this._requestRelationshipLayout(graph, root.handle)
    } else {
      this._clearRelationshipLayout()
    }
  }

  updated(changed) {
    super.updated(changed)
    const container = this.renderRoot.getElementById('container')
    if (!container || this.loading) {
      return
    }
    // The container is created again when loading ends
    if (this._chart.node.parentNode !== container) {
      container.append(this._chart.node)
    }
    if (!this._layout) {
      this._chart.clear()
      return
    }
    // The container is just high enough for the chart at full size, or
    // zoomed out to fit the width
    if (this.containerWidth > 0) {
      const height = fittedHeight(this._layout.bounds, this.containerWidth, {
        minHeight: this.minHeight,
        maxHeight: Infinity,
      })
      this._height = `${height}px`
      container.style.height = this._height
    }
    this._chart.update(this._layout, {
      ...this.chartOptions(),
      bboxHeight: container.offsetHeight,
    })
    this._chart.viewport.fit()
  }

  chartOptions() {
    return {
      getImageUrl: node => getImageUrl(node.person, 100),
      nameDisplayFormat: this.nameDisplayFormat,
      palette,
      // Both people the chart connects stand out
      shadowHandles: this._otherHandle ? [this._otherHandle] : [],
      fit: true,
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getUrl() {
    const rules = {
      rules: [
        {
          name: 'RelationshipPathBetween',
          values: [this.grampsId1, this.grampsId2],
        },
      ],
    }
    return `/api/people/?rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=self&extend=event_ref_list,primary_parent_family,family_list,parent_family_list`
  }
}

window.customElements.define(
  'grampsjs-connection-chart',
  GrampsjsConnectionChart
)
