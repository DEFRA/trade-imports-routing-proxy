import * as cheerio from 'cheerio'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { config } from '#/config/config.js'
import { describeSignIn } from './controller.js'
import {
  discoveryDocument,
  generateUnpublishedKey,
  signToken
} from '../../../../.vite/oidc-provider.js'

const idTokenClaims = {
  sessionId: 'session-1',
  contactId: 2100010101,
  firstName: 'Andrew',
  roles: ['5900001:Agent:3']
}

function bellCredentials(idToken, accessToken = idToken) {
  return {
    token: accessToken,
    profile: {
      idToken,
      expiresIn: 86400,
      scope: 'openid offline_access',
      refreshTokenReturned: true
    }
  }
}

function sessionCookieOf(response) {
  return response.headers['set-cookie']
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

function summaryRows($, testId) {
  return $(`[data-testid="${testId}"] .govuk-summary-list__row`)
    .map((_index, row) => [
      [
        $(row).find('.govuk-summary-list__key').text().trim(),
        $(row).find('.govuk-summary-list__value').text().trim()
      ]
    ])
    .get()
}

describe('#describeSignIn', () => {
  test('Should list the ID token claims and the token response metadata, and no token', () => {
    const idToken = signToken(idTokenClaims)

    expect(
      describeSignIn({
        idTokenClaims,
        idToken,
        accessToken: idToken,
        expiresIn: 86400,
        scope: 'openid offline_access',
        refreshTokenReturned: true
      })
    ).toEqual({
      idTokenClaims: [
        { key: { text: 'sessionId' }, value: { text: 'session-1' } },
        { key: { text: 'contactId' }, value: { text: '2100010101' } },
        { key: { text: 'firstName' }, value: { text: 'Andrew' } },
        { key: { text: 'roles' }, value: { text: '["5900001:Agent:3"]' } }
      ],
      accessTokenClaims: undefined,
      tokenResponse: [
        { key: { text: 'expires_in' }, value: { text: '86400' } },
        { key: { text: 'scope' }, value: { text: 'openid offline_access' } },
        { key: { text: 'refresh token returned' }, value: { text: 'Yes' } }
      ]
    })
  })

  test('Should list the access token claims when the access token is a different token', () => {
    const idToken = signToken(idTokenClaims)
    const accessToken = signToken({ scp: 'user_impersonation' })

    const { accessTokenClaims } = describeSignIn({
      idTokenClaims,
      idToken,
      accessToken,
      expiresIn: 3600,
      scope: 'openid',
      refreshTokenReturned: false
    })

    expect(accessTokenClaims).toEqual(
      expect.arrayContaining([
        { key: { text: 'scp' }, value: { text: 'user_impersonation' } }
      ])
    )
  })
})

describe('Sign-in routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET /auth/sign-in redirects to the identity provider with the client, service, policy, scope and callback', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/auth/sign-in'
    })

    const location = new URL(response.headers.location)
    expect(response.statusCode).toBe(statusCodes.found)
    expect(`${location.origin}${location.pathname}`).toBe(
      discoveryDocument.authorization_endpoint
    )
    expect(Object.fromEntries(location.searchParams)).toEqual(
      expect.objectContaining({
        client_id: config.get('defraId.clientId'),
        serviceId: config.get('defraId.serviceId'),
        p: config.get('defraId.policy'),
        response_mode: 'query',
        scope: `openid offline_access ${config.get('defraId.clientId')}`,
        redirect_uri: config.get('defraId.redirectUrl')
      })
    )
  })

  test('A completed sign-in redirects to the signed-in page, which shows its claims', async () => {
    const callback = await server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc',
      auth: {
        strategy: 'defra-id',
        credentials: bellCredentials(signToken(idTokenClaims))
      }
    })

    expect(callback.statusCode).toBe(statusCodes.found)
    expect(callback.headers.location).toBe('/auth/signed-in')

    const signedIn = await server.inject({
      method: 'GET',
      url: '/auth/signed-in',
      headers: { cookie: sessionCookieOf(callback) }
    })
    const $ = cheerio.load(signedIn.payload)

    expect(signedIn.statusCode).toBe(statusCodes.ok)
    expect(summaryRows($, 'id-token-claims')).toEqual(
      expect.arrayContaining([
        ['sessionId', 'session-1'],
        ['contactId', '2100010101'],
        ['firstName', 'Andrew']
      ])
    )
    expect(summaryRows($, 'token-response')).toEqual([
      ['expires_in', '86400'],
      ['scope', 'openid offline_access'],
      ['refresh token returned', 'Yes']
    ])
  })

  test('A token signed by an unpublished key is refused and nothing is kept', async () => {
    const callback = await server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc',
      auth: {
        strategy: 'defra-id',
        credentials: bellCredentials(
          signToken(idTokenClaims, generateUnpublishedKey())
        )
      }
    })

    const signedIn = await server.inject({
      method: 'GET',
      url: '/auth/signed-in',
      headers: { cookie: sessionCookieOf(callback) }
    })

    expect(callback.statusCode).toBe(statusCodes.unauthorized)
    expect(signedIn.headers.location).toBe('/auth/sign-in')
  })

  test('A callback with no sign-in state cookie is refused', async () => {
    const callback = await server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc?code=code-1&state=state-1&refresh=1'
    })

    expect(callback.statusCode).toBe(statusCodes.unauthorized)
  })

  test('GET /auth/signed-in with no sign-in in the session starts one', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/auth/signed-in'
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/auth/sign-in')
  })
})
