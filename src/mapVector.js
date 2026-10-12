// Vector map files (KML and GeoJSON) stored as media objects.

import {kml} from '@tmcw/togeojson'
import {getMediaUrl} from './api.js'

const KML_MIMES = ['application/vnd.google-earth.kml+xml']
const GEOJSON_MIMES = ['application/geo+json', 'application/vnd.geo+json']

// 'kml', 'geojson' or null. The backend detects mime types from the file
// content, which usually labels GeoJSON as plain JSON, so the file extension
// counts as well.
export function vectorFormat(media) {
  const mime = media?.mime ?? ''
  const path = media?.path ?? ''
  if (KML_MIMES.includes(mime) || /\.kml$/i.test(path)) return 'kml'
  if (GEOJSON_MIMES.includes(mime) || /\.geojson$/i.test(path)) {
    return 'geojson'
  }
  return null
}

function toFeatureCollection(obj) {
  if (obj?.type === 'FeatureCollection' && Array.isArray(obj.features)) {
    return obj
  }
  if (obj?.type === 'Feature') {
    return {type: 'FeatureCollection', features: [obj]}
  }
  if (Array.isArray(obj?.coordinates) || Array.isArray(obj?.geometries)) {
    return {
      type: 'FeatureCollection',
      features: [{type: 'Feature', geometry: obj, properties: {}}],
    }
  }
  return null
}

// A GeoJSON FeatureCollection, or null if the file can't be read.
export function parseVector(text, format) {
  try {
    if (format === 'kml') {
      const doc = new DOMParser().parseFromString(text, 'text/xml')
      if (doc.getElementsByTagName('parsererror').length > 0) return null
      return toFeatureCollection(kml(doc))
    }
    if (format === 'geojson') {
      return toFeatureCollection(JSON.parse(text))
    }
  } catch {
    return null
  }
  return null
}

// Extends box, [west, south, east, north], by all positions in coordinates.
function extendByCoordinates(box, coordinates) {
  if (!Array.isArray(coordinates)) return
  if (typeof coordinates[0] === 'number') {
    const [lng, lat] = coordinates
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
    box[0] = Math.min(box[0], lng)
    box[1] = Math.min(box[1], lat)
    box[2] = Math.max(box[2], lng)
    box[3] = Math.max(box[3], lat)
    return
  }
  coordinates.forEach(c => extendByCoordinates(box, c))
}

function extendByGeometry(box, geometry) {
  if (!geometry) return
  if (geometry.type === 'GeometryCollection') {
    ;(geometry.geometries ?? []).forEach(g => extendByGeometry(box, g))
    return
  }
  extendByCoordinates(box, geometry.coordinates)
}

// [[west, south], [east, north]] of all features, or null if there are no
// coordinates.
export function vectorBounds(featureCollections) {
  const box = [Infinity, Infinity, -Infinity, -Infinity]
  for (const fc of featureCollections) {
    for (const feature of fc?.features ?? []) {
      extendByGeometry(box, feature?.geometry)
    }
  }
  if (box[0] === Infinity) return null
  return [
    [box[0], box[1]],
    [box[2], box[3]],
  ]
}

// Downloads and parses a vector media object: {handle, data}, or null.
export async function fetchVector(media, {signal} = {}) {
  const format = vectorFormat(media)
  if (!format) return null
  try {
    const res = await fetch(getMediaUrl(media.handle), {signal})
    if (!res.ok) return null
    const data = parseVector(await res.text(), format)
    return data ? {handle: media.handle, data} : null
  } catch {
    return null
  }
}
