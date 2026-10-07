import {layoutRelationships} from '../charts/layout/relationshipLayout.js'
import {chartSvgDocument} from '../charts/svgExport.js'
import {fireEvent} from '../util.js'

// For chart components that draw a layout with a `ChartCanvas`. A component
// keeps the canvas in `_chart` and the layout it draws in `_layout`, and
// returns the options it draws with from `chartOptions()`.
export const GrampsjsChartCanvasMixin = superClass =>
  class extends superClass {
    constructor() {
      super()
      this._layout = null
      this._layoutRequest = 0
    }

    // The chart as an SVG document for saving to a file, or null while there
    // is no chart
    svgDocument() {
      if (!this._layout) {
        return null
      }
      return chartSvgDocument(
        this._chart.constructor,
        this._layout,
        this.chartOptions()
      )
    }

    // Lays out the relationships of `graph` around `rootHandle` in the
    // background. The current chart stays until the layout is ready, and a
    // layout that is ready after a newer one was requested is ignored. If the
    // layout fails, the chart is cleared and an error is reported.
    async _requestRelationshipLayout(graph, rootHandle) {
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

    // Clears the chart, ignoring a layout that is still being computed
    _clearRelationshipLayout() {
      this._layoutRequest += 1
      this._layout = null
    }
  }
