import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {FamilyGraph} from '../charts/model/FamilyGraph.js'

export class GrampsjsChartBase extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        div#container {
          display: flex;
          height: calc(100vh - 153px);
        }

        @media (max-width: 599px) {
          div#container {
            height: calc(100vh - 145px);
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      containerWidth: {type: Number},
      containerHeight: {type: Number},
    }
  }

  constructor() {
    super()
    this.data = []
    this.containerWidth = -1
    this.containerHeight = -1
  }

  // The viewport of a chart drawn with `ChartViewport`
  get viewport() {
    return this._chart?.viewport
  }

  willUpdate(changed) {
    if (changed.has('data')) {
      this._graph = new FamilyGraph(this.data)
    }
  }

  render() {
    return html`<div id="container">${this.renderChart()}</div>`
  }

  firstUpdated() {
    const container = this.renderRoot.getElementById('container')
    this.handleResize()
    new ResizeObserver(() => this.handleResize()).observe(container)
  }

  handleResize() {
    const container = this.renderRoot.getElementById('container')
    if (container) {
      this.containerWidth = container.offsetWidth
      this.containerHeight = container.offsetHeight
    }
  }
}
