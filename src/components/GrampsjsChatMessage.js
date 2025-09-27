import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import '@material/web/icon/icon.js'
import {mdiFamilyTree} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {renderIconSvg} from '../icons.js'

class GrampsjsChatMessage extends GrampsjsAppStateMixin(LitElement) {
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
          display: flex;
          align-items: flex-start;
        }

        .container.human {
          background-color: var(--grampsjs-color-shade-230);
          color: var(--grampsjs-body-font-color);
          padding: 10px 20px;
          border-radius: 16px;
          float: right;
          max-width: 70%;
          margin-right: 10px;
        }

        .container.alert {
          max-width: 70%;
          margin-left: auto;
          margin-right: auto;
          width: fit-content;
          border-radius: 16px;
          border: 0;
        }

        .slot-wrap {
          white-space: pre-wrap;
          flex-grow: 1;
          overflow: hidden;
        }

        .avatar {
          width: 35px;
          height: 35px;
          flex-shrink: 0;
        }

        .avatar md-icon {
          --md-icon-size: 20px;
          position: relative;
          top: 3px;
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
    return html`
      <div
        class="${classMap({
          container: true,
          human: this.type === 'human',
          ai: this.type === 'ai',
          alert: this.type === 'error',
          error: this.type === 'error',
        })}"
      >
        ${this.type === 'ai'
          ? html`
              <div class="avatar">
                <md-icon>${renderIconSvg(mdiFamilyTree, '#999', 270)}</md-icon>
              </div>
            `
          : ''}
        <slot name="no-wrap"></slot>
        <!-- prettier-ignore -->
        <div class="slot-wrap"><slot></slot></div>
      </div>
    `
  }
}

window.customElements.define('grampsjs-chat-message', GrampsjsChatMessage)
