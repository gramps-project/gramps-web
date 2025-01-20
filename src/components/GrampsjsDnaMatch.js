import {html, LitElement, css} from 'lit'
import {mdiArrowLeft} from '@mdi/js'

import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsDnaMatchTable.js'
import {personDisplayName, fireEvent} from '../util.js'
import {renderIconSvg} from '../icons.js'

export class GrampsjsDnaMatch extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .container {
          margin-top: 40px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      person: {type: Object},
      personMatch: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.person = {}
    this.personMatch = {}
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return ''
    }
    return html`
      <h4>
        ${this._('DNA Match')}:
        <a href="/person/${this.person.gramps_id}"
          >${personDisplayName(this.person)}</a
        >
        &amp;
        <a href="/person/${this.personMatch.gramps_id}"
          >${personDisplayName(this.personMatch)}</a
        >
      </h4>
      <grampsjs-dna-match-table
        .strings="${this.strings}"
        .segments="${this.data.segments}"
      ></grampsjs-dna-match-table>
      <div class="container">
        <md-icon-button @click="${this.handleBackToAllMatches}">
          <md-icon>${renderIconSvg(mdiArrowLeft, '#666')}</md-icon>
        </md-icon-button>
      </div>
    `
  }

  handleBackToAllMatches() {
    const path = `dna-matches/${this.person.gramps_id}`
    fireEvent(this, 'nav', {path})
  }
}

window.customElements.define('grampsjs-dna-match', GrampsjsDnaMatch)
