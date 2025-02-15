import {html, css, LitElement} from 'lit'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsChartBase extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        div#container {
          display: flex;
          height: calc(100vh - 165px);
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
