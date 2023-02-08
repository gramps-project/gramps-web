import {html, css, LitElement} from 'lit'

import '@material/mwc-icon-button'
import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsJsImage.js'
import './GrampsJsListItem.js'

const BASE_DIR = ''

class GrampsjsPedigreeCard extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        .card {
          height: 70px;
          padding: 10px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 400;
          line-height: 17.5px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12),
            0 1px 2px rgba(0, 0, 0, 0.24);
          color: rgba(0, 0, 0, 0.9);
          cursor: pointer;
        }

        .card.female {
          border-left: 6px solid var(--color-girl);
        }

        .card.male {
          border-left: 6px solid var(--color-boy);
        }

        .photo {
          height: 70px;
          float: left;
          margin-right: 10px;
        }

        .name {
          font-weight: 500;
          color: rgba(0, 0, 0, 0.9);
        }

        .more {
          position: absolute;
          top: -6px;
          right: -10px;
          color: rgba(0, 0, 0, 0.2);
        }

        .more mwc-icon-button {
          --mdc-icon-size: 16px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      person: {type: Object},
      width: {type: String},
      link: {type: String},
    }
  }

  constructor() {
    super()
    this.person = {}
    this.width = '164px'
    this.link = 'pedigree'
  }

  render() {
    if (!this.person) {
      return html``
    }
    return html`
      ${Object.keys(this.person).length === 0
        ? html` <div class="card" style="width: ${this.width};">NN</div> `
        : html`
            <div
              class="card ${this.person.gender === 1 ? 'male' : 'female'}"
              style="width: ${this.width};"
            >
              <div class="photo">
                ${this.person.media_list.length
                  ? html`
                      <grampsjs-img
                        token="${this.token}"
                        handle="${this.person.media_list[0].ref}"
                        size="70"
                        circle
                        square
                        mime="${this.person.media_list[0].mime}"
                        .rect="${this.person.media_list[0].rect}"
                      >
                      </grampsjs-img>
                    `
                  : ''}
              </div>
              <span class="name"
                >${this.person.profile.name_surname},
                <br />
                ${this.person.profile.name_given}</span
              >
              <br />
              <span class="dates">
                ${this.person?.profile?.birth?.date
                  ? html`*
                    ${new Date(
                      Date.parse(this.person.profile.birth.date)
                    ).toLocaleDateString()}`
                  : ''}
                <br />
                ${this.person?.profile?.death?.date
                  ? html`†
                    ${new Date(
                      Date.parse(this.person.profile.death.date)
                    ).toLocaleDateString()}`
                  : ''}
              </span>
              <div class="more">
                <mwc-icon-button
                  icon="more_vert"
                  @click="${this._handleClick}"
                ></mwc-icon-button>
                <div class="position: relative;">
                  <mwc-menu absolute x="20" y="2" id="menu">
                    <grampsjs-list-item
                      href="${BASE_DIR}/person/${this.person.gramps_id}"
                      >Details</grampsjs-list-item
                    >
                  </mwc-menu>
                </div>
              </div>
            </div>
          `}
    `
  }

  _handleClick(event) {
    event.stopPropagation()
    const menu = this.shadowRoot.getElementById('menu')
    menu.open = true
  }
}

window.customElements.define('grampsjs-pedigree-card', GrampsjsPedigreeCard)
