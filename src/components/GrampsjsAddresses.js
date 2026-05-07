import {html, LitElement, css} from 'lit'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'

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
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return ''
    }
    return html`
    ${this.data.map(
      obj => html`
        <dl>
          ${obj?.date?.dateval
            ? html`
                <div>
                  <dt>${this._('Date')}</dt>
                  <dd>${this._toDate(obj?.date?.dateval)}</dd>
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

  // eslint-disable-next-line class-methods-use-this
  _toDate(dateVal) {
    try {
      return `${dateVal[2]}-${dateVal[1]}-${dateVal[0]}`
    } catch {
      return ''
    }
  }
}

window.customElements.define('grampsjs-addresses', GrampsjsAddresses)
