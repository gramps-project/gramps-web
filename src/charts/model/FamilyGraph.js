// Index of the people returned by the people endpoint with
// `extend=primary_parent_family,family_list`.
export class FamilyGraph {
  constructor(people = []) {
    this._people = new Map()
    this._peopleByGrampsId = new Map()
    for (const person of people) {
      this._people.set(person.handle, person)
      if (!this._peopleByGrampsId.has(person.gramps_id)) {
        this._peopleByGrampsId.set(person.gramps_id, person)
      }
    }
  }

  // Returns the person with the given handle, or undefined if not fetched
  person(handle) {
    return this._people.get(handle)
  }

  // Returns the person with the given Gramps ID, or undefined if not fetched
  personByGrampsId(grampsId) {
    return this._peopleByGrampsId.get(grampsId)
  }

  // Returns the father and mother handles of the person's primary parent
  // family, with an empty string for an unknown parent
  parents(handle) {
    const family = this.person(handle)?.extended?.primary_parent_family
    return {
      father: family?.father_handle || '',
      mother: family?.mother_handle || '',
    }
  }

  // Returns the handles of the person's children in all families where they
  // are a parent. With `birthOnly`, only children whose relation to this
  // parent is Birth are included.
  children(handle, {birthOnly = false} = {}) {
    const families = this.person(handle)?.extended?.families || []
    return families.flatMap(family => {
      const isFather = family.father_handle === handle
      if (!isFather && family.mother_handle !== handle) {
        return []
      }
      const relationKey = isFather ? 'frel' : 'mrel'
      return (family.child_ref_list || [])
        .filter(childRef => !birthOnly || childRef[relationKey] === 'Birth')
        .map(childRef => childRef.ref)
    })
  }
}
