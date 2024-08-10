import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

class GrampsjsChat extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [sharedStyles, css``]
  }

  render() {
    return html` HELLO GRAMPS `
  }
}

window.customElements.define('grampsjs-chat', GrampsjsChat)
