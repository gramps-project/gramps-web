// Pure async helpers for linking people via family objects in the tree chart.
// Each function takes appState and the clicked person's full data object
// (including person.extended from the tree fetch).

function cleanFamily(familyData) {
  const {extended, profile, backlinks, formatted, ...clean} = familyData
  return clean
}

// gender: 0 = female → mother slot, anything else → father slot
function parentSlot(gender) {
  return gender === 0 ? 'mother_handle' : 'father_handle'
}

export async function linkParent(appState, personData, parentHandle, role) {
  const parentFamily = personData.extended?.primary_parent_family
  if (parentFamily?.handle) {
    return appState.apiPut(`/api/families/${parentFamily.handle}`, {
      _class: 'Family',
      ...cleanFamily(parentFamily),
      [`${role}_handle`]: parentHandle,
    })
  }
  return appState.apiPost('/api/families/', {
    _class: 'Family',
    [`${role}_handle`]: parentHandle,
    child_ref_list: [{_class: 'ChildRef', ref: personData.handle}],
  })
}

export async function linkChild(appState, personData, childHandle, frel, mrel) {
  const childRef = {_class: 'ChildRef', ref: childHandle}
  if (frel) childRef.frel = frel
  if (mrel) childRef.mrel = mrel

  // If the person is already in exactly one family as a parent/spouse, add the
  // child to that family instead of creating a new one.
  const existingFamilies = personData.extended?.families ?? []
  if (existingFamilies.length === 1) {
    const family = existingFamilies[0]
    return appState.apiPut(`/api/families/${family.handle}`, {
      _class: 'Family',
      ...cleanFamily(family),
      child_ref_list: [...(family.child_ref_list ?? []), childRef],
    })
  }

  return appState.apiPost('/api/families/', {
    _class: 'Family',
    [parentSlot(personData.gender)]: personData.handle,
    child_ref_list: [childRef],
  })
}

export async function linkSpouse(appState, personData, spouseHandle) {
  const slot = parentSlot(personData.gender)
  const otherSlot = slot === 'father_handle' ? 'mother_handle' : 'father_handle'
  return appState.apiPost('/api/families/', {
    _class: 'Family',
    [slot]: personData.handle,
    [otherSlot]: spouseHandle,
  })
}
