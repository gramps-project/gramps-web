import {html, css, LitElement} from 'lit'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {YtreeLineageChart} from '../charts/YtreeLineageChart.js'

class GrampsjsYtreeLineage extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [sharedStyles, css``]
  }

  static get properties() {
    return {
      data: {type: Array},
    }
  }

  constructor() {
    super()
    this.data = []
  }

  render() {
    // Use d3-based chart rendering
    let svgNode = null
    console.log('öang', this.appState?.i18n?.lang)
    if (this.data && this.data.length > 0) {
      svgNode = YtreeLineageChart([...this.data], {
        locale: this.appState?.i18n?.lang ?? 'en-US',
      })
    }
    return html`<div>${svgNode ? html`${svgNode}` : ''}</div>`
  }
}

window.customElements.define('grampsjs-ytree-lineage', GrampsjsYtreeLineage)
