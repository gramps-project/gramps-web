import fetchMock from 'fetch-mock/esm/client'
import { expect } from '@open-wc/testing';

import { apiGetAuthToken, apiGet } from '../src/api.js'


describe('API', () => {
  beforeEach(() => {
    fetchMock.get('http://myapi:1234/api/my-endpoint', {hello: 'world'})
    fetchMock.post('http://myapi:1234/api/login', {token: 'world'})
  })

  afterEach(() => {
    fetchMock.restore()
  })

  describe('Test API GET', () => {
    it('API get dummy test', async () => {
      const data = await apiGet('http://myapi:1234', null, null, '/api/my-endpoint')
      expect(fetchMock.called()).to.be.true
      expect(data).to.eql({hello: 'world'})
    })
  })

    describe('Test get token', () => {
      it('Token dummy test', async () => {
        const data = await apiGetAuthToken('http://myapi:1234', 'user', 'password')
        expect(fetchMock.called()).to.be.true
        expect(data).to.eql({token: 'world'})
      })
    })
})
