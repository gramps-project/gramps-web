/*
Filters saved on this device, per tree.

`localStorage` holds `{[treeId]: [filter, ...]}` under `grampsjs_saved_filters`,
each filter `{id, namespace, name, rules}`. `namespace` is the endpoint name
of the list's object type, e.g. 'people', and `rules` the builder's top group
in the backend `rules` JSON (see `serializeNode` in filterBuilder.js).
*/

import {getTreeId} from './api.js'

const STORAGE_KEY = 'grampsjs_saved_filters'

function treeKey() {
  return getTreeId() || 'unknown'
}

function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return data !== null && typeof data === 'object' && !Array.isArray(data)
      ? data
      : {}
  } catch (_) {
    return {}
  }
}

function isValid(filter) {
  return (
    filter !== null &&
    typeof filter === 'object' &&
    typeof filter.id === 'string' &&
    typeof filter.namespace === 'string' &&
    typeof filter.name === 'string' &&
    filter.rules !== null &&
    typeof filter.rules === 'object'
  )
}

function readTree() {
  const filters = readAll()[treeKey()]
  return Array.isArray(filters) ? filters.filter(isValid) : []
}

// Returns whether the filters were stored
function writeTree(filters) {
  try {
    const data = readAll()
    data[treeKey()] = filters
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (_) {
    return false
  }
}

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

// The saved filters of an object type, sorted by name
export function loadSavedFilters(namespace) {
  return readTree()
    .filter(filter => filter.namespace === namespace)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Saves a filter and returns it, or null if storage failed. A filter of the
// same object type and name is replaced.
export function saveFilter(namespace, name, rules) {
  const filters = readTree()
  const existing = filters.find(
    filter => filter.namespace === namespace && filter.name === name
  )
  const filter = {id: existing?.id ?? newId(), namespace, name, rules}
  const others = filters.filter(f => f !== existing)
  return writeTree([...others, filter]) ? filter : null
}

// Returns whether the filter was removed from storage
export function deleteSavedFilter(id) {
  return writeTree(readTree().filter(filter => filter.id !== id))
}
