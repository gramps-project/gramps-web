import {describe, it, expect, vi} from 'vitest'
import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'

const makeElement = ({username, fullName, currentUsername = 'old-name'}) => {
  const element = new GrampsjsViewSettingsUser()
  const shadowRoot = element.createRenderRoot()
  const usernameField = document.createElement('input')
  const fullNameField = document.createElement('input')
  const apiPut = vi.fn().mockResolvedValue({data: {}})

  usernameField.id = 'change-username'
  usernameField.value = username
  fullNameField.id = 'change-full-name'
  fullNameField.value = fullName
  shadowRoot.append(usernameField, fullNameField)

  element.appState = {apiPut}
  element._userInfo = {name: currentUsername}
  element._fetchOwnUserDetails = vi.fn().mockResolvedValue()
  vi.spyOn(element, 'dispatchEvent')

  return {element, apiPut}
}

describe('user profile settings', () => {
  it('submits a changed username', async () => {
    const {element, apiPut} = makeElement({
      username: 'new-name',
      fullName: 'New Full Name',
    })

    await element._changeUsername()

    expect(apiPut).toHaveBeenCalledWith('/api/users/-/', {
      name_new: 'new-name',
    })
    expect(element.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'grampsjs:notification',
        detail: {message: 'Username successfully updated'},
      })
    )
    expect(element._fetchOwnUserDetails).toHaveBeenCalledOnce()
  })

  it('does not submit an unchanged username', async () => {
    const {element, apiPut} = makeElement({
      username: ' old-name ',
      fullName: 'Updated Full Name',
    })

    await element._changeUsername()

    expect(apiPut).not.toHaveBeenCalled()
    expect(element._fetchOwnUserDetails).not.toHaveBeenCalled()
  })

  it('shows an error when the username is empty', async () => {
    const {element, apiPut} = makeElement({
      username: '   ',
      fullName: 'Old Full Name',
    })

    await element._changeUsername()

    expect(apiPut).not.toHaveBeenCalled()
    expect(element.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'grampsjs:error',
        detail: {message: 'Username cannot be empty'},
      })
    )
    expect(element._fetchOwnUserDetails).not.toHaveBeenCalled()
  })

  it('submits a changed full name without resending the username', async () => {
    const {element, apiPut} = makeElement({
      username: 'old-name',
      fullName: 'Updated Full Name',
    })

    await element._changeFullName()

    expect(apiPut).toHaveBeenCalledWith('/api/users/-/', {
      full_name: 'Updated Full Name',
    })
    expect(element.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'grampsjs:notification',
        detail: {message: 'Full name successfully updated'},
      })
    )
    expect(element._fetchOwnUserDetails).toHaveBeenCalledOnce()
  })

  it('shows a specific error when the username is already taken', async () => {
    const {element, apiPut} = makeElement({
      username: 'existing-name',
      fullName: 'Old Full Name',
    })
    apiPut.mockResolvedValue({
      error: 'Conflict',
      errorDetail: {status: 409},
    })

    await element._changeUsername()

    expect(element.error).toBe(true)
    expect(element._errorMessage).toBe('This user name is already in use')
    expect(element._fetchOwnUserDetails).not.toHaveBeenCalled()
  })
})
