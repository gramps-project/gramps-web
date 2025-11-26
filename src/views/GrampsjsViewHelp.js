import {css, html} from 'lit'

import {mdiOpenInNew} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'

// non-English languages with translated documentation
const supportedDocLangs = [
  'de',
  'fr',
  'es',
  'zh',
  'vi',
  'tr',
  'ru',
  'pt',
  'ja',
  'da',
  'fi',
  'it',
  'uk',
]

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

  _getDocLang() {
    const lang = this.appState.i18n.lang.substring(0, 2)
    if (supportedDocLangs.includes(lang)) {
      return `${lang}/`
    }
    return ''
  }

  renderContent() {
    const docLang = this._getDocLang()
    return html`
      <h2>${this._('Help')}</h2>

      <div>
        <md-outlined-button
          href="https://www.grampsweb.org/${docLang}user-guide"
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
          href="https://www.grampsweb.org/${docLang}administration/admin"
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
