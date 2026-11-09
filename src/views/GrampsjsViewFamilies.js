/*
Families list view
*/

import {GrampsjsViewObjectsBase, tagsColumn} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import {
  associationsFilter,
  privacyFilter,
  tagFilter,
  textFilter,
  typeFilter,
} from '../filterDefinitions.js'

export class GrampsjsViewFamilies extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = [
      {name: 'Gramps ID', key: 'grampsId', sortKey: 'gramps_id'},
      {name: 'Father', key: 'father', sortKey: 'surname'},
      {name: 'Mother', key: 'mother'},
      {name: 'Relationship type:', key: 'relationship', defaultVisible: false},
      {name: 'Marriage Date', key: 'marriageDate'},
      {name: 'Marriage place', key: 'marriagePlace', defaultVisible: false},
      {name: 'Number of Children', key: 'children', defaultVisible: false},
      tagsColumn,
      {name: 'Last changed', key: 'change', sortKey: 'change'},
    ]
    this._objectsName = 'families'
  }

  get _supportsMerge() {
    return true
  }

  get _fetchUrl() {
    return `/api/families/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=self&keys=gramps_id,profile,change,handle,extended&extend=tag_list`
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `family/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_family'
  }

  get filterDefinitions() {
    const _ = s => this._(s)
    return [
      textFilter(_, {label: 'Father', rule: 'SearchFatherName'}),
      textFilter(_, {label: 'Mother', rule: 'SearchMotherName'}),
      textFilter(_, {label: 'Child', rule: 'SearchChildName'}),
      typeFilter(_, {
        label: 'Relationship type:',
        typeName: 'family_relation_types',
        rule: 'HasRelType',
      }),
      associationsFilter(_, filterCounts.families),
      tagFilter(_),
      privacyFilter(_, {rule: 'FamilyPrivate'}),
    ]
  }

  get canAdd() {
    // to add a family, permissions to edit people is needed too
    return this.appState.permissions.canAdd && this.appState.permissions.canEdit
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    return {
      grampsId: row.gramps_id,
      father: `${row?.profile?.father?.name_surname || '…'}, ${
        row?.profile?.father?.name_given || '…'
      }`,
      mother: `${row?.profile?.mother?.name_surname || '…'}, ${
        row?.profile?.mother?.name_given || '…'
      }`,
      relationship: row?.profile?.relationship,
      marriageDate: row?.profile?.marriage?.date,
      marriagePlace: row?.profile?.marriage?.place_name,
      children: row?.profile?.children?.length,
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
      tags: row?.extended?.tags ?? [],
    }
  }
}

window.customElements.define('grampsjs-view-families', GrampsjsViewFamilies)
