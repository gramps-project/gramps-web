import {__APIHOST__} from './api.js'

export async function handleOIDCCallback(errorCallback) {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const provider = urlParams.get('provider')

    if (!code) {
      errorCallback('OIDC authentication failed - no authorization code')
      window.location.href = '/'
      return
    }

    const resp = await fetch(
      `${__APIHOST__}/api/oidc/callback/?code=${code}&state=${
        state || ''
      }&provider=${provider || ''}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!resp.ok) {
      throw new Error(resp.statusText || `Error ${resp.status}`)
    }

    const data = await resp.json()
    if (!data.access_token) {
      throw new Error('Access token missing in response')
    }

    const expiresAt = Date.now() + 15 * 60 * 1000
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('access_token_expires', expiresAt.toString())
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token)
    }

    setTimeout(() => {
      window.location.href = data.frontend_url || '/'
    }, 100)
  } catch (error) {
    errorCallback(`OIDC authentication failed: ${error.message}`)
    window.location.href = '/'
  }
}

export async function handleOIDCComplete(errorCallback) {
  try {
    const resp = await fetch(`${__APIHOST__}/api/oidc/tokens/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!resp.ok) {
      const errorText = await resp.text()
      throw new Error(
        `${resp.statusText}: ${errorText}` || `Error ${resp.status}`
      )
    }

    const data = await resp.json()
    if (!data.access_token) {
      throw new Error('Access token missing in response')
    }

    const expiresAt = Date.now() + 15 * 60 * 1000
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('access_token_expires', expiresAt.toString())
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token)
    }

    setTimeout(() => {
      window.location.href = '/'
    }, 100)
  } catch (error) {
    errorCallback(`OIDC authentication failed: ${error.message}`)
    window.location.href = '/'
  }
}
