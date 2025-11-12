import {html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'

export class GrampsjsViewHelp extends GrampsjsView {
  renderContent() {
    return html`
      <h2>${this._('Help')}</h2>

      <div>
        <mwc-button
          outlined
          icon="arrow_outward"
          @click="${() =>
            window.open('https://www.grampsweb.org/user-guide', '_blank')}"
          >${this._('User Documentation')}</mwc-button
        >
        <mwc-button
          outlined
          icon="arrow_outward"
          @click="${() =>
            window.open(
              'https://www.grampsweb.org/administration/admin',
              '_blank'
            )}"
          >${this._('Administrator Documentation')}</mwc-button
        >
        <mwc-button
          outlined
          icon="arrow_outward"
          @click="${() =>
            window.open(
              'https://gramps.discourse.group/c/gramps-web',
              '_blank'
            )}"
          >${this._('Forum')}</mwc-button
        >
      </div>
    `
  }
}

window.customElements.define('grampsjs-view-help', GrampsjsViewHelp)
