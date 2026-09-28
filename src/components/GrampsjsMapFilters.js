import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import './GrampsjsIcon.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {eventTypeIconPath, fireEvent} from '../util.js'
import {TIME_SPANS} from '../mapFilters.js'

// The filters of the map view: a time span around the selected year and the
// event types. Changes are reported with a map:filter-change event.
class GrampsjsMapFilters extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          padding: 12px 16px 16px;
        }

        .head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin: 4px 0 8px;
        }

        section + section .head {
          margin-top: 16px;
        }

        h3 {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--md-sys-color-on-surface-variant);
          font-family: var(--grampsjs-body-font-family);
        }

        .range {
          font-size: 13px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .options {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .option {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 9999px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          line-height: 1;
          cursor: pointer;
          border: 1px solid var(--md-sys-color-outline-variant);
          background: transparent;
          color: var(--md-sys-color-on-surface-variant);
        }

        .option:hover {
          background: var(--md-sys-color-surface-variant);
        }

        .option.selected {
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          border-color: transparent;
        }

        .clear {
          border: none;
          background: none;
          padding: 0;
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          color: var(--md-sys-color-primary);
          cursor: pointer;
        }
      `,
    ]
  }

  static get properties() {
    return {
      year: {type: Number},
      yearSpan: {type: Number},
      timeFilter: {type: Boolean},
      eventTypes: {type: Array},
      selectedEventTypes: {type: Array},
    }
  }

  constructor() {
    super()
    this.year = -1
    this.yearSpan = 50
    this.timeFilter = false
    this.eventTypes = []
    this.selectedEventTypes = []
  }

  render() {
    return html`${this._renderTime()} ${this._renderEventTypes()}`
  }

  _renderTime() {
    return html`
      <section>
        <div class="head">
          <h3>${this._('Year')}</h3>
          ${this.timeFilter
            ? html`<span class="range"
                >${this.year - this.yearSpan}–${this.year + this.yearSpan}</span
              >`
            : ''}
        </div>
        <div class="options">
          ${this._renderOption(this._('Off'), !this.timeFilter, () =>
            this._fireChange({timeFilter: false})
          )}
          ${TIME_SPANS.map(span =>
            this._renderOption(
              `±${span}`,
              this.timeFilter && this.yearSpan === span,
              () => this._fireChange({timeFilter: true, yearSpan: span})
            )
          )}
        </div>
      </section>
    `
  }

  _renderEventTypes() {
    if (this.eventTypes.length === 0) return ''
    const selected = new Set(this.selectedEventTypes)
    return html`
      <section>
        <div class="head">
          <h3>${this._('Event Type')}</h3>
          ${selected.size > 0
            ? html`<button
                class="clear"
                @click="${() => this._fireChange({eventTypes: []})}"
              >
                ${this._('Clear')}
              </button>`
            : ''}
        </div>
        <div class="options">
          ${this.eventTypes.map(({type}) =>
            this._renderOption(
              this._(type),
              selected.has(type),
              () => this._toggleEventType(type),
              eventTypeIconPath[type]
            )
          )}
        </div>
      </section>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderOption(label, selected, onClick, iconPath = null) {
    return html`
      <button
        class="${classMap({option: true, selected})}"
        aria-pressed="${selected}"
        @click="${onClick}"
      >
        ${iconPath
          ? html`<grampsjs-icon
              path="${iconPath}"
              height="16"
              width="16"
              color="currentColor"
            ></grampsjs-icon>`
          : ''}
        ${label}
      </button>
    `
  }

  _toggleEventType(type) {
    const selected = new Set(this.selectedEventTypes)
    if (selected.has(type)) {
      selected.delete(type)
    } else {
      selected.add(type)
    }
    this._fireChange({eventTypes: [...selected]})
  }

  _fireChange(change) {
    fireEvent(this, 'map:filter-change', change)
  }
}

window.customElements.define('grampsjs-map-filters', GrampsjsMapFilters)
