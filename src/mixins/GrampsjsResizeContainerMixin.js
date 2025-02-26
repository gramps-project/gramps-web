import {css} from 'lit'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {sharedStyles} from '../SharedStyles.js'

export const GrampsjsResizeContainerMixin = superClass =>
  class extends superClass {
    static get styles() {
      return [sharedStyles, css``]
    }

    static get properties() {
      return {
        data: {type: Array},
        containerWidth: {type: Number},
        containerHeight: {type: Number},
        _resizeObserver: {type: Object},
      }
    }

    constructor() {
      super()
      this.data = []
      this.containerWidth = -1
      this.containerHeight = -1
      this._resizeObserver = new ResizeObserver(() => this.handleResize())
    }

    firstUpdated() {
      this.handleResize()
    }

    updated() {
      this.observeContainer()
    }

    observeContainer() {
      const container = this.renderRoot.getElementById('container')
      if (container) {
        this._resizeObserver.disconnect()
        this._resizeObserver.observe(container)
      }
    }

    handleResize() {
      const container = this.renderRoot.getElementById('container')
      if (container) {
        this.containerWidth = container.offsetWidth
        this.containerHeight = container.offsetHeight
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback()
      this._resizeObserver.disconnect()
    }
  }
