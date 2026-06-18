import {css, html, LitElement} from 'lit'
import {
  mdiMagnifyMinus,
  mdiMagnifyPlus,
  mdiArrowExpandHorizontal,
} from '@mdi/js'

import '@material/web/iconbutton/icon-button.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'
import {Timeline} from '../charts/Timeline.js'
import {fireEvent} from '../util.js'

export class GrampsjsTimeline extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          height: calc(100vh - 64px - 36px);
          outline: none;
        }

        .container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .timeline-filter-bar {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          min-height: 48px;
          padding: 0 8px;
          gap: 12px;
        }

        .timeline-filter-options {
          flex-shrink: 0;
          padding: 0 8px;
        }

        .chart-area {
          flex: 1;
          min-height: 0;
          position: relative;
        }

        .chart-controls {
          position: absolute;
          bottom: 16px;
          right: 8px;
          display: flex;
          flex-direction: column;
          z-index: 1;
        }

        .chart-hint {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 14px;
          border-radius: 16px;
          background-color: var(--grampsjs-color-shade-230);
          font-size: 13px;
          color: var(--grampsjs-body-font-color-70);
          pointer-events: none;
          white-space: nowrap;
          z-index: 1;
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
        }

        .chart-hint.visible {
          opacity: 1;
        }
      `,
    ]
  }

  static get properties() {
    return {
      events: {type: Array},
      detailsLoading: {type: Boolean},
      _width: {type: Number},
      _height: {type: Number},
      _hasDetails: {type: Boolean},
      _hasVisibleEvents: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.events = []
    this.detailsLoading = false
    this._width = -1
    this._height = -1
    this._hasDetails = false
    this._hasVisibleEvents = false
  }

  connectedCallback() {
    super.connectedCallback()
    this.setAttribute('tabindex', '0')
    this._boundKeydown = e => {
      switch (e.key) {
        case 'ArrowLeft':
          this._chart?.panLeft()
          e.preventDefault()
          break
        case 'ArrowRight':
          this._chart?.panRight()
          e.preventDefault()
          break
        case '+':
        case '=':
          this._chart?.zoomIn()
          e.preventDefault()
          break
        case '-':
          this._chart?.zoomOut()
          e.preventDefault()
          break
        default:
          break
      }
    }
    this.addEventListener('keydown', this._boundKeydown)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this._boundKeydown)
    this._resizeObserver?.disconnect()
  }

  firstUpdated() {
    const chartArea = this.renderRoot.querySelector('.chart-area')
    this._resizeObserver = new ResizeObserver(([entry]) => {
      this._width = entry.contentRect.width
      this._height = entry.contentRect.height
    })
    this._resizeObserver.observe(chartArea)
  }

  updated(changed) {
    super.updated(changed)
    const sizeChanged =
      this._width !== this._chartWidth || this._height !== this._chartHeight
    if (sizeChanged && this._width > 0 && this._height > 0) {
      this._chartWidth = this._width
      this._chartHeight = this._height
      this._chart = Timeline(this.events, {
        width: this._width,
        height: this._height,
        locale: this.appState?.i18n?.lang || 'en',
        onDotClick: handle => fireEvent(this, 'timeline:dot-click', {handle}),
        onDetailClick: grampsId =>
          fireEvent(this, 'nav', {path: `event/${grampsId}`}),
        onZoomEnd: ([d0, d1], innerWidth) => {
          const handles = this.events
            .filter(e => e.jsDate != null && e.jsDate >= d0 && e.jsDate <= d1)
            .map(e => e.handle)
          this._hasVisibleEvents = handles.length > 0
          fireEvent(this, 'timeline:zoom-end', {handles, innerWidth})
        },
      })
      this.requestUpdate()
    } else if (changed.has('events') && this._chart) {
      this._chart.updateEvents(this.events)
    }
  }

  render() {
    const ready = this._width > 0 && this._height > 0

    return html`
      <div class="container">
        <div class="timeline-filter-bar">
          <slot name="filter"></slot>
        </div>
        <div class="timeline-filter-options">
          <slot name="filter-options"></slot>
        </div>
        <div class="chart-area">
          <div
            class="chart-hint ${ready &&
            this._hasVisibleEvents &&
            !this._hasDetails &&
            !this.detailsLoading
              ? 'visible'
              : ''}"
          >
            ${this._('Zoom in to see event details')}
          </div>
          <div class="chart-controls">
            <md-icon-button
              id="btn-zoom-in"
              aria-label="${this._('Zoom in')}"
              @click=${() => this._chart?.zoomIn()}
            >
              <grampsjs-icon path="${mdiMagnifyPlus}"></grampsjs-icon>
            </md-icon-button>
            <grampsjs-tooltip for="btn-zoom-in" .appState="${this.appState}">
              ${this._('Zoom in')}
            </grampsjs-tooltip>
            <md-icon-button
              id="btn-reset"
              aria-label="${this._('Reset')}"
              @click=${() => this._chart?.reset()}
            >
              <grampsjs-icon path="${mdiArrowExpandHorizontal}"></grampsjs-icon>
            </md-icon-button>
            <grampsjs-tooltip for="btn-reset" .appState="${this.appState}">
              ${this._('Reset')}
            </grampsjs-tooltip>
            <md-icon-button
              id="btn-zoom-out"
              aria-label="${this._('Zoom out')}"
              @click=${() => this._chart?.zoomOut()}
            >
              <grampsjs-icon path="${mdiMagnifyMinus}"></grampsjs-icon>
            </md-icon-button>
            <grampsjs-tooltip for="btn-zoom-out" .appState="${this.appState}">
              ${this._('Zoom out')}
            </grampsjs-tooltip>
          </div>
          ${ready && this._chart ? this._chart.node : ''}
        </div>
      </div>
    `
  }

  updateDetails(details) {
    this._hasDetails = Object.keys(details).length > 0
    this._chart?.updateDetails(details)
  }

  scrollToDate(date) {
    if (!this._chart) return false
    this._chart.scrollToDate(date)
    return true
  }
}

window.customElements.define('grampsjs-timeline', GrampsjsTimeline)
