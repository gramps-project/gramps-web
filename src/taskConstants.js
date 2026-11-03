/*
Statuses and priorities of tasks, which are sources with the ToDo tag and
the attributes "Status" and "Priority"
*/

export const TASK_STATUSES = ['Open', 'In Progress', 'Blocked', 'Done']

// the values the app sets; any number below 5 counts as high and any number
// above as low
export const TASK_PRIORITIES = [
  {label: 'High', value: '1'},
  {label: 'Medium', value: '5'},
  {label: 'Low', value: '9'},
]

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
