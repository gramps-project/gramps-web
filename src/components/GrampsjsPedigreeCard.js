
import {html, css, LitElement} from 'lit-element'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsJsImage.js'


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
        line-height: 17.5px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
      }

      .card.female {
        border-left: 6px solid var(--color-girl);
      }

      .card.male {
        border-left: 6px solid var(--color-boy);
      }

      .photo {
        height: 70px;
        float:left;
        margin-right: 10px;
      }

      .name {
        font-weight: 500;
      }
      `
    ]
  }

  static get properties() { return {
    person: {type: Object},
    width: {type: String},
    link: {type: String}
  }}

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
      ${(Object.keys(this.person).length === 0) ? html`
        <div class="card" style="width: ${this.width};">
        NN
        </div>
        ` : html`
        <div class="card ${this.person.gender === 1 ? 'male' : 'female'}" style="width: ${this.width};">
          <a @click="${this._personSelected}" href="${this.link  === 'pedigree' ? 'tree' : `person/${this.person.gramps_id}`}">
            <div class="photo">
              ${this.person.media_list.length ? html`
              <grampsjs-img
                token="${this.token}"
                handle="${this.person.media_list[0].ref}"
                size="70"
                circle
                square
                .rect="${this.person.media_list[0].rect}">
              </grampsjs-img>
              ` : ''}
            </div>
            <span class="name">${this.person.profile.name_surname},
              <br>
              ${this.person.profile.name_given}</span>
              <br>
              <span class="dates">
              ${this.person?.profile?.birth?.date ? html`* ${this.person.profile.birth.date}` : ''}
              <br>
              ${this.person?.profile?.death?.date ? html`† ${this.person.profile.death.date}` : ''}
            </span>
          </a>
        </div>
      `}
      `
  }


  _personSelected() {
    this.dispatchEvent(new CustomEvent('person-selected', {detail: {gramps_id: this.person.gramps_id}}))
  }
}

window.customElements.define('grampsjs-pedigree-card', GrampsjsPedigreeCard)
