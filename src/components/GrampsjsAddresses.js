import {html, LitElement, css} from 'lit'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {toDate} from '../date.js'

export class GrampsjsAddresses extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        dl {
          clear: left;
        }

        dl > div {
          float: none;
        }

        dl > div > dt {
          display: inline-block;
          width: 10em;
          margin-right: 1em;
          text-align: right;
        }

        dl > div > dd {
          display: inline-block;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      profile: {type: Array},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.profile = []
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return ''
    }
    return html`
    ${this.data.map(
      (obj, i) => html`
        <dl>
          ${this._dateString(obj, i)
            ? html`
                <div>
                  <dt>${this._('Date')}</dt>
                  <dd>${this._dateString(obj, i)}</dd>
                </div>
              `
            : ''}
          ${obj.street
            ? html`
                <div>
                  <dt>${this._('Street')}</dt>
                  <dd>${obj.street}</dd>
                </div>
              `
            : ''}
          ${obj.locality
            ? html`
                <div>
                  <dt>${this._('Locality')}</dt>
                  <dd>${obj.locality}</dd>
                </div>
              `
            : ''}
          ${obj.city
            ? html`
                <div>
                  <dt>${this._('City')}</dt>
                  <dd>${obj.city}</dd>
                </div>
              `
            : ''}
          ${obj.county
            ? html`
                <div>
                  <dt>${this._('County')}</dt>
                  <dd>${obj.county}</dd>
                </div>
              `
            : ''}
          ${obj.state
            ? html`
                <div>
                  <dt>${this._('State')}</dt>
                  <dd>${obj.state}</dd>
                </div>
              `
            : ''}
          ${obj.country
            ? html`
                <div>
                  <dt>${this._('Country')}</dt>
                  <dd>${obj.country}</dd>
                </div>
              `
            : ''}
        </dl>
      `
    )}
      </table>
    `
  }

  // Date to show for the address at the given index. Prefers the string
  // formatted by the API. Object types without the address in profile
  // fall back to formatting the raw date.
  _dateString(obj, i) {
    return (
      this.profile[i]?.date_str ??
      (obj?.date?.dateval ? toDate(obj.date.dateval) : '')
    )
  }
}

window.customElements.define('grampsjs-addresses', GrampsjsAddresses)
