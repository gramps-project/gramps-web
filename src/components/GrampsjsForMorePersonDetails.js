/*
Form to get parameters for find more details about a person from other websites
*/

import {html} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'
import './GrampsjsTooltip.js'
import './GrampsjsFormSelectType.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsForMorePersonDetails extends GrampsjsObjectForm {
  constructor() {
    super()
    this.searchWebUrls = [
      {
        key: 'familySearch',
        value: 'FamilySearch',
        baseUrl: `https://familysearch.org/en/search/tree/results`,
        icon: 'grass',
      },
      {
        key: 'ancestry',
        value: 'Ancestry',
        baseUrl: `https://www.ancestry.com/search`,
        icon: 'temp_preferences_eco',
      },
      // {
      //   key: 'findMyPast',
      //   value: 'Findmypast',
      //   baseUrl: 'familySearch',
      //   icon: 'temp_preferences_eco',
      // },
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
  }

  renderForm() {
    return html`
      <div>
        <md-list>
          ${this.searchWebUrls.map(
            web => html` <div>
              <md-list-item
                type="button"
                href="${`${this._handleClick(web.baseUrl, web.key)}`}"
                target="_blank"
              >
                <span>${web.value}</span>
              </md-list-item>
            </div>`
          )}
        </md-list>
      </div>
    `
  }

  _handleClick(baseUrl, key) {
    let url = ''
    if (baseUrl && key) {
      switch (key) {
        case 'familySearch':
          url = `${baseUrl}?q.anyPlace=${this.data.place_name}&q.givenName=${this.data.name_given}&q.surname=${this.data.name_surname}`
          break
        case 'ancestry':
          url = `${baseUrl}?name=${this.data.name_given}_${this.data.name_surname}&event=${this.data.place_name}&searchMode=advanced`
          break
        default:
          url = ''
          break
      }
      return url
    }
    return url
  }
}

window.customElements.define(
  'grampsjs-for-more-person-details',
  GrampsjsForMorePersonDetails
)
