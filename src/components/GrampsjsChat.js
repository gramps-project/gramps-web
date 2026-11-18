import {html, css, LitElement} from 'lit'
import '@material/web/button/filled-button.js'
import {mdiChatPlusOutline} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsChatPrompt.js'
import './GrampsjsChatMessage.js'
import {
  setChatHistory,
  getChatHistory,
  getChatTaskId,
  setChatTaskId,
  getChatMessageHistoryRaw,
  setChatMessageHistoryRaw,
  updateTaskStatus,
} from '../api.js'
import {stripChatHistoryRaw} from '../chatHistory.js'
import {chatVisionAvailable} from '../chatImages.js'
import {markProposalsReported, previousProposalStatus} from '../chatProposal.js'
import {fireEvent, makeHandle} from '../util.js'

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
          background-color: var(--grampsjs-body-font-color-50);
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
          padding: 20px 0 8px 0;
          flex-shrink: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      messages: {type: Array},
      loading: {type: Boolean},
      _liveToolCalls: {type: Array},
      _liveStatus: {type: String},
      _applyingProposal: {type: String},
    }
  }

  constructor() {
    super()
    this.messages = getChatHistory() || []
    this.loading = false
    this._liveToolCalls = []
    this._liveStatus = ''
    // ID of the proposal being applied
    this._applyingProposal = ''
  }

  // Converts PROGRESS result_objects into the same shape GrampsjsChatToolCalls expects.
  get _liveMetadata() {
    const toolsUsed = this._liveToolCalls
      .filter(t => t.tool)
      .map(t => ({step: t.step, name: t.tool}))
    return toolsUsed.length ? {tools_used: toolsUsed} : null
  }

  render() {
    return html`
      <div class="outer">
        <div class="clear-btn">
          <md-filled-button
            @click="${this._handleClear}"
            ?disabled=${this.messages.length === 0}
          >
            <grampsjs-icon
              slot="icon"
              path="${mdiChatPlusOutline}"
              color="currentColor"
            ></grampsjs-icon>
            ${this._('New')}
          </md-filled-button>
        </div>
        <div class="container">
          <div class="conversation">
            ${this.loading
              ? html`<grampsjs-chat-message
                  type="ai"
                  .metadata="${this._liveMetadata}"
                  .status="${this._liveStatus}"
                  ?live="${true}"
                  .appState="${this.appState}"
                >
                  <div class="loading" slot="no-wrap">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                  </div>
                </grampsjs-chat-message>`
              : ''}
            ${this.messages
              .toReversed()
              .map(
                message => html`
                  <grampsjs-chat-message
                    type="${message.role}"
                    .message="${message.message}"
                    .images="${message.images ?? []}"
                    .metadata="${message.metadata ?? null}"
                    .proposal="${message.proposal ?? null}"
                    proposalStatus="${message.proposalStatus ?? ''}"
                    ?proposalDisabled="${this._busy}"
                    @chat-proposal:apply="${() =>
                      this._applyProposal(message.proposal)}"
                    .appState="${this.appState}"
                  ></grampsjs-chat-message>
                `
              )}
          </div>
          <div class="prompt">
            <grampsjs-chat-prompt
              ?loading="${this._busy}"
              ?vision="${chatVisionAvailable(this.appState.dbInfo)}"
              @chat:prompt="${this._handlePrompt}"
              .appState="${this.appState}"
            ></grampsjs-chat-prompt>
          </div>
        </div>
      </div>
    `
  }

  async _addMessage(message, maxLength) {
    if (!message.message) {
      return
    }
    if (message.role !== 'ai') {
      this.messages = [...this.messages.slice(-(maxLength - 1)), message]
      return
    }
    // for AI messages, we display the message word by word
    // to simulate streaming response (which it's not, but
    // users may be used to it.)
    const words = message.message.split(' ')
    const nWords = words.length
    this.messages = [
      ...this.messages.slice(-(maxLength - 1)),
      {...message, message: words[0]},
    ]
    for (let end = 1; end <= nWords; end += 1) {
      if (end > 1) {
        // the last message is rebuilt from its live state, which may have
        // changed meanwhile, e.g. its proposal been applied
        const last = this.messages[this.messages.length - 1]
        this.messages = [
          ...this.messages.slice(0, -1),
          {...last, message: words.slice(0, end).join(' ')},
        ]
      }
      // eslint-disable-next-line no-await-in-loop
      await delay(Math.ceil(1000 / nWords))
    }
  }

  // The AI message of a chat result, keeping the history of the conversation
  // for the next query
  _aiMessage(result) {
    if (result.message_history_raw) {
      setChatMessageHistoryRaw(result.message_history_raw)
    }
    // the query that got this answer told the assistant about them
    this.messages = markProposalsReported(this.messages)
    const message = {
      role: 'ai',
      message: result.response,
      metadata: result.metadata ?? null,
    }
    if (result.proposal?.transaction?.length > 0) {
      message.proposal = {...result.proposal, id: makeHandle()}
    }
    return message
  }

  // Whether the assistant answers or a proposal is being applied. Neither may
  // start while the other runs, as the answer could hold a proposal made for
  // the tree as it was before the changes.
  get _busy() {
    return this.loading || !!this._applyingProposal
  }

  async _applyProposal(proposal) {
    if (!proposal || this._busy) return
    this._applyingProposal = proposal.id
    const result = await this.appState.apiPost(
      `/api/transactions/?message=${encodeURIComponent(
        'Changes proposed by the assistant'
      )}`,
      proposal.transaction
    )
    this._applyingProposal = ''
    if ('error' in result) {
      fireEvent(this, 'grampsjs:error', {message: result.error})
      // the transaction is rejected as a whole, e.g. as a record has changed
      // since the proposal was made, and would be again
      if (result.errorDetail?.status === 400) {
        this._setProposalStatus(proposal.id, 'outdated')
      }
      return
    }
    this._setProposalStatus(proposal.id, 'applied')
    fireEvent(this, 'transaction:undo', {
      message: 'Changes applied',
      transaction: result.data,
      redirect: 'chat',
    })
  }

  // Sets the status of a proposal. Once one is applied, the others that are
  // still open are outdated: they were made for the tree as it was before,
  // and records they add could get the same Gramps IDs.
  _setProposalStatus(id, status) {
    this.messages = this.messages.map(message => {
      if (!message.proposal || message.proposalStatus) return message
      if (message.proposal.id === id) {
        return status === 'applied'
          ? {...message, proposalStatus: status, proposalUnreported: true}
          : {...message, proposalStatus: status}
      }
      return status === 'applied'
        ? {...message, proposalStatus: 'outdated'}
        : message
    })
    setChatHistory(this.messages)
  }

  // Only the thumbnails of attached images are kept in the conversation, as
  // it is stored in the browser; the images are sent with this query only
  _handlePrompt(event) {
    const images = event.detail.images ?? []
    const message = {
      role: 'human',
      message: event.detail.message,
    }
    if (images.length > 0) {
      message.images = images.map(image => image.thumbnail)
    }
    // before the prompt is added, which can drop the oldest message
    const previousProposal = previousProposalStatus(this.messages)
    this._addMessage(message, 7)
    setChatHistory(this.messages)
    this._generateResponse(
      images.map(image => image.data),
      previousProposal
    )
  }

  _pollChatTask(taskId, onProgress) {
    return new Promise((resolve, reject) => {
      let settled = false
      updateTaskStatus(
        this.appState.auth,
        taskId,
        status => {
          const doneStates = ['FAILURE', 'REVOKED', 'SUCCESS']
          if (doneStates.includes(status?.state)) {
            settled = true
            resolve(status)
          } else if (status?.state === 'PROGRESS' && onProgress) {
            onProgress(status.result_object)
          }
        },
        1000,
        Infinity,
        () => this.isConnected
      )
        .then(() => {
          if (!settled) {
            reject(new Error('Chat cancelled'))
          }
        })
        .catch(reject)
    })
  }

  // `previousProposal` is what to tell the assistant about its proposals, see
  // previousProposalStatus
  async _generateResponse(images = [], previousProposal = '') {
    this.loading = true
    const payload = {
      query: this.messages[this.messages.length - 1].message,
    }
    if (images.length > 0) {
      payload.images = images
    }
    const rawHistory = getChatMessageHistoryRaw()
    if (rawHistory) {
      payload.message_history_raw = stripChatHistoryRaw(rawHistory)
    } else if (this.messages.length > 1) {
      // Fallback for sessions pre-dating message_history_raw; can be removed later.
      payload.history = this.messages
        .slice(0, this.messages.length - 1)
        .map(({role, message}) => ({role, message}))
    }
    // the model doesn't see its proposals in the stripped history
    if (previousProposal) {
      payload.previous_proposal = previousProposal
    }
    const data = await this.appState.apiPost(
      '/api/chat/?background=1&verbose=1',
      payload,
      {
        dbChanged: false,
        saving: false,
      }
    )
    const fireError = (msg, detail = {}) =>
      fireEvent(this, 'grampsjs:error', {message: msg, silent: true, detail})

    let message
    if ('error' in data) {
      fireError(data.error, data.errorDetail ?? {})
      message = {role: 'error', message: this._(data.error)}
    } else if (data?.task?.id) {
      setChatTaskId(data.task.id)
      let status
      try {
        status = await this._pollChatTask(data.task.id, progress => {
          if (progress?.message) {
            this._liveStatus = progress.message
          }
          if (
            progress?.tool &&
            !this._liveToolCalls.some(t => t.step === progress.step)
          ) {
            this._liveToolCalls = [...this._liveToolCalls, progress]
          }
        })
      } catch (e) {
        fireError(e?.message || this._('An error occurred'))
        message = {role: 'error', message: this._('An error occurred')}
      }
      if (status?.state === 'SUCCESS' && status?.result_object?.response) {
        message = this._aiMessage(status.result_object)
      } else if (!message) {
        const errMsg =
          (status?.state === 'FAILURE' && status.result_object) ||
          'An error occurred'
        fireError(errMsg)
        message = {role: 'error', message: this._(errMsg)}
      }
    } else if (data?.data?.response) {
      message = this._aiMessage(data.data)
    } else {
      fireError('An error occurred')
      message = {role: 'error', message: this._('An error occurred')}
    }

    this.loading = false
    this._liveToolCalls = []
    this._liveStatus = ''
    await this._addMessage(message, 6)
    setChatHistory(this.messages)
    if (data?.task?.id) {
      setChatTaskId(null, data.task.id)
    }
  }

  _handleClear() {
    this.messages = []
    setChatHistory(this.messages)
    setChatTaskId(null)
    setChatMessageHistoryRaw(null)
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

  async _resumePendingTask() {
    const taskId = getChatTaskId()
    if (!taskId) {
      return
    }
    this.loading = true
    const fireError = (msg, detail = {}) =>
      fireEvent(this, 'grampsjs:error', {message: msg, silent: true, detail})
    try {
      let status
      try {
        status = await this._pollChatTask(taskId)
      } catch (e) {
        // task may have already expired on the server — just discard silently
      }
      let message
      if (status?.state === 'SUCCESS' && status?.result_object?.response) {
        message = this._aiMessage(status.result_object)
      } else if (status) {
        const errMsg =
          (status?.state === 'FAILURE' && status.result_object) ||
          'An error occurred'
        fireError(errMsg)
        message = {role: 'error', message: this._(errMsg)}
      }
      if (message) {
        await this._addMessage(message, 6)
        setChatHistory(this.messages)
      }
      setChatTaskId(null, taskId)
    } finally {
      this.loading = false
    }
  }

  _handleStorage() {
    this.messages = getChatHistory()
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('storage', event => this._handleStorage(event))
    this._resumePendingTask()
  }
}

window.customElements.define('grampsjs-chat', GrampsjsChat)
