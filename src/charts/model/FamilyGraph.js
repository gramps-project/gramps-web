// Index of the people returned by the people endpoint with
// `extend=primary_parent_family,family_list`, and optionally
// `parent_family_list`, and of the families they refer to.
export class FamilyGraph {
  constructor(people = []) {
    this._people = new Map()
    this._peopleByGrampsId = new Map()
    this._families = new Map()
    for (const person of people) {
      this._people.set(person.handle, person)
      if (!this._peopleByGrampsId.has(person.gramps_id)) {
        this._peopleByGrampsId.set(person.gramps_id, person)
      }
      const {
        families = [],
        primary_parent_family: primaryParentFamily,
        parent_families: parentFamilies = [],
      } = person.extended ?? {}
      for (const family of [
        ...families,
        primaryParentFamily,
        ...parentFamilies,
      ]) {
        if (family?.handle && !this._families.has(family.handle)) {
          this._families.set(family.handle, family)
        }
      }
    }
  }

  // Returns all people, in the order they were fetched
  people() {
    return [...this._people.values()]
  }

  // Returns the person with the given handle, or undefined if not fetched
  person(handle) {
    return this._people.get(handle)
  }

  // Returns the person with the given Gramps ID, or undefined if not fetched
  personByGrampsId(grampsId) {
    return this._peopleByGrampsId.get(grampsId)
  }

  // Returns the family with the given handle, or undefined if no fetched
  // person refers to it
  family(handle) {
    return this._families.get(handle)
  }

  // Returns the families in the person's family list, in which they are a
  // partner
  partnerFamilies(handle) {
    return this.person(handle)?.extended?.families ?? []
  }

  // Returns the person's parent families: the primary one first, then the
  // other ones if they were fetched with `extend=parent_family_list`
  parentFamilies(handle) {
    const extended = this.person(handle)?.extended ?? {}
    const seen = new Set()
    return [
      extended.primary_parent_family,
      ...(extended.parent_families ?? []),
    ].filter(family => {
      if (!family?.handle || seen.has(family.handle)) {
        return false
      }
      seen.add(family.handle)
      return true
    })
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

  // Returns the relation of the person, such as Birth or Adopted, to the
  // father and the mother of their primary parent family
  parentRelations(handle) {
    const family = this.person(handle)?.extended?.primary_parent_family
    const childRef = family?.child_ref_list?.find(({ref}) => ref === handle)
    return {
      father: childRef?.frel || 'Birth',
      mother: childRef?.mrel || 'Birth',
    }
  }

  // Returns the person's children in all families where they are a parent,
  // each with its `handle` and its `relation` to this parent
  childRelations(handle) {
    return this.partnerFamilies(handle).flatMap(family => {
      const isFather = family.father_handle === handle
      if (!isFather && family.mother_handle !== handle) {
        return []
      }
      return (family.child_ref_list || []).map(childRef => ({
        handle: childRef.ref,
        relation: (isFather ? childRef.frel : childRef.mrel) || 'Birth',
      }))
    })
  }

  // Returns the handles of the person's children in all families where they
  // are a parent
  children(handle) {
    return this.childRelations(handle).map(child => child.handle)
  }
}
