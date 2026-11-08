/*
People list view
*/

import {GrampsjsViewObjectsBase, tagsColumn} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, personFilter, filterCounts} from '../util.js'
import {
  associationsFilter,
  privacyFilter,
  propertiesFilter,
  tagFilter,
  textFilter,
  yearsFilter,
} from '../filterDefinitions.js'

export class GrampsjsViewPeople extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = [
      {name: 'Gramps ID', key: 'grampsId', sortKey: 'gramps_id'},
      {name: 'Surname', key: 'surname', sortKey: 'surname'},
      {name: 'Given name', key: 'given'},
      {name: 'Birth Date', key: 'birth', sortKey: 'birth'},
      {name: 'Birth Place', key: 'birthPlace', defaultVisible: false},
      {
        name: 'Death Date',
        key: 'death',
        sortKey: 'death',
      },
      {name: 'Death Place', key: 'deathPlace', defaultVisible: false},
      {name: 'Age at death', key: 'age', defaultVisible: false},
      tagsColumn,
      {name: 'Last changed', key: 'change', sortKey: 'change'},
    ]
    this._objectsName = 'people'
  }

  get _supportsMerge() {
    return true
  }

  get _fetchUrl() {
    return `/api/people/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=self,age&precision=1&keys=gramps_id,profile,change,handle,extended&extend=tag_list`
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `person/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_person'
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const birthDate = row?.profile?.birth?.date
    const deathDate = row?.profile?.death?.date
    const age = row?.profile?.death?.age ?? ''
    return {
      grampsId: row.gramps_id,
      surname: row?.profile?.name_surname,
      given: row?.profile?.name_given,
      birth: birthDate,
      birthPlace: row?.profile?.birth?.place_name,
      death: deathDate,
      deathPlace: row?.profile?.death?.place_name,
      age: birthDate && deathDate && /\d/.test(age) ? age : '',
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
      tags: row?.extended?.tags ?? [],
    }
  }

  get filterDefinitions() {
    const _ = s => this._(s)
    return [
      textFilter(_, {label: 'Name', rule: 'SearchName'}),
      yearsFilter(_, {label: 'Birth year', rule: 'HasBirth'}),
      yearsFilter(_, {label: 'Death year', rule: 'HasDeath'}),
      propertiesFilter(_, personFilter),
      associationsFilter(_, filterCounts.people),
      tagFilter(_),
      privacyFilter(_, {
        rule: 'PeoplePrivate',
        publicRule: 'PeoplePublic',
      }),
    ]
  }
}

window.customElements.define('grampsjs-view-people', GrampsjsViewPeople)
