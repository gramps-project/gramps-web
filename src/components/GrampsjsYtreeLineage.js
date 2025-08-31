import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsYtreeLineage extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [sharedStyles, css``]
  }

  static get properties() {
    return {
      data: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  render() {
    return html`<pre>${JSON.stringify(this.data, null, 2)}</pre>`
  }
}

window.customElements.define('grampsjs-ytree-lineage', GrampsjsYtreeLineage)
