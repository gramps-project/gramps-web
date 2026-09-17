import {css, html} from 'lit'

import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import {RelationshipChart} from '../charts/RelationshipChart.js'
import {layoutRelationships} from '../charts/layout/relationshipLayout.js'
import {FamilyGraph} from '../charts/model/FamilyGraph.js'
import {GrampsjsResizeContainerMixin} from '../mixins/GrampsjsResizeContainerMixin.js'
import {getImageUrl} from '../charts/util.js'
import {chartPalette} from '../charts/palette.js'
import {fireEvent} from '../util.js'

const palette = {
  ...chartPalette,
  personBox: 'var(--grampsjs-connection-chart-person-box)',
}

export class GrampsjsConnectionChart extends GrampsjsResizeContainerMixin(
  GrampsjsConnectedComponent
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
      `,
    ]
  }

  static get properties() {
    return {
      grampsId1: {type: String},
      grampsId2: {type: String},
      initialHeight: {type: Number},
    }
  }

  constructor() {
    super()
    this.grampsId1 = ''
    this.grampsId2 = ''
    this.initialHeight = 400
    this._chart = new RelationshipChart()
    this._layout = null
    this._layoutRequest = 0
  }

  renderContent() {
    if (this._data?.data?.length === 0 || !this.grampsId1 || !this.grampsId2) {
      return html`<div id="container"></div>`
    }
    return html`
      <div id="container" style="height: ${this.initialHeight}px"></div>
    `
  }

  renderLoading() {
    return html` <div
      id="container"
      style="height: ${this.initialHeight}px"
      class="skeleton"
    ></div>`
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    if (!['_data', 'grampsId1', 'grampsId2'].some(name => changed.has(name))) {
      return
    }
    const graph = new FamilyGraph(this._data?.data ?? [])
    const root = graph.personByGrampsId(this.grampsId1)
    if (root) {
      this._requestLayout(graph, root.handle)
    } else {
      this._layoutRequest += 1
      this._layout = null
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
    this._chart.update(this._layout, {
      getImageUrl: node => getImageUrl(node.person, 100),
      nameDisplayFormat: this.nameDisplayFormat,
      palette,
      fit: true,
      bboxWidth: this.containerWidth,
      bboxHeight: this.containerHeight,
    })
  }

  // Lays out the chart in the background, ignoring a layout that is ready
  // after a newer one was requested. If the layout fails, the chart is
  // cleared and an error is reported.
  async _requestLayout(graph, rootHandle) {
    this._layoutRequest += 1
    const request = this._layoutRequest
    let layout = null
    try {
      layout = await layoutRelationships(graph, rootHandle)
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
