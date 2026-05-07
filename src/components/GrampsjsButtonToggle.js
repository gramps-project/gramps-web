import {LitElement, css, html} from 'lit'
import '@material/web/chips/filter-chip'
import './GrampsjsIcon.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsButtonToggle extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-filter-chip {
          --md-filter-chip-label-text-size: 13px;
          --md-filter-chip-label-text-weight: 400;
          --md-filter-chip-outline-width: 0px;
          --md-filter-chip-label-text-color: var(--md-sys-color-primary);
          --md-filter-chip-hover-label-text-color: var(--md-sys-color-primary);
          --md-filter-chip-focus-label-text-color: var(--md-sys-color-primary);
          --md-filter-chip-pressed-label-text-color: var(
            --md-sys-color-primary
          );
          --md-filter-chip-selected-container-color: var(
            --md-sys-color-primary
          );
          --md-filter-chip-selected-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-hover-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-focus-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-pressed-label-text-color: var(
            --md-sys-color-on-primary
          );
          --md-filter-chip-selected-hover-state-layer-color: var(
            --md-sys-color-on-primary
          );
        }
      `,
    ]
  }

  static get properties() {
    return {
      iconPath: {type: String},
      label: {type: String},
      checked: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.iconPath = ''
    this.label = ''
    this.checked = false
  }

  render() {
    return html`
      <md-filter-chip
        label="${this.label}"
        ?selected="${this.checked}"
        @click="${this.toggle}"
      >
        ${this.iconPath
          ? html`
              <grampsjs-icon
                slot="icon"
                path="${this.iconPath}"
                color="var(--md-sys-color-primary)"
                height="18"
                width="18"
              ></grampsjs-icon>
              <grampsjs-icon
                slot="selected-icon"
                path="${this.iconPath}"
                color="var(--md-sys-color-on-primary)"
                height="18"
                width="18"
              ></grampsjs-icon>
            `
          : ''}
      </md-filter-chip>
    `
  }

  toggle() {
    this.checked = !this.checked
    fireEvent(this, 'grampsjs-button-toggle:toggle', {checked: this.checked})
  }
}

window.customElements.define('grampsjs-button-toggle', GrampsjsButtonToggle)
