import {css, html} from 'lit'

import {mdiOpenInNew} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'

export class GrampsjsViewHelp extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .button-container {
          display: flex;
          gap: 0.5em;
          margin-top: 1em;
          margin-bottom: 0.5em;
          --button-height: 48px;
        }
      `,
    ]
  }

  renderContent() {
    return html`
      <h2>${this._('Help')}</h2>

      <div>
        <md-outlined-button
          href="https://www.grampsweb.org/user-guide"
          target="_blank"
        >
          ${this._('User Documentation')}
          <grampsjs-icon
            .path="${mdiOpenInNew}"
            slot="icon"
            color="var(--mdc-theme-primary)"
          ></grampsjs-icon>
        </md-outlined-button>

        <md-outlined-button
          href="https://www.grampsweb.org/administration/admin"
          target="_blank"
        >
          ${this._('Administrator Documentation')}
          <grampsjs-icon
            .path="${mdiOpenInNew}"
            slot="icon"
            color="var(--mdc-theme-primary)"
          ></grampsjs-icon>
        </md-outlined-button>

        <md-outlined-button
          href="https://gramps.discourse.group/c/gramps-web"
          target="_blank"
        >
          ${this._('Forum')}
          <grampsjs-icon
            .path="${mdiOpenInNew}"
            slot="icon"
            color="var(--mdc-theme-primary)"
          ></grampsjs-icon>
        </md-outlined-button>
      </div>
    `
  }
}

window.customElements.define('grampsjs-view-help', GrampsjsViewHelp)
