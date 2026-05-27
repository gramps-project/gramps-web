import {html, css, LitElement} from 'lit'
import {
  mdiWrench,
  mdiCalendarToday,
  mdiMagnify,
  mdiAccount,
  mdiAccountMultiple,
  mdiAccountFilter,
  mdiFilter,
} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsIcon.js'

const TOOL_ICONS = {
  get_current_date: mdiCalendarToday,
  search_genealogy_database: mdiMagnify,
  get_person: mdiAccount,
  get_family: mdiAccountMultiple,
  filter_people: mdiAccountFilter,
  filter_events: mdiFilter,
  filter_families: mdiFilter,
}

const toolIcon = name => TOOL_ICONS[name] ?? mdiWrench

class GrampsjsChatToolCalls extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        .pills {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          min-height: 26px;
          margin-bottom: 12px;
        }

        .status-text {
          font-size: 13px;
          color: var(--grampsjs-body-font-color-50);
          margin-left: 6px;
        }

        @keyframes popIn {
          from {
            transform: scale(0.4);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }

        .pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--grampsjs-color-shade-230);
          border: none;
          border-radius: 50%;
          width: 26px;
          height: 26px;
          padding: 0;
          cursor: pointer;
          line-height: 0;
          flex-shrink: 0;
          animation: popIn 0.2s ease-out both;
        }

        .pill.open {
          background: var(--grampsjs-body-font-color-20);
        }

        .pill.active {
          animation: popIn 0.2s ease-out, pulse 1.4s 0.2s ease-in-out infinite;
        }

        .detail {
          margin-bottom: 12px;
          padding: 8px 12px;
          background: var(--grampsjs-color-shade-230);
          border-radius: 8px;
          font-size: 12px;
          color: var(--grampsjs-body-font-color-50);
        }

        .detail-name {
          font-weight: 600;
          margin-bottom: 6px;
        }

        .detail-args {
          display: grid;
          grid-template-columns: auto 1fr;
          column-gap: 12px;
          row-gap: 2px;
        }

        .arg-key {
          font-family: monospace;
          opacity: 0.7;
          white-space: nowrap;
        }

        .arg-val {
          word-break: break-word;
        }
      `,
    ]
  }

  static get properties() {
    return {
      metadata: {type: Object},
      status: {type: String},
      live: {type: Boolean},
      _expanded: {type: Number},
    }
  }

  constructor() {
    super()
    this.metadata = null
    this.status = ''
    this.live = false
    this._expanded = null
  }

  willUpdate(changed) {
    if (changed.has('metadata')) {
      this._expanded = null
    }
  }

  _toggle(step) {
    this._expanded = this._expanded === step ? null : step
  }

  render() {
    const tools = this.metadata?.tools_used?.filter(t => t.name) ?? []
    if (!tools.length && !this.status) return html``
    const expandedTool = tools.find(t => t.step === this._expanded) ?? null
    return html`
      <div class="pills">
        ${tools.map(
          (t, i) => html`
            <button
              class="pill ${this._expanded === t.step ? 'open' : ''} ${this
                .live && i === tools.length - 1
                ? 'active'
                : ''}"
              @click="${() => this._toggle(t.step)}"
              title="${t.name}"
            >
              <grampsjs-icon
                path="${toolIcon(t.name)}"
                height="14"
                width="14"
                color="var(--grampsjs-body-font-color-35)"
              ></grampsjs-icon>
            </button>
          `
        )}
        ${this.status
          ? html`<span class="status-text">${this.status}</span>`
          : ''}
      </div>
      ${expandedTool
        ? html`
            <div class="detail">
              <div class="detail-name">${expandedTool.name}</div>
              ${expandedTool.args
                ? html`<div class="detail-args">
                    ${Object.entries(expandedTool.args).map(
                      ([k, v]) => html`
                        <span class="arg-key">${k}</span>
                        <span class="arg-val"
                          >${typeof v === 'object'
                            ? JSON.stringify(v)
                            : v}</span
                        >
                      `
                    )}
                  </div>`
                : ''}
            </div>
          `
        : ''}
    `
  }
}

window.customElements.define('grampsjs-chat-tool-calls', GrampsjsChatToolCalls)
