import {getTaskResult} from './util.js'

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
    prog.setError()
    prog.errorMessage = res.error
    return {error: res.error}
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
