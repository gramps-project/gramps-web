import {getTaskResult, translate} from './util.js'

const TASK_LOCKED_MESSAGE =
  'Another task is already running on this tree. Try again once it has finished.'

/**
 * Returns the message to show for a failed POST that dispatches a background
 * task. A 409 of type `task_locked` means another task holds the tree's lock;
 * the active tasks are reloaded so the blocking one shows its progress.
 */
export function dispatchErrorMessage(appState, res) {
  const {status, response} = res.errorDetail ?? {}
  if (status !== 409 || response?.error?.type !== 'task_locked') {
    return res.error
  }
  appState.loadActiveTasks?.()
  return translate(appState.i18n?.strings ?? {}, TASK_LOCKED_MESSAGE)
}

// Resolves with the final status of a task once appState reports it as
// finished. appState fires these events on window with the task id; the
// progress indicator's events of the same name carry none and are ignored.
function waitForTask(taskId) {
  return new Promise(resolve => {
    const handler = e => {
      if (e.detail?.taskId !== taskId) {
        return
      }
      window.removeEventListener('task:complete', handler)
      window.removeEventListener('task:error', handler)
      resolve(e.detail.status)
    }
    window.addEventListener('task:complete', handler)
    window.addEventListener('task:error', handler)
  })
}

/**
 * Settles the response of a POST to an endpoint that answers either with the
 * result itself or with a queued background task ({task: {id}}). Resolves
 * with `{data}`, the immediate or the task result, or with `{error}`.
 *
 * `prog` is the progress indicator showing the operation; `label` and
 * `taskName` register a queued task with appState.
 */
export async function awaitTaskResponse(
  appState,
  res,
  {prog, label, taskName}
) {
  if ('error' in res) {
    const error = dispatchErrorMessage(appState, res)
    prog.setError()
    prog.errorMessage = error
    return {error}
  }
  if (!('task' in res)) {
    prog.setComplete()
    return {data: res.data}
  }
  const taskId = res.task?.id || ''
  if (!taskId) {
    prog.setError()
    return {error: ''}
  }
  const finished = waitForTask(taskId)
  appState.registerTask(taskId, label, {taskName})
  prog.taskId = taskId
  const status = await finished
  if (status?.state === 'SUCCESS') {
    return {data: getTaskResult(status)}
  }
  return {error: status?.info || ''}
}
