
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


export async function apiGetTokens(username, password)  {
  const data = await fetch(`${__APIHOST__}/api/login/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({'username': username, 'password': password})
    })
    .then(resp => resp.json())
    .then(resp => {
      if (resp.access_token === undefined) {
        return {'error': 'Access token missing in response'}
      }
      if (resp.refresh_token === undefined) {
        return {'error': 'Refresh token missing in response'}
      }
      const expires = Date.now() + 15 * 60 * 1000;
      storeAuthToken(resp.access_token, expires)
      storeRefreshToken(resp.refresh_token)
      return {}
    })
    .catch((error) => {
      return {'error': error};
    });
    if ('error' in data) {
      return {'error': data.error}
    }
    return {}
};


export async function apiRefreshAuthToken(refreshToken)  {
  const data = await fetch(`${__APIHOST__}/api/refresh/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    .then(resp => {
      const respStatus = resp.status;
      if (respStatus === 403 || respStatus === 422) {
        doLogout()
      }
      return resp.json();
    })
    .then(resp => {
      if (resp.access_token === undefined) {
        return {'error': 'Access token missing in response'}
      }
      const expires = Date.now() + 15 * 60 * 1000;
      storeAuthToken(resp.access_token, expires)
      return {}
    })
    .catch((error) => {
      return {'error': error};
    });
    if ('error' in data) {
      return {'error': data.error}
    }
    return {}
  };



export async function apiGet(endpoint)  {
  const accessToken = localStorage.getItem('access_token');
  const resp = await fetch(`${__APIHOST__}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
  try {
    if (resp.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken === undefined) {
        doLogout()
        return {'error': 'Missing refresh token'}
      }
      const refreshResp = await apiRefreshAuthToken()
      if ('error' in refreshResp) {
        return refreshResp
      }
    }
    if (resp.status === 403 || resp.status === 422) {
        return {'error': 'Authorization error'}
    }
    if (resp.status !== 200) {
      return {'error': `Error ${resp.status}`}
    }
    return {'data': await resp.json()}
  }
  catch (error)  {
    return {'error': error.message};
  }
};

