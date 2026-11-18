import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {apiGetRegistrationEnabled} from '../../src/api.js'
import '../../src/components/GrampsjsLogin.js'
import '../../src/components/GrampsjsFormRegister.js'

vi.mock('../../src/api.js', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    apiGetOIDCConfig: vi.fn().mockResolvedValue({}),
    apiGetRegistrationEnabled: vi.fn(),
  }
})

const appState = {i18n: {lang: 'en', strings: {}}}
const mounted = []

async function mount(tag, props = {}) {
  const el = document.createElement(tag)
  Object.assign(el, {appState, ...props})
  el.navs = []
  el.addEventListener('nav', e => el.navs.push(e.detail))
  document.body.appendChild(el)
  mounted.push(el)
  await settle(el)
  return el
}

async function settle(el) {
  await new Promise(resolve => {
    setTimeout(resolve)
  })
  await el.updateComplete
}

// resolves the next registration check only when `resolve` is called
function deferRegistration() {
  let resolveCheck
  apiGetRegistrationEnabled.mockReturnValueOnce(
    new Promise(resolve => {
      resolveCheck = resolve
    })
  )
  return value => resolveCheck(value)
}

const registerButton = el =>
  el.shadowRoot.querySelector('md-filled-tonal-button')

beforeEach(() => {
  window.grampsjsConfig = {}
  apiGetRegistrationEnabled.mockReset()
})

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

describe('register button on the login page', () => {
  it('is shown when registration is enabled', async () => {
    apiGetRegistrationEnabled.mockResolvedValue(true)
    const el = await mount('grampsjs-login')
    expect(registerButton(el)).not.toBeNull()
  })

  it('is hidden when registration is disabled', async () => {
    apiGetRegistrationEnabled.mockResolvedValue(false)
    const el = await mount('grampsjs-login')
    expect(registerButton(el)).toBeNull()
  })

  it('is shown when the server does not say', async () => {
    apiGetRegistrationEnabled.mockResolvedValue(null)
    const el = await mount('grampsjs-login')
    expect(registerButton(el)).not.toBeNull()
  })

  it('is hidden by hideRegisterLink even when registration is enabled', async () => {
    window.grampsjsConfig = {hideRegisterLink: true}
    apiGetRegistrationEnabled.mockResolvedValue(true)
    const el = await mount('grampsjs-login')
    expect(registerButton(el)).toBeNull()
  })

  it('is hidden while loading', async () => {
    const resolve = deferRegistration()
    const el = await mount('grampsjs-login')
    expect(registerButton(el)).toBeNull()
    resolve(true)
    await settle(el)
    expect(registerButton(el)).not.toBeNull()
  })

  it('asks about the tree from the login link', async () => {
    apiGetRegistrationEnabled.mockResolvedValue(true)
    await mount('grampsjs-login', {tree: 'tree-a'})
    expect(apiGetRegistrationEnabled).toHaveBeenCalledWith('tree-a')
  })

  it('ignores the answer for a tree the page has left', async () => {
    const resolveA = deferRegistration()
    const el = await mount('grampsjs-login', {tree: 'tree-a'})
    apiGetRegistrationEnabled.mockResolvedValue(false)
    el.tree = 'tree-b'
    await settle(el)
    resolveA(true)
    await settle(el)
    expect(registerButton(el)).toBeNull()
  })
})

describe('register page', () => {
  const form = el => el.shadowRoot.getElementById('register-form')

  it('shows the form when registration is enabled', async () => {
    apiGetRegistrationEnabled.mockResolvedValue(true)
    const el = await mount('grampsjs-form-register')
    expect(form(el)).not.toBeNull()
    expect(el.navs).toEqual([])
  })

  it('shows the form when the server does not say', async () => {
    apiGetRegistrationEnabled.mockResolvedValue(null)
    const el = await mount('grampsjs-form-register')
    expect(form(el)).not.toBeNull()
    expect(el.navs).toEqual([])
  })

  it('replaces itself with the login page when registration is disabled', async () => {
    apiGetRegistrationEnabled.mockResolvedValue(false)
    const el = await mount('grampsjs-form-register')
    expect(form(el)).toBeNull()
    expect(el.navs).toEqual([{path: 'login', replace: true}])
  })

  it('keeps the tree when replacing itself with the login page', async () => {
    apiGetRegistrationEnabled.mockResolvedValue(false)
    const el = await mount('grampsjs-form-register', {tree: 'tree-a'})
    expect(apiGetRegistrationEnabled).toHaveBeenCalledWith('tree-a')
    expect(el.navs).toEqual([{path: 'login/tree-a', replace: true}])
  })

  it('shows nothing while loading', async () => {
    const resolve = deferRegistration()
    const el = await mount('grampsjs-form-register')
    expect(form(el)).toBeNull()
    resolve(true)
    await settle(el)
    expect(form(el)).not.toBeNull()
  })

  it('does not navigate once it has been left', async () => {
    const resolve = deferRegistration()
    const el = await mount('grampsjs-form-register')
    el.remove()
    resolve(false)
    await settle(el)
    expect(el.navs).toEqual([])
  })
})
