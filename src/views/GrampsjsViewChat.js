import {html} from 'lit'

import '../components/GrampsjsChat.js'
import {GrampsjsView} from './GrampsjsView.js'

export class GrampsjsViewChat extends GrampsjsView {
  renderContent() {
    return html` <grampsjs-chat .strings="${this.strings}"></grampsjs-chat> `
  }
}

window.customElements.define('grampsjs-view-chat', GrampsjsViewChat)
