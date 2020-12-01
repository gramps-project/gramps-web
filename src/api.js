
const __APIHOST__ = "http://localhost:5555"



export function doLogout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('access_token_expires');
  localStorage.removeItem('refresh_token');
  window.dispatchEvent(new CustomEvent("user:loggedout", {bubbles: true, composed: true}))
}

export function storeAuthToken(authToken, expires) {
  localStorage.setItem('access_token', authToken);
  localStorage.setItem('access_token_expires', expires);
}

export function storeRefreshToken(refreshToken) {
  localStorage.setItem('refresh_token', refreshToken);
}


export async function apiResetPassword(username)  {
  try {
    const resp = await fetch(`${__APIHOST__}/api/user/password/reset/trigger/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({'username': username})
    })
    if (resp.status === 404) {
      throw(new Error('User not found.'))
    }
    if (resp.status === 500) {
      throw(new Error('The server encountered an error while trying to send the e-mail.'))
    }
    if (resp.status !== 201) {
      throw(new Error(`Error ${resp.status}`))
    }
    return {}
  }
  catch (error)  {
    return {'error': error.message};
  }
};


export async function apiGetTokens(username, password)  {
  try {
    const resp = await fetch(`${__APIHOST__}/api/login/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({'username': username, 'password': password})
    })
    if (resp.status === 401 || resp.status === 403) {
      throw(new Error('Wrong username or password'))
    }
    if (resp.status !== 200) {
      throw(new Error(`Error ${resp.status}`))
    }
    const data = await resp.json()
    if (data.access_token === undefined) {
      return {'error': 'Access token missing in response'}
    }
    if (data.refresh_token === undefined) {
      return {'error': 'Refresh token missing in response'}
    }
    const expires = Date.now() + 15 * 60 * 1000;
    storeAuthToken(data.access_token, expires)
    storeRefreshToken(data.refresh_token)
    return {}
  }
  catch (error)  {
    return {'error': error.message};
  }
};



export async function apiRefreshAuthToken(refreshToken)  {
  try {
    const resp = await fetch(`${__APIHOST__}/api/refresh/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    if (resp.status === 403 || resp.status === 422) {
      doLogout()
      throw(new Error('Failed refreshing token'))
    }
    const data = await resp.json()
    if (data.access_token === undefined) {
      throw(new Error('Access token missing in response'))
    }
    const expires = Date.now() + 15 * 60 * 1000;
    storeAuthToken(resp.access_token, expires)
    return {}
  }
  catch (error) {
    return {'error': error.message};
  }
};



export async function apiGet(endpoint)  {
  const accessToken = localStorage.getItem('access_token');
  let headers = {}
  if (accessToken !== null) {
    headers = {
      'Authorization': `Bearer ${accessToken}`
    }
  }
  try {
    const resp = await fetch(`${__APIHOST__}${endpoint}`, {
      method: 'GET',
      headers
    })
    if (resp.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken === null) {
        throw(new Error('Missing refresh token'))
      }
      const refreshResp = await apiRefreshAuthToken()
      if ('error' in refreshResp) {
        throw(new Error(refreshResp.error))
      }
    }
    if (resp.status === 403) {
      throw(new Error('Authorization error'))
    }
    if (resp.status !== 200) {
      throw(new Error(`Error ${resp.status}`))
    }
    return {'data': await resp.json()}
  }
  catch (error)  {
    return {'error': error.message};
  }
};

