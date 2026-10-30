/*
Short messages at the bottom of the screen, shown one at a time

A new message replaces the current one, unless the current one was shown with
keep: then the new one waits until it is gone. A message with timeout 0 stays
until it is dismissed or acted on; it gives way to timed messages and returns
once they are done. There is at most one such message.
*/

import {css, html, LitElement} from 'lit'
import '@material/web/button/text-button.js'
import '@material/web/iconbutton/icon-button.js'

import {mdiClose} from '@mdi/js'

import './GrampsjsIcon.js'
import {buttonColorStyles, iconButtonColorStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export const SNACKBAR_TIMEOUT = 5000

class GrampsjsSnackbar extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      buttonColorStyles,
      iconButtonColorStyles,
      css`
        .surface {
          position: fixed;
          inset: auto 16px 16px 16px;
          margin: 0 auto;
          width: fit-content;
          max-width: min(600px, calc(100vw - 32px));
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px 4px 16px;
          border: none;
          border-radius: 4px;
          background-color: var(--md-sys-color-inverse-surface);
          color: var(--md-sys-color-inverse-on-surface);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2),
            0 1px 3px rgba(0, 0, 0, 0.12);
          font-size: 14px;
          font-weight: 400;
          line-height: 20px;
          overflow: visible;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 150ms ease-in, transform 150ms ease-in,
            overlay 150ms allow-discrete, display 150ms allow-discrete;
        }

        .surface:popover-open,
        .surface[data-open] {
          opacity: 1;
          transform: none;
          transition: opacity 200ms ease-out, transform 200ms ease-out,
            overlay 200ms allow-discrete, display 200ms allow-discrete;
        }

        @starting-style {
          .surface:popover-open {
            opacity: 0;
            transform: translateY(16px);
          }
        }

        @supports not selector(:popover-open) {
          .surface:not([data-open]) {
            display: none;
          }
        }

        @media (min-width: 600px) {
          .surface {
            inset: auto 24px 24px 24px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .surface,
          .surface:popover-open,
          .surface[data-open] {
            transition: none;
          }
        }

        .label {
          flex: 1;
          min-width: 0;
          padding: 10px 8px 10px 0;
          overflow-wrap: anywhere;
        }

        .surface.no-buttons .label {
          padding-right: 8px;
        }

        md-text-button {
          --grampsjs-button-color: var(--md-sys-color-inverse-primary);
          flex-shrink: 0;
        }

        md-icon-button {
          --grampsjs-icon-button-color: var(--md-sys-color-inverse-on-surface);
          --md-icon-button-icon-size: 18px;
          --md-icon-button-state-layer-width: 36px;
          --md-icon-button-state-layer-height: 36px;
          flex-shrink: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _current: {state: true},
    }
  }

  constructor() {
    super()
    this._current = null
    // The message last shown, kept on screen while the surface fades out
    this._shown = null
    this._queue = []
    this._persistent = null
    this._timer = null
    this._remaining = 0
    this._timerStarted = 0
  }

  render() {
    const item = this._current ?? this._shown
    const hasButtons = !!(item?.action || item?.dismissible)
    return html`
      <div
        class="surface ${hasButtons ? '' : 'no-buttons'}"
        popover="manual"
        role="status"
        aria-live="polite"
        ?data-open="${!!this._current}"
        @mouseenter="${this._pause}"
        @mouseleave="${this._resume}"
        @focusin="${this._pause}"
        @focusout="${this._resume}"
      >
        <span class="label">${item?.message ?? ''}</span>
        ${item?.action
          ? html`<md-text-button @click="${this._handleAction}"
              >${item.action.label}</md-text-button
            >`
          : ''}
        ${item?.dismissible
          ? html`<md-icon-button
              aria-label="${this._('Close')}"
              @click="${this.dismiss}"
            >
              <grampsjs-icon
                path="${mdiClose}"
                color="currentColor"
              ></grampsjs-icon>
            </md-icon-button>`
          : ''}
      </div>
    `
  }

  /**
   * Shows a message, or queues it while another one is shown.
   *
   * action: {label, handler}, run when the action button is clicked
   * timeout: milliseconds until the message hides; 0 keeps it until dismissed
   * dismissible: shows a close button
   * keep: new messages wait until this one is gone, for actions that
   *   cannot be repeated elsewhere such as undo
   */
  show({
    message,
    action = null,
    timeout = SNACKBAR_TIMEOUT,
    dismissible = false,
    keep = false,
  }) {
    const item = {message, action, timeout, dismissible, keep}
    if (timeout === 0) {
      this._persistent = item
      if (this._current === null || this._current.timeout === 0) {
        this._next()
      }
      return
    }
    const isDuplicate = [this._current, ...this._queue].some(
      queued => queued?.message === message && !queued.action && !action
    )
    if (isDuplicate) return
    this._queue.push(item)
    if (
      this._current === null ||
      this._current.timeout === 0 ||
      !this._current.keep
    ) {
      this._next()
    }
  }

  /** Hides the current message and shows the next one, if any. */
  dismiss() {
    if (this._current?.timeout === 0) {
      this._persistent = null
    }
    this._next()
  }

  _handleAction() {
    const handler = this._current?.action?.handler
    this.dismiss()
    handler?.()
  }

  _next() {
    this._clearTimer()
    // Waiting messages without keep are replaced by the ones after them
    while (this._queue.length > 1 && !this._queue[0].keep) {
      this._queue.shift()
    }
    this._current = this._queue.shift() ?? this._persistent ?? null
    if (this._current !== null) {
      this._shown = this._current
      this._startTimer(this._current.timeout)
    }
  }

  _startTimer(ms) {
    if (!ms) return
    this._remaining = ms
    this._timerStarted = Date.now()
    this._timer = window.setTimeout(() => this._next(), ms)
  }

  _clearTimer() {
    if (this._timer !== null) {
      window.clearTimeout(this._timer)
      this._timer = null
    }
  }

  // Hovering or focusing the message keeps it on screen
  _pause() {
    if (this._timer === null) return
    this._clearTimer()
    this._remaining -= Date.now() - this._timerStarted
  }

  _resume() {
    if (this._timer !== null || !this._current?.timeout) return
    this._startTimer(Math.max(this._remaining, 1000))
  }

  updated(changed) {
    if (!changed.has('_current')) return
    const surface = this.renderRoot.querySelector('.surface')
    if (typeof surface?.showPopover !== 'function') return
    // Showing again moves the surface to the top of the top layer, above
    // dialogs opened after the previous message
    if (surface.matches(':popover-open')) surface.hidePopover()
    if (this._current !== null) surface.showPopover()
  }

  disconnectedCallback() {
    this._clearTimer()
    super.disconnectedCallback()
  }
}

window.customElements.define('grampsjs-snackbar', GrampsjsSnackbar)
