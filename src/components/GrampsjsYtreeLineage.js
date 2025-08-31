import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

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
    return html`${this.data.reverse().map(clade => this._renderClade(clade))}`
  }

  // eslint-disable-next-line class-methods-use-this
  _renderClade(clade) {
    return html`<div>
      ${clade.age_info.formed} &mdash;
      ${clade.age_info.most_recent_common_ancestor}
    </div>`
  }
}

window.customElements.define('grampsjs-ytree-lineage', GrampsjsYtreeLineage)
