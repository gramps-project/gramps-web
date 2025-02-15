import {html, css, LitElement} from 'lit'
import '@material/mwc-button'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsChatPrompt.js'
import './GrampsjsChatMessage.js'
import {setChatHistory, getChatHistory} from '../api.js'
import {renderMarkdownLinks} from '../util.js'

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class GrampsjsChat extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: flex;
          flex: 1;
          height: 100%;
          flex-direction: column;
        }

        .outer {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .container {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
          clear: left;
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

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 24px;
          width: 48px;
          font-size: 24px;
        }

        .dot {
          width: 8px;
          height: 8px;
          margin: 0 4px;
          background-color: #888;
          border-radius: 50%;
          animation: flash 1.4s infinite ease-in-out both;
        }

        .dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes flash {
          0%,
          80%,
          100% {
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
        }

        .clear-btn {
          position: relative;
          top: 20px;
          left: 0px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      messages: {type: Array},
      loading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.messages = getChatHistory() || []
    this.loading = false
  }

  render() {
    return html`
        <div class="outer">
          <div class="clear-btn">
            <mwc-button
              raised
              label="${this._('New')}"
              icon="clear_all"
              @click="${this._handleClear}"
              ?disabled=${this.messages.length === 0}
            ></mwc-button>
          </div>
          <div class="container">
            <div class="conversation">
              ${
                this.loading
                  ? html` <grampsjs-chat-message
                      type="ai"
                      .appState="${this.appState}"
                    >
                      <div class="loading" slot="no-wrap">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div></div
                    ></grampsjs-chat-message>`
                  : ''
              }
              ${this.messages
                .toReversed()
                .map(
                  message => html`
                    <grampsjs-chat-message
                      type="${message.role}"
                      .appState="${this.appState}"
                      >${renderMarkdownLinks(
                        message.message
                      )}</grampsjs-chat-message
                    >
                  `
                )}
            </div>
            <div class="prompt">
              <grampsjs-chat-prompt
                ?loading="${this.loading}"
                @chat:prompt="${this._handlePrompt}"
                .appState="${this.appState}"
              ></grampsjs-chat-prompt>
            </div>
          </div>
        </div>
      </div>
    `
  }

  async _addMessage(message, maxLength) {
    if (!message.message) {
      return
    }
    const {messages} = this

    if (message.role === 'ai') {
      // for AI messages, we display the message word by word
      // to simulate streaming response (which it's not, but
      // users may be used to it.)
      const words = message.message.split(' ')
      const nWords = words.length
      for (let end = 1; end <= nWords; end += 1) {
        this.messages = [
          ...messages.slice(-(maxLength - 1)),
          {role: 'ai', message: words.slice(0, end).join(' ')},
        ]
        // eslint-disable-next-line no-await-in-loop
        await delay(Math.ceil(1000 / nWords))
      }
    } else {
      this.messages = [...messages.slice(-(maxLength - 1)), message]
    }
  }

  _handlePrompt(event) {
    const message = {
      role: 'human',
      message: event.detail.message,
    }
    this._addMessage(message, 7)
    setChatHistory(this.messages)
    this._generateResponse()
  }

  async _generateResponse() {
    this.loading = true
    const payload = {
      query: this.messages[this.messages.length - 1].message,
    }
    if (this.messages.length > 1) {
      payload.history = this.messages.slice(0, this.messages.length - 1)
    }
    const data = await this.appState.apiPost('/api/chat/', payload, {
      dbChanged: false,
    })
    let message
    if ('error' in data || !data?.data?.response) {
      message = {
        role: 'error',
        message: this._(data.error),
      }
    } else {
      message = {
        role: 'ai',
        message: data.data.response,
      }
    }

    this.loading = false
    await this._addMessage(message, 6)
    setChatHistory(this.messages)
  }

  _handleClear() {
    this.messages = []
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
