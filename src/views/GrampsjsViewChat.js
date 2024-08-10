import {html, css} from 'lit'

import '../components/GrampsjsChat.js'
import {GrampsjsView} from './GrampsjsView.js'

export class GrampsjsViewChat extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          height: calc(100vh - 85px);
          margin-top: 0;
          margin-bottom: 0;
          display: flex;
          overflow: hidden;
        }
      `,
    ]
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active') && this.active) {
      this._focus()
    }
  }

  _focus() {
    this.renderRoot.querySelector('grampsjs-chat').focusInput()
  }

  renderContent() {
    return html` <grampsjs-chat .strings="${this.strings}"></grampsjs-chat> `
  }

  firstUpdated() {
    if (this.active) {
      this._focus()
    }
  }
}

window.customElements.define('grampsjs-view-chat', GrampsjsViewChat)
