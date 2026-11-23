// src/placeDisplay.js
export const PLACE_DISPLAY_NAME = 'name'
export const PLACE_DISPLAY_TITLE = 'title'

export const PLACE_DISPLAY_OPTIONS = [PLACE_DISPLAY_NAME, PLACE_DISPLAY_TITLE]

const PLACE_DISPLAY_LABELS = {
  [PLACE_DISPLAY_NAME]: 'Name only',
  [PLACE_DISPLAY_TITLE]: 'Full hierarchy',
}

export function normalizePlaceDisplay(value) {
  return PLACE_DISPLAY_OPTIONS.includes(value) ? value : PLACE_DISPLAY_NAME
}

export function placeDisplayLabel(display, translate = value => value) {
  return translate(PLACE_DISPLAY_LABELS[normalizePlaceDisplay(display)])
}

// `place` is the full hierarchical title, `place_name` the place's own name;
// both come from the API profile.
export function placeDisplayText(placeProfile, display) {
  if (!placeProfile) return ''
  if (normalizePlaceDisplay(display) === PLACE_DISPLAY_TITLE) {
    return placeProfile.place || placeProfile.place_name || ''
  }
  return placeProfile.place_name || placeProfile.place || ''
}
