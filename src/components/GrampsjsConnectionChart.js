import {css, html} from 'lit'

import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import {RelationshipChart} from '../charts/RelationshipChart.js'
import {FamilyGraph} from '../charts/model/FamilyGraph.js'
import {GrampsjsChartCanvasMixin} from '../mixins/GrampsjsChartCanvasMixin.js'
import {GrampsjsResizeContainerMixin} from '../mixins/GrampsjsResizeContainerMixin.js'
import {getImageUrl} from '../charts/util.js'
import {chartPalette} from '../charts/palette.js'
import {fitMargin} from '../charts/ChartViewport.js'

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

export class GrampsjsConnectionChart extends GrampsjsChartCanvasMixin(
  GrampsjsResizeContainerMixin(GrampsjsConnectedComponent)
) {
  static get styles() {
    return [
      super.styles,
      css`
        div#container {
          border: 2px solid var(--grampsjs-connection-chart-border-color);
          border-radius: 16px;
          overflow: hidden;
          width: 100%;
          resize: vertical;
        }

        /* Clicking a card does nothing here */
        div#container .node {
          cursor: default !important;
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
      maxHeight: {type: Number},
    }
  }

  constructor() {
    super()
    this.grampsId1 = ''
    this.grampsId2 = ''
    this.initialHeight = 400
    this.minHeight = 200
    this.maxHeight = 600
    // The people the container height was fitted for, and the height of the
    // container, which the user can change by dragging
    this._sizedFor = null
    this._height = null
    this._chart = new RelationshipChart()
    this._otherHandle = null
  }

  renderContent() {
    if (this._data?.data?.length === 0 || !this.grampsId1 || !this.grampsId2) {
      return ''
    }
    // A card click would open the person in the tree view
    return html`
      <div
        id="container"
        style="height: ${this._containerHeight()}"
        @pedigree:person-selected="${e => e.stopPropagation()}"
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

  _containerHeight() {
    return this._height ?? `${this.initialHeight}px`
  }

  // The container is created again after loading, so its height is kept
  handleResize() {
    super.handleResize()
    const height = this.renderRoot?.getElementById('container')?.style.height
    if (height) {
      this._height = height
    }
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
    // The first layout of two people gets a container just high enough for
    // it, with the chart fitted into it; after that the height is the user's
    // to change
    const people = `${this.grampsId1} ${this.grampsId2}`
    const fit = people !== this._sizedFor && this.containerWidth > 0
    if (fit) {
      this._sizedFor = people
      const height = fittedHeight(this._layout.bounds, this.containerWidth, {
        minHeight: this.minHeight,
        maxHeight: this.maxHeight,
      })
      this._height = `${height}px`
      container.style.height = this._height
    }
    this._chart.update(this._layout, {
      ...this.chartOptions(),
      bboxHeight: container.offsetHeight,
    })
    // The viewport keeps the zoom level while the root person stays the same
    if (fit) {
      this._chart.viewport.fit()
    }
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
