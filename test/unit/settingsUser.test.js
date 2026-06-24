import {describe, it, expect, vi} from 'vitest'
import {GrampsjsViewSettingsUser} from '../../src/views/GrampsjsViewSettingsUser.js'

const makeElement = ({username, fullName, currentUsername = 'old-name'}) => {
  const element = new GrampsjsViewSettingsUser()
  const shadowRoot = element.attachShadow({mode: 'open'})
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
  it('submits a changed username and full name', async () => {
    const {element, apiPut} = makeElement({
      username: 'new-name',
      fullName: 'New Full Name',
    })

    await element._changeProfile()

    expect(apiPut).toHaveBeenCalledWith('/api/users/-/', {
      name_new: 'new-name',
      full_name: 'New Full Name',
    })
    expect(element.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'grampsjs:notification',
        detail: {message: 'User details successfully updated'},
      })
    )
    expect(element._fetchOwnUserDetails).toHaveBeenCalledOnce()
  })

  it('submits a changed full name without resending the username', async () => {
    const {element, apiPut} = makeElement({
      username: ' old-name ',
      fullName: 'Updated Full Name',
    })

    await element._changeProfile()

    expect(apiPut).toHaveBeenCalledWith('/api/users/-/', {
      full_name: 'Updated Full Name',
    })
    expect(element._fetchOwnUserDetails).toHaveBeenCalledOnce()
  })
})
