/*
Form to get parameters for find more details about a person from other websites
*/

import {css, html} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'
import {mdiOpenInNew} from '@mdi/js'
import {renderIcon} from '../icons.js'
import './GrampsjsTooltip.js'
import './GrampsjsFormSelectType.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormExternalSearch extends GrampsjsObjectForm {
  static get styles() {
    return [
      super.styles,
      css`
        .button-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5em;
          margin-bottom: 10px;
        }
      `,
    ]
  }

  renderForm() {
    this.searchWebUrls = [
      {
        key: 'familySearch',
        value: 'FamilySearch',
        baseUrl: `https://familysearch.org/en/search/tree/results`,
        params: `?q.anyPlace=${this.data.place_name}&q.givenName=${this.data.name_given}&q.surname=${this.data.name_surname}`,
      },
      {
        key: 'ancestry',
        value: 'Ancestry',
        baseUrl: `https://www.ancestry.com/search`,
        params: `?name=${this.data.name_given}_${this.data.name_surname}&event=${this.data.place_name}&searchMode=advanced`,
      },
      {
        key: 'genealogy',
        value: 'Genealogy',
        baseUrl: 'https://meta.genealogy.net/search',
        params: `?lastname=${this.data.name_surname}&place=${this.data.place_name}`,
      },
      // {
      //   key: 'myHeritage',
      //   value: 'MyHeritage',
      //   baseUrl: 'familySearch',
      //   icon: 'temp_preferences_eco',
      // },
      // {
      //   key: 'geneanet',
      //   value: 'Geneanet',
      //   baseUrl: 'familySearch',
      //   icon: 'temp_preferences_eco',
      // },
      // {
      //   key: 'filae',
      //   value: 'Filae',
      //   baseUrl: 'familySearch',
      //   icon: 'temp_preferences_eco',
      // },
      // {
      //   key: 'google',
      //   value: 'Google',
      //   baseUrl: 'familySearch',
      //   icon: 'temp_preferences_eco',
      // },
    ]

    return html`
      <div>
        <span>
          ${this._(
            `Select a web service to search for the person details. Some of the services require prior registration`
          )}
        </span>
        <md-list>
          ${this.searchWebUrls.map(
            web => html` <div>
              <md-list-item
                type="button"
                href="${`${web.baseUrl}${web.params}`}"
                target="_blank"
              >
                <span class="icon">
                  ${renderIcon(
                    mdiOpenInNew,
                    'var(--grampsjs-body-font-color-100)'
                  )}
                </span>
                <span> ${web.value} </span>
              </md-list-item>
            </div>`
          )}
        </md-list>
      </div>
    `
  }
}

window.customElements.define(
  'grampsjs-form-external-search',
  GrampsjsFormExternalSearch
)
