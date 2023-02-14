// Utility functions for d3.js charts.

import {getThumbnailUrl, getThumbnailUrlCropped} from '../api.js'

export const getPerson = (data, handle) =>
  data.find(person => person.handle === handle) || {}

export const getPersonByGrampsId = (data, grampsId) =>
  data.find(person => person.gramps_id === grampsId) || {}

export const getImageUrl = (person, size, square = true) => {
  if (!person.media_list || person.media_list.length === 0) {
    return ''
  }
  const [mediaRef] = person.media_list
  if (!mediaRef.rect || mediaRef.rect.length === 0) {
    return getThumbnailUrl(mediaRef.ref, size, square)
  }
  return getThumbnailUrlCropped(mediaRef.ref, mediaRef.rect, size, square)
}

export const getTree = (
  data,
  handle,
  depth,
  includeEmpty = true,
  i = 0,
  label = 'p'
) => {
  if (depth === 0) {
    return {}
  }
  const person = getPerson(data, handle)
  const tree = {
    name_given: person?.profile ? person?.profile?.name_given : null,
    name_surname: person?.profile ? person?.profile?.name_surname : null,
    id: label,
    depth: i,
    person,
  }
  if (depth === 1) {
    return tree
  }
  const fatherHandle =
    person?.extended?.primary_parent_family?.father_handle || ''
  const motherHandle =
    person?.extended?.primary_parent_family?.mother_handle || ''
  tree.children = []
  if (fatherHandle || includeEmpty) {
    tree.children.push(
      getTree(data, fatherHandle, depth - 1, includeEmpty, i + 1, `${label}f`)
    )
  }
  if (motherHandle || includeEmpty) {
    tree.children.push(
      getTree(data, motherHandle, depth - 1, includeEmpty, i + 1, `${label}m`)
    )
  }
  return tree
}

export const getDescendantTree = (data, handle, depth, i = 0, label = 'p') => {
  if (depth === 0) {
    return {}
  }
  const person = getPerson(data, handle)
  const tree = {
    name_given: person?.profile ? person?.profile?.name_given : null,
    name_surname: person?.profile ? person?.profile?.name_surname : null,
    id: label,
    depth: i,
    person,
  }
  if (depth === 1) {
    return tree
  }
  const childHandles = (person?.extended?.families || [])
    .flatMap(fam => fam.child_ref_list)
    .map(cref => cref.ref)
  tree.children = childHandles.map((childHandle, childInd) =>
    getTree(data, childHandle, depth - 1, false, i + 1, `${label}c${childInd}`)
  )
  return tree
}
