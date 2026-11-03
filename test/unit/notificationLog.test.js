import {describe, it, expect} from 'vitest'
import {GrampsjsViewNotificationLog} from '../../src/views/GrampsjsViewNotificationLog.js'

const makeLog = () => {
  const element = new GrampsjsViewNotificationLog()
  element.appState = {i18n: {strings: {}}}
  return element
}

describe('notification log: task entries', () => {
  it('states the outcome of finished tasks', () => {
    const log = makeLog()

    expect(log._sourceLabel({source: 'task', type: 'success'})).toBe(
      'Task completed'
    )
    expect(log._sourceLabel({source: 'task', type: 'error'})).toBe(
      'Task failed'
    )
    expect(log._sourceLabel({source: 'task', type: 'warning'})).toBe('Task')
    expect(log._sourceLabel({source: 'api', type: 'error'})).toBe('Network')
  })

  it('shows the message of a failed task', () => {
    const log = makeLog()
    const failed = detail => ({source: 'task', type: 'error', detail})

    expect(
      log._failureMessage(failed({info: 'boom', result_object: 'x'}))
    ).toBe('boom')
    expect(log._failureMessage(failed({info: null, result_object: 'x'}))).toBe(
      'x'
    )
    expect(
      log._failureMessage(failed({info: '', result_object: {code: 1}}))
    ).toBe('')
    expect(
      log._failureMessage(
        failed({
          info: '{"error": {"code": 500, "message": "Import failed"}}',
          result_object: {error: {code: 500, message: 'Import failed'}},
        })
      )
    ).toBe('Import failed')
    expect(
      log._failureMessage({source: 'api', type: 'error', detail: {info: 'a'}})
    ).toBe('')
  })
})
