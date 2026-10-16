import {__APIHOST__, ACCESS_TOKEN_EXPIRY_MS} from './api.js'

function storeTokens(data) {
  const expiresAt = Date.now() + ACCESS_TOKEN_EXPIRY_MS
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('access_token_expires', expiresAt.toString())
  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token)
  }
  if (data.id_token) {
    localStorage.setItem('id_token', data.id_token)
  }
}

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

    storeTokens(data)

    requestAnimationFrame(() => {
      window.location.href = data.frontend_url || '/'
    })
  } catch (error) {
    errorCallback(`OIDC authentication failed: ${error.message}`)
    window.location.href = '/'
  }
}

// Where linking an identity reports its result for the settings page, which
// the browser returns to; see GrampsjsOidcAccounts.
export const OIDC_LINK_RESULT_KEY = 'oidc_link_result'

// A link started in Settings comes back with `link_code` or `error` instead of
// a login code. Only the user who started it can complete it, with their token.
export async function completeLink(appState, linkCode, error) {
  let result = {error: error || 'link_failed'}
  if (linkCode) {
    const res = await appState.apiPost(
      '/api/oidc/link/complete/',
      {code: linkCode},
      {dbChanged: false, saving: false}
    )
    result = 'error' in res ? {error: res.error} : {linked: res.data.provider}
  }
  try {
    sessionStorage.setItem(OIDC_LINK_RESULT_KEY, JSON.stringify(result))
  } catch {
    // the settings page then just shows the current state
  }
  window.location.href = '/settings/user'
}

// The code is single use, so the exchange must not run twice.
let oidcCompleteStarted = false

export async function handleOIDCComplete(errorCallback, appState) {
  if (oidcCompleteStarted) {
    return
  }
  oidcCompleteStarted = true
  try {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const code = params.get('code')

    // Remove the fragment from the address bar before anything can read the
    // code back out of it.
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }

    if (params.has('link_code') || params.has('error')) {
      await completeLink(appState, params.get('link_code'), params.get('error'))
      return
    }

    const resp = code
      ? await fetch(`${__APIHOST__}/api/oidc/tokens/`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({code}),
        })
      : // Older API versions return the tokens from cookies, which this GET clears.
        await fetch(`${__APIHOST__}/api/oidc/tokens/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        })

    if (!resp.ok) {
      const errorText = await resp.text()
      throw new Error(
        errorText ? `${resp.statusText}: ${errorText}` : `Error ${resp.status}`
      )
    }

    const data = await resp.json()
    if (!data.access_token) {
      throw new Error('Access token missing in response')
    }

    storeTokens(data)

    requestAnimationFrame(() => {
      window.location.href = '/'
    })
  } catch (error) {
    errorCallback(`OIDC authentication failed: ${error.message}`)
    window.location.href = '/'
  }
}
