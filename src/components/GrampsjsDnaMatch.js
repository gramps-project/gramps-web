import {html, LitElement, css} from 'lit'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsDnaMatchTable.js'

export class GrampsjsDnaMatch extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [sharedStyles, css``]
  }

  static get properties() {
    return {
      data: {type: Object},
      person: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.person = {}
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return ''
    }
    return html`
      <grampsjs-dna-match-table
        .strings="${this.strings}"
        .segments="${this.data.segments}"
      ></grampsjs-dna-match-table>
    `
  }
}

window.customElements.define('grampsjs-dna-match', GrampsjsDnaMatch)
