import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

class GrampsjsChatMessage extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .container {
          margin: 15px 0;
          font-size: 16px;
          line-height: 26px;
          font-weight: 340;
          clear: right;
          max-width: 90%;
        }
        .container.human {
          background-color: rgba(109, 76, 65, 0.12);
          color: rgba(27, 19, 16);
          padding: 10px 20px;
          border-radius: 16px;
          float: right;
          max-width: 70%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      type: {type: String},
    }
  }

  constructor() {
    super()
    this.type = 'human'
  }

  render() {
    return html`<div
      class="${classMap({
        container: true,
        human: this.type === 'human',
        ai: this.type === 'ai',
      })}"
    >
      <slot></slot>
    </div>`
  }
}

window.customElements.define('grampsjs-chat-message', GrampsjsChatMessage)
