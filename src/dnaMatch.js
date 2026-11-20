/*
Helpers for the association and notes that record a DNA match.
*/

// The association of `person` that records `match` from the DNA matches
// endpoint, or null if the person data does not contain it
export function matchAssociation(person, match) {
  const association = person?.person_ref_list?.[match?.person_ref_idx]
  if (association?.ref !== match?.handle || association?.rel !== 'DNA') {
    return null
  }
  return association
}

// The handles of the notes attached to `association` that hold segments of
// `match`, each once. Notes reached through a citation are left out, since
// other objects can share them.
export function matchSegmentNoteHandles(association, match) {
  const segmentNotes = new Set(match?.note_handles ?? [])
  return [...new Set(association?.note_list ?? [])].filter(handle =>
    segmentNotes.has(handle)
  )
}
