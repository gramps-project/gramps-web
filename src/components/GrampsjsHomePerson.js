import {LitElement, css, html} from 'lit'

import '@material/web/dialog/dialog'
import '@material/web/button/text-button'
import {mdiPencil} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsSearchResultList.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsFormSelectObjectList.js'

export class GrampsjsHomePerson extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h3 {
          margin-bottom: 15px;
        }

        md-dialog {
          min-width: 450px;
          min-height: 450px;
          max-width: 100vw;
          max-height: 100vh;
        }
      `,
    ]
  }

  static get properties() {
    return {
      homePersonDetails: {type: Object},
      homePersonGrampsId: {type: String},
    }
  }

  constructor() {
    super()
    this.homePersonDetails = {}
    this.homePersonGrampsId = ''
  }

  render() {
    return html`
      <h3>${this._('Home Person')}</h3>

      ${this.homePersonGrampsId
        ? html`
            <div class="content">
              <grampsjs-search-result-list
                large
                linked
                metaIcon="edit"
                .appState="${this.appState}"
                .data=${[
                  {object: this.homePersonDetails, object_type: 'person'},
                ]}
                @search-result:metaClicked="${this._handleEditClick}"
              >
              </grampsjs-search-result-list>
            </div>
          `
        : html` <md-text-button trailing-icon @click="${this._handleEditClick}">
            ${this._('Set _Home Person')}
            <svg viewBox="0 0 24 24" slot="icon">
              <path d="${mdiPencil}" />
            </svg>
          </md-text-button>`}
      ${this.renderPersonSelect()}
    `
  }

  _handleEditClick() {
    this.renderRoot.querySelector('md-dialog')?.show()
  }

  renderPersonSelect() {
    return html`
      <md-dialog id="select-home-person-dialog">
        <div slot="headline">${this._('Set _Home Person')}</div>
        <div slot="content">
          <grampsjs-form-select-object
            @select-object:changed="${this._handleHomePerson}"
            objectType="person"
            .appState="${this.appState}"
            id="homeperson-select"
            label="${this._('Select')}"
          ></grampsjs-form-select-object>
        </div>
      </md-dialog>
    `
  }

  _handleHomePerson(e) {
    const obj = e.detail.objects[0]
    if (obj.object?.gramps_id) {
      this.appState.updateSettings({homePerson: obj.object.gramps_id}, true)
      this.homePersonDetails = obj
      this.renderRoot.querySelector('md-dialog')?.close()
    }
    e.preventDefault()
    e.stopPropagation()
  }
}

window.customElements.define('grampsjs-home-person', GrampsjsHomePerson)
