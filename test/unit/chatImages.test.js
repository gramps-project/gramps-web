import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'

vi.mock('../../src/chatImages.js', async importOriginal => ({
  ...(await importOriginal()),
  readChatImage: vi.fn(),
}))

const {chatVisionAvailable, scaledSize, readChatImage, MAX_CHAT_IMAGES} =
  await import('../../src/chatImages.js')
await import('../../src/components/GrampsjsChat.js')

const image = name => ({
  data: `data:image/jpeg;base64,${name}`,
  thumbnail: `data:image/jpeg;base64,${name}-thumb`,
})

const file = (name, type = 'image/png') => new File(['x'], name, {type})

describe('chat vision', () => {
  const dbInfo = (version, chatVision) => ({
    gramps_webapi: {version},
    server: {chat: true, chat_vision: chatVision},
  })

  it('needs API 3.26 and the server reporting it', () => {
    expect(chatVisionAvailable(dbInfo('3.26.0', true))).toBe(true)
    expect(chatVisionAvailable(dbInfo('3.26.0', false))).toBe(false)
    expect(chatVisionAvailable(dbInfo('3.26.0', undefined))).toBe(false)
    expect(chatVisionAvailable(dbInfo('3.25.2', true))).toBe(false)
    expect(chatVisionAvailable(undefined)).toBe(false)
  })
})

describe('scaledSize', () => {
  it('fits the long edge and keeps the aspect ratio', () => {
    expect(scaledSize(4000, 2000, 1568)).toEqual({width: 1568, height: 784})
    expect(scaledSize(1000, 3000, 240)).toEqual({width: 80, height: 240})
  })

  it('keeps small images and never reaches zero', () => {
    expect(scaledSize(100, 50, 1568)).toEqual({width: 100, height: 50})
    expect(scaledSize(10000, 1, 240)).toEqual({width: 240, height: 1})
  })
})

describe('sending images', () => {
  function makeChat(messages = []) {
    const chat = document.createElement('grampsjs-chat')
    const apiPost = vi.fn().mockResolvedValue({data: {response: 'A grave.'}})
    chat.appState = {apiPost, i18n: {strings: {}}}
    chat.messages = messages
    chat._addMessage = vi.fn(async (message, maxLength) => {
      chat.messages = [...chat.messages.slice(-(maxLength - 1)), message]
    })
    return {chat, apiPost}
  }

  it('uploads the images and keeps only their thumbnails', async () => {
    const {chat, apiPost} = makeChat()
    chat._handlePrompt({
      detail: {message: 'What is this?', images: [image('a'), image('b')]},
    })
    await vi.waitFor(() => expect(chat.loading).toBe(false))

    expect(apiPost.mock.calls[0][1]).toEqual({
      query: 'What is this?',
      images: ['data:image/jpeg;base64,a', 'data:image/jpeg;base64,b'],
    })
    expect(chat.messages[0]).toEqual({
      role: 'human',
      message: 'What is this?',
      images: [
        'data:image/jpeg;base64,a-thumb',
        'data:image/jpeg;base64,b-thumb',
      ],
    })
  })

  it('sends no images key without images', async () => {
    const {chat, apiPost} = makeChat()
    chat._handlePrompt({detail: {message: 'Hi'}})
    await vi.waitFor(() => expect(chat.loading).toBe(false))
    expect(apiPost.mock.calls[0][1]).toEqual({query: 'Hi'})
    expect(chat.messages[0]).toEqual({role: 'human', message: 'Hi'})
  })

  it('leaves thumbnails out of the plain history', async () => {
    const {chat, apiPost} = makeChat([
      {role: 'human', message: 'What is this?', images: ['thumb']},
      {role: 'error', message: 'An error occurred'},
    ])
    chat._handlePrompt({detail: {message: 'Again', images: []}})
    await vi.waitFor(() => expect(chat.loading).toBe(false))
    expect(apiPost.mock.calls[0][1]).toEqual({
      query: 'Again',
      history: [
        {role: 'human', message: 'What is this?'},
        {role: 'error', message: 'An error occurred'},
      ],
    })
  })
})

describe('attaching images in the prompt', () => {
  let prompt

  beforeEach(() => {
    readChatImage.mockReset()
    readChatImage.mockImplementation(async f => image(f.name))
    prompt = document.createElement('grampsjs-chat-prompt')
    prompt.appState = {i18n: {strings: {}}}
    prompt.vision = true
    document.body.appendChild(prompt)
  })

  afterEach(() => {
    prompt.remove()
  })

  it('ignores other files and images beyond the maximum', async () => {
    await prompt._addFiles([
      file('a.png'),
      file('notes.txt', 'text/plain'),
      file('b.jpg', 'image/jpeg'),
    ])
    await prompt._addFiles([file('c.png'), file('d.png'), file('e.png')])
    expect(prompt.images.map(i => i.data)).toEqual(
      ['a.png', 'b.jpg', 'c.png', 'd.png'].map(
        n => `data:image/jpeg;base64,${n}`
      )
    )
    expect(prompt.images).toHaveLength(MAX_CHAT_IMAGES)
    expect(readChatImage).toHaveBeenCalledTimes(MAX_CHAT_IMAGES)
  })

  it('counts images still being read towards the maximum', async () => {
    const first = prompt._addFiles([
      file('a.png'),
      file('b.png'),
      file('c.png'),
    ])
    const second = prompt._addFiles([file('d.png'), file('e.png')])
    await Promise.all([first, second])
    expect(prompt.images).toHaveLength(MAX_CHAT_IMAGES)
    expect(prompt._reading).toBe(0)
  })

  it('reports files it cannot read and keeps the others', async () => {
    readChatImage.mockImplementation(async f => {
      if (f.name === 'broken.png') throw new Error('decode')
      return image(f.name)
    })
    const errors = []
    prompt.addEventListener('grampsjs:error', e => errors.push(e.detail))
    await prompt._addFiles([file('broken.png'), file('ok.png')])
    expect(prompt.images.map(i => i.data)).toEqual([
      'data:image/jpeg;base64,ok.png',
    ])
    expect(errors).toEqual([{message: 'Could not open file: broken.png'}])
  })

  it('sends the images with the prompt and clears them', async () => {
    await prompt.updateComplete
    const events = []
    prompt.addEventListener('chat:prompt', e => events.push(e.detail))
    prompt.images = [image('a')]
    prompt.value = 'What is this?'
    prompt._submit()
    expect(events).toEqual([{message: 'What is this?', images: [image('a')]}])
    expect(prompt.images).toEqual([])
  })

  it('does not send while an image is being read', () => {
    const events = []
    prompt.addEventListener('chat:prompt', e => events.push(e.detail))
    prompt._reading = 1
    prompt.value = 'What is this?'
    prompt._submit()
    expect(events).toEqual([])
  })

  it('attaches pasted images only without pasted text', () => {
    const addFiles = vi.spyOn(prompt, '_addFiles').mockResolvedValue()
    const pasted = file('a.png')
    const paste = types => ({
      clipboardData: {types, files: [pasted]},
      preventDefault: vi.fn(),
    })
    const withText = paste(['text/plain', 'Files'])
    prompt._handlePaste(withText)
    expect(addFiles).not.toHaveBeenCalled()
    expect(withText.preventDefault).not.toHaveBeenCalled()

    const imageOnly = paste(['Files'])
    prompt._handlePaste(imageOnly)
    expect(addFiles).toHaveBeenCalledWith([pasted])
    expect(imageOnly.preventDefault).toHaveBeenCalled()
  })
})
