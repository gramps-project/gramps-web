import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import './GrampsjsChatPrompt.js'
import './GrampsjsChatMessage.js'

class GrampsjsChat extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .outer {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .container {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
        }

        .conversation {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column-reverse;
          padding: 0 10px 20px 10px;
        }

        .prompt {
          padding: 10px;
          flex-shrink: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      messages: {type: Array},
    }
  }

  constructor() {
    super()
    this.messages = [
      {
        type: 'human',
        message:
          '1 Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.',
      },
      {
        type: 'ai',
        message:
          '2 At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      },
      {
        type: 'human',
        message:
          '3 Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.',
      },
      {
        type: 'ai',
        message:
          '4 At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      },
      {
        type: 'human',
        message: '5 Ok.',
      },
    ]
  }

  render() {
    return html`
      <div class="outer">
        <div class="container">
          <div class="conversation">
            ${this.messages
              .toReversed()
              .map(
                message => html`
                  <grampsjs-chat-message
                    type="${message.type}"
                    .strings="${this.strings}"
                    >${message.message}</grampsjs-chat-message
                  >
                `
              )}
          </div>
          <div class="prompt">
            <grampsjs-chat-prompt
              @chat:prompt="${this._handlePrompt}"
              .strings="${this.strings}"
            ></grampsjs-chat-prompt>
          </div>
        </div>
      </div>
    `
  }

  _handlePrompt(event) {
    const message = {
      type: 'human',
      message: event.detail.message,
    }
    this.messages = [...this.messages, message]
  }

  _scrollToLastMessage() {
    const conversationDiv = this.renderRoot.querySelector('.conversation')
    if (conversationDiv != null) {
      conversationDiv.scrollTop = conversationDiv.scrollHeight
    }
  }

  focusInput() {
    const ele = this.renderRoot.querySelector('grampsjs-chat-prompt')
    if (ele !== null) {
      ele.focusInput()
    }
    this._scrollToLastMessage()
  }
}

window.customElements.define('grampsjs-chat', GrampsjsChat)
