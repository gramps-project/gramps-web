import {GrampsjsViewRelationshipChart} from './GrampsjsViewRelationshipChart.js'

// Handles of people married to someone in the given set, excluding the set
// itself. Children of such couples are blood relatives already, so they are
// part of the set and need no extra fetching.
export function getSpouseHandles(people) {
  const known = new Set(people.map(p => p.handle))
  const spouses = new Set()
  for (const person of people) {
    for (const family of person.extended?.families ?? []) {
      for (const handle of [family.father_handle, family.mother_handle]) {
        if (handle && !known.has(handle)) {
          spouses.add(handle)
        }
      }
    }
  }
  return [...spouses]
}

export class GrampsjsViewBloodRelativesChart extends GrampsjsViewRelationshipChart {
  constructor() {
    super()
    // the set is defined by common ancestry, not by a generation depth
    this._setSep = false
    this._setSpouses = true
  }

  get includeSpouses() {
    return this.appState?.settings?.bloodRelativesSpouses ?? false
  }

  set includeSpouses(value) {
    this.appState.updateSettings({bloodRelativesSpouses: value}, false)
  }

  _resetLevels() {
    super._resetLevels()
    this.includeSpouses = false
  }

  // eslint-disable-next-line class-methods-use-this
  _getPersonRules(grampsId) {
    return {
      rules: [{name: 'HasCommonAncestorWith', values: [grampsId]}],
    }
  }

  async _fetchData(grampsId) {
    await super._fetchData(grampsId)
    if (!this.includeSpouses || this.error || this._data.length === 0) {
      return
    }
    const spouses = await this._fetchPeopleByHandle(
      getSpouseHandles(this._data)
    )
    this._data = [...this._data, ...spouses]
  }

  async _fetchPeopleByHandle(handles) {
    // chunked because gunicorn caps the request line at ~4 kB
    const chunks = []
    for (let i = 0; i < handles.length; i += 100) {
      chunks.push(handles.slice(i, i + 100))
    }
    const results = await Promise.all(
      chunks.map(chunk =>
        this.appState.apiGet(
          `/api/people/?handles=${chunk.join(',')}&locale=${
            this.appState.i18n.lang || 'en'
          }&profile=self&extend=event_ref_list,primary_parent_family,family_list`
        )
      )
    )
    return results.flatMap(result => result?.data ?? [])
  }
}

window.customElements.define(
  'grampsjs-view-blood-relatives-chart',
  GrampsjsViewBloodRelativesChart
)
