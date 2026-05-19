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

const CONTROLS_HEIGHT = 48

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

        .timeline-controls {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          height: ${CONTROLS_HEIGHT}px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      events: {type: Array},
      _width: {type: Number},
      _height: {type: Number},
    }
  }

  constructor() {
    super()
    this.events = []
    this._width = -1
    this._height = -1
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
  }

  firstUpdated() {
    const container = this.renderRoot.querySelector('.container')
    new ResizeObserver(([entry]) => {
      this._width = entry.contentRect.width
      this._height = entry.contentRect.height
    }).observe(container)
  }

  updated(changed) {
    super.updated(changed)
    const sizeChanged =
      this._width !== this._chartWidth || this._height !== this._chartHeight
    if (
      (sizeChanged || changed.has('events')) &&
      this._width > 0 &&
      this._height > 0
    ) {
      this._chartWidth = this._width
      this._chartHeight = this._height
      this._chart = Timeline(this.events, {
        width: this._width,
        height: this._height - CONTROLS_HEIGHT,
        locale: this.appState?.i18n?.lang || 'en',
        onDotClick: handle => fireEvent(this, 'timeline:dot-click', {handle}),
        onDetailClick: grampsId =>
          fireEvent(this, 'nav', {path: `event/${grampsId}`}),
        onZoomEnd: ([d0, d1], innerWidth) => {
          const handles = this.events
            .filter(e => e.jsDate != null && e.jsDate >= d0 && e.jsDate <= d1)
            .map(e => e.handle)
          fireEvent(this, 'timeline:zoom-end', {handles, innerWidth})
        },
      })
      this.requestUpdate()
    }
  }

  render() {
    const ready = this._width > 0 && this._height > 0

    return html`
      <div class="container">
        <div class="timeline-controls">
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
            id="btn-zoom-in"
            aria-label="${this._('Zoom in')}"
            @click=${() => this._chart?.zoomIn()}
          >
            <grampsjs-icon path="${mdiMagnifyPlus}"></grampsjs-icon>
          </md-icon-button>
          <grampsjs-tooltip for="btn-zoom-in" .appState="${this.appState}">
            ${this._('Zoom in')}
          </grampsjs-tooltip>
        </div>
        ${ready && this._chart ? this._chart.node : ''}
      </div>
    `
  }

  updateDetails(details) {
    this._chart?.updateDetails(details)
  }
}

window.customElements.define('grampsjs-timeline', GrampsjsTimeline)
