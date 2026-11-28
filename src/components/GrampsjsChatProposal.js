/*
Changes the AI assistant proposes, for the user to review and apply.

Shows every record the proposal adds, changes or deletes, with a row per
changed field, and fires `chat-proposal:apply` when the user applies them.
*/

import {html, css, LitElement} from 'lit'
import '@material/web/button/filled-button.js'
import {mdiCheck} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {proposalChanges} from '../chatProposal.js'
import {fireEvent} from '../util.js'
import './GrampsjsIcon.js'
import './GrampsjsRecordChanges.js'

class GrampsjsChatProposal extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          margin: 16px 0 0 35px;
        }

        .proposal {
          border: 1px solid var(--grampsjs-body-font-color-20);
          border-radius: 12px;
          padding: 16px 20px 20px 20px;
        }

        h3 {
          margin: 0 0 20px 0;
          font-size: 16px;
          font-weight: 500;
        }

        .footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 24px;
        }

        .status {
          color: var(--grampsjs-text-secondary-color);
        }
      `,
    ]
  }

  static get properties() {
    return {
      proposal: {type: Object},
      status: {type: String},
      disabled: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.proposal = null
    this.status = ''
    this.disabled = false
    this._changesOf = null
    this._changes = []
    this._records = []
  }

  // The changes of the current proposal, and the states of its records,
  // computed once per proposal
  _updateChanges() {
    if (this._changesOf === this.proposal) return
    this._changesOf = this.proposal
    this._changes = proposalChanges(this.proposal?.transaction)
    this._records = (this.proposal?.transaction ?? []).map(
      item => item.new ?? item.old
    )
  }

  render() {
    this._updateChanges()
    if (this._changes.length === 0) return ''
    return html`
      <div class="proposal">
        <h3>${this._('Proposed changes')}</h3>
        <grampsjs-record-changes
          .changes="${this._changes}"
          .records="${this._records}"
          ?applied="${this.status === 'applied'}"
          .appState="${this.appState}"
        ></grampsjs-record-changes>
        ${this._renderFooter()}
      </div>
    `
  }

  _renderFooter() {
    if (this.status === 'applied') {
      return html`
        <div class="footer status">
          <grampsjs-icon
            path="${mdiCheck}"
            color="var(--grampsjs-text-secondary-color)"
          ></grampsjs-icon>
          ${this._('Changes applied')}
        </div>
      `
    }
    if (this.status === 'outdated') {
      return html`
        <div class="footer status">
          ${this._('These changes can no longer be applied.')}
        </div>
      `
    }
    if (!this.appState.permissions?.canEdit) return ''
    return html`
      <div class="footer">
        <md-filled-button
          ?disabled="${this.disabled}"
          @click="${this._handleApply}"
          >${this._('Apply')}</md-filled-button
        >
      </div>
    `
  }

  _handleApply() {
    fireEvent(this, 'chat-proposal:apply')
  }
}

window.customElements.define('grampsjs-chat-proposal', GrampsjsChatProposal)
