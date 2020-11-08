
export function doLougout() {
  // do logout
}

export function storeAuthToken(authToken) {
  // store token
}

export function storeRefreshToken(refreshToken) {
  // store token
}


export async function apiGetAuthToken(apihost, username, password)  {
  const data = await fetch(`${apihost}/api/login`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({'username': username, 'password': password})
    })
    .then(resp => resp.json())
    .catch((error) => {
      return {'error': error};
    });
  return {'data': data}
};


export async function apiRefreshAuthToken(apihost, refreshToken)  {
  const data = await fetch(`${apihost}/api/login`, {
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
        // logout
      }
      return resp.json();
    })
    .catch((error) => {
      return {'error': error};
    });
  return {'data': data}
  };



export async function apiGet(apihost, token, refreshToken, endpoint)  {
  const data = await fetch(`${apihost}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    .then(resp => {
      const respStatus = resp.status;
      if (respStatus === 401) {
        // refresh!
        return {};
      } if (respStatus === 403 || respStatus === 422) {
        logout()
      }
      if (respStatus !== 200) {
        return 'error'
      }
      return resp.json()
    })
    .catch((error) => {
      return {'error': error};
    });
  return {'data': data}
};

