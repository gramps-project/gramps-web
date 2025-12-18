/* eslint-disable class-methods-use-this */
/*
Form to get parameters for find more details about a person from other websites
*/

import {css, html} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'
import {
  mdiOpenInNew,
  mdiEarth,
  mdiShieldLockOutline,
  mdiCashLock,
} from '@mdi/js'
import {renderIcon} from '../icons.js'
import './GrampsjsTooltip.js'
import './GrampsjsFormSelectType.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

const EXTERNAL_SEARCH_WEBSITES = [
  {
    key: 'comgen',
    value: 'CompGen',
    websiteCriteria: {
      open: true,
      reqRegistration: false,
      reqPayment: false,
    },
    baseUrl: 'https://meta.genealogy.net/search',
    params: '?lastname={{name_surname}}&place={{place_name}}',
  },
  {
    key: 'familySearch',
    value: 'FamilySearch',
    websiteCriteria: {
      open: false,
      reqRegistration: true,
      reqPayment: false,
    },
    baseUrl: 'https://familysearch.org/en/search/tree/results',
    params:
      '?q.anyPlace={{place_name}}&q.givenName={{name_given}}&q.surname={{name_surname}}',
  },
  {
    key: 'ancestry',
    value: 'Ancestry',
    websiteCriteria: {
      open: false,
      reqRegistration: true,
      reqPayment: true,
    },
    baseUrl: 'https://www.ancestry.com/search',
    params:
      '?name={{name_given}}_{{name_surname}}&event={{place_name}}&searchMode=advanced',
  },
]

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
        .meta-icon svg {
          height: 0.8em;
        }
      `,
    ]
  }

  interpolateTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '')
  }

  getExternalSearchWebsitesData() {
    return EXTERNAL_SEARCH_WEBSITES.map(website => ({
      ...website,
      baseUrl: this.interpolateTemplate(website.baseUrl, this.data),
      params: this.interpolateTemplate(website.params, this.data),
    }))
  }

  getWebCriteriaIcon(websiteCriteria) {
    if (websiteCriteria.reqPayment) return mdiCashLock
    if (websiteCriteria.reqRegistration) return mdiShieldLockOutline
    if (websiteCriteria.open) return mdiEarth
    return ''
  }

  renderForm() {
    const searchWebUrls = this.getExternalSearchWebsitesData()

    return html`
      <div>
        <span>
          ${this._(
            `Select a web service to search for the person’s details. Some services require prior registration`
          )}
        </span>
        <md-list>
          ${searchWebUrls.map(
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
                <span class="meta-icon">
                  ${renderIcon(
                    this.getWebCriteriaIcon(web.websiteCriteria),
                    'var(--grampsjs-body-font-color-100)'
                  )}
                </span>
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
