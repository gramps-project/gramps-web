/*
Filters for the places on the map view: by time and by event type.
A place is shown if one of its events matches all active filters.
*/

import {isDateBetweenYears} from './util.js'

// Spans in years that the time filter offers around the selected year.
export const TIME_SPANS = [1, 10, 25, 50, 100]

// Event types come as strings or as Gramps type objects.
export function eventTypeKey(type) {
  if (typeof type === 'string') return type
  return type?.string || type?.value || ''
}

// The years the time filter covers, or null while it is off.
export function yearRange(year, span, enabled) {
  if (!enabled || !(year > 0)) return null
  return {min: year - span, max: year + span}
}

export function eventMatches(event, {years, eventTypes}) {
  if (years && !isDateBetweenYears(event?.date, years.min, years.max)) {
    return false
  }
  if (eventTypes.size > 0 && !eventTypes.has(eventTypeKey(event?.type))) {
    return false
  }
  return true
}

// Places with at least one event matching all filters. Without active
// filters, all places, including those without events.
export function filterPlaces(places, eventsByPlace, {years, eventTypes}) {
  const types = new Set(eventTypes)
  if (!years && types.size === 0) return places
  return places.filter(place =>
    (eventsByPlace.get(place.handle) ?? []).some(event =>
      eventMatches(event, {years, eventTypes: types})
    )
  )
}

// The event types occurring in the events, most frequent first.
export function countEventTypes(events) {
  const counts = new Map()
  for (const event of events) {
    const type = eventTypeKey(event?.type)
    if (type) counts.set(type, (counts.get(type) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([type, count]) => ({type, count}))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
}
