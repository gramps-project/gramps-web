
const __APIHOST__ = "http://localhost:5555"



export function doLougout() {
  // do logout
}

export function storeAuthToken(authToken) {
  // store token
}

export function storeRefreshToken(refreshToken) {
  // store token
}


export async function apiGetAuthToken(username, password)  {
  const data = await fetch(`${__APIHOST__}/api/login`, {
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


export async function apiRefreshAuthToken(refreshToken)  {
  const data = await fetch(`${__APIHOST__}/api/login`, {
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



export async function apiGet(endpoint)  {
  // const accessToken = localStorage.getItem('access_token');
  const accessToken = 1
  const data = await fetch(`${__APIHOST__}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
    .then(resp => {
      const respStatus = resp.status;
      if (respStatus === 401) {
        // const refreshToken = localStorage.getItem('refresh_token');
        // refresh!
        return {};
      } if (respStatus === 403 || respStatus === 422) {
        // logout()
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

