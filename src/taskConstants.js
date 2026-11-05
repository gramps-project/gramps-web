/*
Statuses and priorities of tasks, which are sources with the ToDo tag and
the attributes "Status" and "Priority"
*/

import {
  mdiAdjust,
  mdiCheckCircle,
  mdiChevronDoubleDown,
  mdiChevronDoubleUp,
  mdiHelp,
  mdiMinusCircle,
  mdiRadioboxBlank,
  mdiTimelapse,
} from '@mdi/js'

export const TASK_STATUSES = ['Open', 'In Progress', 'Blocked', 'Done']

// the values the app sets; any number below 5 counts as high and any number
// above as low
export const TASK_PRIORITIES = [
  {label: 'High', value: '1'},
  {label: 'Medium', value: '5'},
  {label: 'Low', value: '9'},
]

// icons of the statuses and priority labels, as {path, color}
export const STATUS_ICONS = {
  Open: {path: mdiRadioboxBlank, color: 'var(--grampsjs-task-open)'},
  'In Progress': {path: mdiTimelapse, color: 'var(--grampsjs-task-progress)'},
  Blocked: {
    path: mdiMinusCircle,
    color: 'var(--grampsjs-alert-error-font-color)',
  },
  Done: {path: mdiCheckCircle, color: 'var(--grampsjs-task-done)'},
}

export const PRIORITY_ICONS = {
  High: {
    path: mdiChevronDoubleUp,
    color: 'var(--grampsjs-alert-error-font-color)',
  },
  Medium: {path: mdiAdjust},
  Low: {
    path: mdiChevronDoubleDown,
    color: 'var(--grampsjs-alert-success-font-color)',
  },
}

// The icon of a status, also of one outside TASK_STATUSES. Done tasks fade
// in the list; elsewhere, e.g. as an option in a menu, `solid` keeps the
// icon in full color.
export function statusIcon(status, {solid = false} = {}) {
  if (status === 'Done' && solid) {
    return {...STATUS_ICONS.Done, color: 'var(--grampsjs-task-done-solid)'}
  }
  return STATUS_ICONS[status] ?? {path: mdiHelp}
}

export function taskAttribute(task, type) {
  return task?.attribute_list?.find(att => att.type === type)?.value
}

// The description of a task: the first note in its note list that exists,
// or undefined. Needs the task's extended notes.
export function taskNote(task) {
  const notes = task?.extended?.notes ?? []
  return (task?.note_list ?? [])
    .map(handle => notes.find(note => note?.handle === handle))
    .find(Boolean)
}

// 'High', 'Medium', 'Low', or '' for a missing or non-numeric priority
export function priorityLabel(priority) {
  if (priority === undefined || priority === null || priority === '') {
    return ''
  }
  const value = Number(priority)
  if (Number.isNaN(value)) {
    return ''
  }
  if (value < 5) {
    return 'High'
  }
  return value === 5 ? 'Medium' : 'Low'
}

// order of the statuses in the list; any other status comes before Done
const STATUS_ORDER = {Open: 1, 'In Progress': 2, Blocked: 3, Done: 5}
const OTHER_STATUS = 4

// Gramps priorities run from 0 to 9, so this sorts after all of them
const NO_PRIORITY = 10

function statusRank(task) {
  return STATUS_ORDER[taskAttribute(task, 'Status')] ?? OTHER_STATUS
}

function priorityRank(task) {
  const priority = taskAttribute(task, 'Priority')
  return priorityLabel(priority) ? Number(priority) : NO_PRIORITY
}

// By status, then with the highest priority first. The sort is stable, so
// tasks that tie keep their order.
export function sortTasks(tasks) {
  return [...tasks].sort(
    (a, b) => statusRank(a) - statusRank(b) || priorityRank(a) - priorityRank(b)
  )
}
