import {describe, it, expect, vi, afterEach} from 'vitest'
import '../../src/components/GrampsjsChat.js'
import {getChatTaskId, setChatTaskId} from '../../src/api.js'

const fakeJwt = claims => `header.${btoa(JSON.stringify(claims))}.signature`

const rateLimited = {
  state: 'FAILURE',
  result_object: {
    error: {
      code: 429,
      message:
        'The AI model provider is rate limiting requests. Please try again later.',
    },
  },
  info: '{"error": {"code": 429, "message": "The AI model provider is rate limiting requests. Please try again later."}}',
}

function makeChat(status) {
  const chat = document.createElement('grampsjs-chat')
  chat.appState = {
    i18n: {strings: {}},
    apiPost: vi.fn().mockResolvedValue({task: {id: 'T1'}}),
  }
  chat.messages = [{role: 'human', message: 'Who was my grandfather?'}]
  chat._pollChatTask = vi.fn(async (taskId, onProgress) => {
    onProgress?.({step: 1, tool: 'search', message: 'Preparing changes...'})
    return status
  })
  return chat
}

describe('a failed chat task', () => {
  it('ends loading and shows the error message of the task', async () => {
    const chat = makeChat(rateLimited)
    const error = vi.fn()
    chat.addEventListener('grampsjs:error', error)
    await chat._generateResponse()

    expect(chat.loading).toBe(false)
    expect(chat._liveToolCalls).toEqual([])
    expect(chat._liveStatus).toBe('')
    expect(chat.messages.at(-1)).toEqual({
      role: 'error',
      message: rateLimited.result_object.error.message,
    })
    expect(error.mock.calls[0][0].detail.message).toBe(
      rateLimited.result_object.error.message
    )
  })

  it('shows the error string of a backend without error payloads', async () => {
    const chat = makeChat({
      state: 'FAILURE',
      result_object: 'Task failed',
      info: 'Task failed',
    })
    await chat._generateResponse()

    expect(chat.loading).toBe(false)
    expect(chat.messages.at(-1)).toEqual({
      role: 'error',
      message: 'Task failed',
    })
  })

  describe('when resumed', () => {
    afterEach(() => {
      localStorage.removeItem('access_token')
      localStorage.removeItem('chatTaskId')
    })

    it('shows the error message and forgets the task', async () => {
      localStorage.setItem('access_token', fakeJwt({tree: 'tree1'}))
      setChatTaskId('T1')
      const chat = makeChat(rateLimited)
      await chat._resumePendingTask()

      expect(chat.loading).toBe(false)
      expect(chat.messages.at(-1)).toEqual({
        role: 'error',
        message: rateLimited.result_object.error.message,
      })
      expect(getChatTaskId()).toBeNull()
    })
  })
})
