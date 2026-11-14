import {getTaskResult, taskErrorMessage, translate} from './util.js'

const TASK_LOCKED_MESSAGE =
  'Another task is already running on this tree. Try again once it has finished.'

const SERVER_UNAVAILABLE_MESSAGE =
  'The server is unavailable or did not respond in time. Try again later.'

// Errors that proxies in front of the backend answer with. They send no
// message of their own, which leaves only the status code to show.
const PROXY_ERROR_MESSAGES = {
  413: 'The file is too large for the server to accept.',
  502: SERVER_UNAVAILABLE_MESSAGE,
  503: SERVER_UNAVAILABLE_MESSAGE,
  504: SERVER_UNAVAILABLE_MESSAGE,
}

/**
 * Returns the message to show for a failed POST that dispatches a background
 * task. A 409 of type `task_locked` means another task holds the tree's lock;
 * the active tasks are reloaded so the blocking one shows its progress.
 * Proxy errors without a message from the backend get a readable one.
 */
export function dispatchErrorMessage(appState, res) {
  const {status, response} = res.errorDetail ?? {}
  const strings = appState.i18n?.strings ?? {}
  if (status === 409 && response?.error?.type === 'task_locked') {
    appState.loadActiveTasks?.()
    return translate(strings, TASK_LOCKED_MESSAGE)
  }
  const backendMessage = response?.error?.message || response?.message
  if (status in PROXY_ERROR_MESSAGES && !backendMessage) {
    return translate(strings, PROXY_ERROR_MESSAGES[status])
  }
  return res.error
}

/**
 * Shows the progress of an upload, a fraction from 0 to 1, on the progress
 * indicator `prog`, with a tooltip saying that the file is being uploaded.
 * Once the file is sent, the server processes it for an unknown time, so the
 * indicator turns indeterminate; a full circle would read as done.
 */
export function showUploadProgress(appState, prog, fraction) {
  const strings = appState.i18n?.strings ?? {}
  /* eslint-disable no-param-reassign */
  if (fraction < 1) {
    prog.progress = fraction
    prog.infoMessage = translate(strings, 'Uploading file: %s').replace(
      '%s',
      `${Math.floor(100 * fraction)}%`
    )
  } else {
    prog.progress = -1
    prog.infoMessage = translate(strings, 'Processing...')
  }
  /* eslint-enable no-param-reassign */
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
  return {error: taskErrorMessage(status)}
}
