import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import './GrampsjsChatPrompt.js'
import './GrampsjsChatMessage.js'
import {setChatHistory, getChatHistory} from '../api.js'

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
    this.messages = getChatHistory() || []
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
    setChatHistory(this.messages)
  }

  _scrollToLastMessage() {
    const conversationDiv = this.renderRoot.querySelector('.conversation')
    if (conversationDiv != null) {
      conversationDiv.scrollTop = conversationDiv.scrollHeight
    }
  }

  focusInput(retry = true) {
    const ele = this.renderRoot.querySelector('grampsjs-chat-prompt')
    if (ele !== null) {
      ele.focusInput()
    } else if (retry) {
      setTimeout(() => this.focusInput(false), 500)
    }
    this._scrollToLastMessage()
  }

  _handleStorage() {
    this.messages = getChatHistory()
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('storage', event => this._handleStorage(event))
  }
}

window.customElements.define('grampsjs-chat', GrampsjsChat)
