import {html, css, LitElement} from 'lit'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {personDisplayName} from '../util.js'

class GrampsjsDnaMatches extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .match {
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0 20px;
        }

        .match:last-child {
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        .head {
          display: inline-block;
          margin-right: 2em;
          vertical-align: middle;
          width: 10rem;
          padding: 20px 0;
        }

        .name {
          font-weight: 350;
          font-size: 17px;
        }

        dl {
          display: inline-block;
          vertical-align: middle;
        }

        dd {
          font-size: 15px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      person: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = []
    this.person = {}
  }

  render() {
    return html`
      <table>
        ${this.data
          .filter(match => match.segments && match.segments.length > 0)
          .map(match => this._personCard(match))}
      </table>
    `
  }

  _personCard(match) {
    return html`
      <div class="match">
        <div class="head">
          <span class="name">
            <a href="/person/${this._getGidFromHandle(match.handle)}"
              >${this._getNameFromHandle(match.handle)}</a
            ></span
          >
        </div>
        <dl>
          <div>
            <dt>${this._('Relationship')}</dt>
            <dd>${match.relation || this._('Unknown')}</dd>
          </div>
          <div>
            <dt>${this._('Shared DNA')}</dt>
            <dd>
              ${match.segments.reduce(
                (accumulator, currentValue) => accumulator + currentValue.cM,
                0
              )}
              cM
            </dd>
          </div>
          <div>
            <dt>${this._('Shared Segments')}</dt>
            <dd>${match.segments.length}</dd>
          </div>
          <div>
            <dt>${this._('Largest Segment')}</dt>
            <dd>
              ${match.segments.reduce(
                (accumulator, currentValue) =>
                  Math.max(accumulator, currentValue.cM),
                0
              )}
              cM
            </dd>
          </div>
        </dl>
      </div>
    `
  }

  _getNameFromHandle(handle) {
    const people = this.person?.extended?.people || []
    let person = people.filter(p => p.handle === handle)
    if (person.length === 0) {
      return ''
    }
    // eslint-disable-next-line prefer-destructuring
    person = person[0]
    return personDisplayName(person)
  }

  _getGidFromHandle(handle) {
    const people = this.person?.extended?.people || []
    let person = people.filter(p => p.handle === handle)
    if (person.length === 0) {
      return ''
    }
    // eslint-disable-next-line prefer-destructuring
    person = person[0]
    return person.gramps_id
  }
}

window.customElements.define('grampsjs-dna-matches', GrampsjsDnaMatches)
